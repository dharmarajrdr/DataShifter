package com.datashifter.ai.services;

import com.datashifter.ai.services.AiKeyManagementService.ResolvedLlmCandidate;
import com.datashifter.common.enums.AiKeyScope;
import com.datashifter.common.enums.AiProviderType;
import com.datashifter.common.models.AiApiKey;
import com.datashifter.common.repositories.AiApiKeyRepository;
import com.datashifter.common.utils.EncryptionUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiKeyManagementServiceTest {

    @Mock
    private AiApiKeyRepository apiKeyRepository;

    private AiKeyManagementService service;

    @BeforeEach
    void setUp() {
        service = new AiKeyManagementService(apiKeyRepository, List.of());
        ReflectionTestUtils.setField(service, "agentName", "Beetel");
        ReflectionTestUtils.setField(service, "systemGroqApiKeysRaw", "gsk_sys_key_1,gsk_sys_key_2,gsk_sys_key_3");
        ReflectionTestUtils.setField(service, "defaultGroqBaseUrl", "https://api.groq.com/openai");
        ReflectionTestUtils.setField(service, "defaultGroqModel", "llama-3.3-70b-versatile");
        ReflectionTestUtils.setField(service, "cooldownSeconds", 120L);
        ReflectionTestUtils.setField(service, "ollamaEnabled", true);
        ReflectionTestUtils.setField(service, "defaultOllamaBaseUrl", "http://localhost:11434");
        ReflectionTestUtils.setField(service, "defaultOllamaModel", "llama3.1");
    }

    @Test
    void resolveCandidatePool_usesUserKeysFirstAndBypassesOrgAndSystemKeys() {
        AiApiKey userKey1 = AiApiKey.builder()
                .scope(AiKeyScope.USER)
                .userId("user-1")
                .orgId("org-1")
                .provider(AiProviderType.GROQ)
                .label("User Key 1")
                .encryptedApiKey(EncryptionUtil.encrypt("gsk_user_1"))
                .priorityOrder(0)
                .isActive(true)
                .build();
        userKey1.setId("uk-1");

        when(apiKeyRepository.findByScopeAndUserIdAndIsActiveTrueOrderByPriorityOrderAscCreatedAtAsc(AiKeyScope.USER, "user-1"))
                .thenReturn(List.of(userKey1));
        when(apiKeyRepository.findByScopeAndOrgIdAndIsActiveTrueOrderByPriorityOrderAscCreatedAtAsc(AiKeyScope.ORG, "org-1"))
                .thenReturn(List.of());

        List<ResolvedLlmCandidate> pool = service.resolveCandidatePool("user-1", "org-1", null);

        assertEquals(1, pool.size());
        assertEquals(AiKeyScope.USER, pool.get(0).scope());
        assertEquals("gsk_user_1", pool.get(0).apiKey());
    }

    @Test
    void resolveCandidatePool_usesOrgKeysWhenNoUserKeysAndBypassesSystemKeys() {
        when(apiKeyRepository.findByScopeAndUserIdAndIsActiveTrueOrderByPriorityOrderAscCreatedAtAsc(AiKeyScope.USER, "user-1"))
                .thenReturn(List.of());

        AiApiKey orgKey = AiApiKey.builder()
                .scope(AiKeyScope.ORG)
                .orgId("org-1")
                .provider(AiProviderType.GROQ)
                .label("Org Shared Key")
                .encryptedApiKey(EncryptionUtil.encrypt("gsk_org_1"))
                .priorityOrder(0)
                .isActive(true)
                .build();
        orgKey.setId("ok-1");

        when(apiKeyRepository.findByScopeAndOrgIdAndIsActiveTrueOrderByPriorityOrderAscCreatedAtAsc(AiKeyScope.ORG, "org-1"))
                .thenReturn(List.of(orgKey));

        List<ResolvedLlmCandidate> pool = service.resolveCandidatePool("user-1", "org-1", null);

        assertEquals(1, pool.size());
        assertEquals(AiKeyScope.ORG, pool.get(0).scope());
        assertEquals("gsk_org_1", pool.get(0).apiKey());
    }

    @Test
    void resolveCandidatePool_rotatesSystemKeysWhenFirstSystemKeyFails() {
        when(apiKeyRepository.findByScopeAndUserIdAndIsActiveTrueOrderByPriorityOrderAscCreatedAtAsc(AiKeyScope.USER, "user-1"))
                .thenReturn(List.of());
        when(apiKeyRepository.findByScopeAndOrgIdAndIsActiveTrueOrderByPriorityOrderAscCreatedAtAsc(AiKeyScope.ORG, "org-1"))
                .thenReturn(List.of());

        List<ResolvedLlmCandidate> initialPool = service.resolveCandidatePool("user-1", "org-1", null);
        assertEquals("gsk_sys_key_1", initialPool.get(0).apiKey());

        // Simulate failure on key #1
        service.recordKeyFailure(initialPool.get(0), "429 Too Many Requests: rate_limit_exceeded");

        List<ResolvedLlmCandidate> rotatedPool = service.resolveCandidatePool("user-1", "org-1", null);
        assertEquals("gsk_sys_key_2", rotatedPool.get(0).apiKey());
    }

    @Test
    void recordKeyFailure_marksDbKeyOnCooldownAndUpdatesStatus() {
        AiApiKey userKey = AiApiKey.builder()
                .scope(AiKeyScope.USER)
                .userId("user-1")
                .orgId("org-1")
                .provider(AiProviderType.GROQ)
                .label("User Key 1")
                .encryptedApiKey(EncryptionUtil.encrypt("gsk_user_1"))
                .status("ACTIVE")
                .failureCount(0)
                .isActive(true)
                .build();
        userKey.setId("uk-1");

        when(apiKeyRepository.findById("uk-1")).thenReturn(Optional.of(userKey));

        ResolvedLlmCandidate candidate = new ResolvedLlmCandidate(
                "uk-1", AiKeyScope.USER, AiProviderType.GROQ, "User Key 1", "gsk_user_1",
                "https://api.groq.com/openai", "llama-3.3-70b-versatile", null);

        service.recordKeyFailure(candidate, "401 Unauthorized: invalid_api_key");

        assertEquals("EXPIRED", userKey.getStatus());
        assertEquals(1, userKey.getFailureCount());
        assertNotNull(userKey.getCooldownUntil());
        verify(apiKeyRepository).save(userKey);
    }
}
