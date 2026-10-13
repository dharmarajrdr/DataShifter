package com.datashifter.ai.services;

import com.datashifter.ai.spi.BeetelCapability;
import com.datashifter.common.dtos.AiDtos.*;
import com.datashifter.common.enums.AiKeyScope;
import com.datashifter.common.enums.AiProviderType;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.exceptions.ResourceNotFoundException;
import com.datashifter.common.models.AiApiKey;
import com.datashifter.common.repositories.AiApiKeyRepository;
import com.datashifter.common.security.UserContext;
import com.datashifter.common.utils.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.HttpURLConnection;
import java.net.URI;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiKeyManagementService {

    private final AiApiKeyRepository apiKeyRepository;
    private final List<BeetelCapability> capabilities;

    @Value("${datashifter.ai.agent-name:Beetel}")
    private String agentName;

    @Value("${datashifter.ai.groq.api-keys:}")
    private String systemGroqApiKeysRaw;

    @Value("${datashifter.ai.groq.base-url:https://api.groq.com/openai}")
    private String defaultGroqBaseUrl;

    @Value("${datashifter.ai.groq.default-model:openai/gpt-oss-120b}")
    private String defaultGroqModel;

    @Value("${datashifter.ai.groq.cooldown-seconds:120}")
    private long cooldownSeconds;

    @Value("${datashifter.ai.ollama.enabled:true}")
    private boolean ollamaEnabled;

    @Value("${datashifter.ai.ollama.base-url:http://localhost:11434}")
    private String defaultOllamaBaseUrl;

    @Value("${datashifter.ai.ollama.default-model:gemma4:12b}")
    private String defaultOllamaModel;

    // Tracks system env key health and current rotation index in memory
    private final Map<Integer, Instant> systemKeyCooldowns = new ConcurrentHashMap<>();
    private final Map<Integer, String> systemKeyLastErrors = new ConcurrentHashMap<>();
    private final AtomicInteger currentSystemKeyIndex = new AtomicInteger(0);

    public record ResolvedLlmCandidate(
            String keyId, // DB ID or "SYSTEM-0", "SYSTEM-1", "SYSTEM-OLLAMA"
            AiKeyScope scope,
            AiProviderType provider,
            String label,
            String apiKey,
            String baseUrl,
            String modelName,
            Integer systemIndex
    ) {}

    @Transactional(readOnly = true)
    public AiKeyPoolStatusResponse getPoolStatus() {
        String userId = UserContext.getCurrentUserId();
        String orgId = UserContext.getCurrentOrgId();

        List<AiApiKey> userEntities = apiKeyRepository.findByScopeAndUserIdOrderByPriorityOrderAscCreatedAtAsc(AiKeyScope.USER, userId);
        List<AiApiKey> orgEntities = apiKeyRepository.findByScopeAndOrgIdOrderByPriorityOrderAscCreatedAtAsc(AiKeyScope.ORG, orgId);

        long activeUserCount = userEntities.stream().filter(k -> Boolean.TRUE.equals(k.getIsActive())).count();
        long activeOrgCount = orgEntities.stream().filter(k -> Boolean.TRUE.equals(k.getIsActive())).count();
        List<String> sysKeys = parseSystemGroqKeys();

        AiKeyScope activeScope;
        if (activeUserCount > 0) {
            activeScope = AiKeyScope.USER;
        } else if (activeOrgCount > 0) {
            activeScope = AiKeyScope.ORG;
        } else {
            activeScope = AiKeyScope.SYSTEM;
        }

        return AiKeyPoolStatusResponse.builder()
                .agentName(agentName)
                .activeScope(activeScope)
                .userKeyCount((int) activeUserCount)
                .orgKeyCount((int) activeOrgCount)
                .systemKeyCount(sysKeys.size())
                .ollamaAvailable(isOllamaReachable(defaultOllamaBaseUrl))
                .defaultGroqModel(defaultGroqModel)
                .defaultOllamaModel(defaultOllamaModel)
                .userKeys(userEntities.stream().map(this::toResponse).toList())
                .orgKeys(orgEntities.stream().map(this::toResponse).toList())
                .registeredCapabilities(capabilities.stream()
                        .filter(BeetelCapability::isEnabled)
                        .map(BeetelCapability::getDisplayName)
                        .toList())
                .build();
    }

    @Transactional
    public AiApiKeyResponse createKey(CreateAiApiKeyRequest request) {
        String userId = UserContext.getCurrentUserId();
        String orgId = UserContext.getCurrentOrgId();

        AiKeyScope scope = request.getScope() != null ? request.getScope() : AiKeyScope.USER;
        if (scope == AiKeyScope.SYSTEM) {
            throw new DatashifterException("Cannot create SYSTEM-scoped keys via API.");
        }

        AiProviderType provider = request.getProvider() != null ? request.getProvider() : AiProviderType.GROQ;
        String label = request.getLabel() != null && !request.getLabel().isBlank()
                ? request.getLabel().trim()
                : provider.name() + " Key";

        String rawKey = request.getApiKey() != null ? request.getApiKey().trim() : "";
        if (provider == AiProviderType.GROQ && rawKey.isBlank()) {
            throw new DatashifterException("API key is required for Groq provider.");
        }

        String encrypted = rawKey.isBlank() ? null : EncryptionUtil.encrypt(rawKey);
        String masked = maskApiKey(rawKey);

        String baseUrl = request.getBaseUrl() != null && !request.getBaseUrl().isBlank()
                ? request.getBaseUrl().trim()
                : (provider == AiProviderType.OLLAMA ? defaultOllamaBaseUrl : defaultGroqBaseUrl);

        String modelName = request.getModelName() != null && !request.getModelName().isBlank()
                ? request.getModelName().trim()
                : (provider == AiProviderType.OLLAMA ? defaultOllamaModel : defaultGroqModel);

        int nextPriority = request.getPriorityOrder() != null ? request.getPriorityOrder() : 0;

        AiApiKey entity = AiApiKey.builder()
                .scope(scope)
                .userId(scope == AiKeyScope.USER ? userId : null)
                .orgId(orgId)
                .provider(provider)
                .label(label)
                .encryptedApiKey(encrypted)
                .maskedKey(masked)
                .baseUrl(baseUrl)
                .modelName(modelName)
                .priorityOrder(nextPriority)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .status("ACTIVE")
                .failureCount(0)
                .build();

        entity = apiKeyRepository.save(entity);
        log.info("Created {} AI API key '{}' ({}) for org {}", scope, label, provider, orgId);
        return toResponse(entity);
    }

    @Transactional
    public AiApiKeyResponse updateKey(String id, UpdateAiApiKeyRequest request) {
        AiApiKey entity = findAuthorizedKey(id);

        if (request.getLabel() != null && !request.getLabel().isBlank()) {
            entity.setLabel(request.getLabel().trim());
        }
        if (request.getApiKey() != null && !request.getApiKey().isBlank()) {
            String trimmed = request.getApiKey().trim();
            entity.setEncryptedApiKey(EncryptionUtil.encrypt(trimmed));
            entity.setMaskedKey(maskApiKey(trimmed));
            entity.setStatus("ACTIVE");
            entity.setFailureCount(0);
            entity.setLastError(null);
            entity.setCooldownUntil(null);
        }
        if (request.getBaseUrl() != null && !request.getBaseUrl().isBlank()) {
            entity.setBaseUrl(request.getBaseUrl().trim());
        }
        if (request.getModelName() != null && !request.getModelName().isBlank()) {
            entity.setModelName(request.getModelName().trim());
        }
        if (request.getPriorityOrder() != null) {
            entity.setPriorityOrder(request.getPriorityOrder());
        }
        if (request.getIsActive() != null) {
            entity.setIsActive(request.getIsActive());
            if (Boolean.TRUE.equals(request.getIsActive())) {
                entity.setStatus("ACTIVE");
                entity.setCooldownUntil(null);
            }
        }

        entity = apiKeyRepository.save(entity);
        return toResponse(entity);
    }

    @Transactional
    public void deleteKey(String id) {
        AiApiKey entity = findAuthorizedKey(id);
        apiKeyRepository.delete(entity);
    }

    @Transactional
    public AiApiKeyResponse resetKeyHealth(String id) {
        AiApiKey entity = findAuthorizedKey(id);
        entity.setStatus("ACTIVE");
        entity.setFailureCount(0);
        entity.setLastError(null);
        entity.setCooldownUntil(null);
        return toResponse(apiKeyRepository.save(entity));
    }

    /**
     * Resolves the ordered list of LLM candidates to try for the current request.
     * Hierarchy:
     *   1. USER keys (highest priority)
     *   2. ORG keys (used after USER keys or when no USER keys exist; bypasses SYSTEM keys)
     *   3. SYSTEM keys (.env GROQ_API_KEYS + local Ollama fallback)
     */
    @Transactional(readOnly = true)
    public List<ResolvedLlmCandidate> resolveCandidatePool(String userId, String orgId, AiProviderType preferredProvider) {
        List<AiApiKey> userKeys = userId != null
                ? apiKeyRepository.findByScopeAndUserIdAndIsActiveTrueOrderByPriorityOrderAscCreatedAtAsc(AiKeyScope.USER, userId)
                : List.of();

        List<AiApiKey> orgKeys = orgId != null
                ? apiKeyRepository.findByScopeAndOrgIdAndIsActiveTrueOrderByPriorityOrderAscCreatedAtAsc(AiKeyScope.ORG, orgId)
                : List.of();

        if (!userKeys.isEmpty() || !orgKeys.isEmpty()) {
            List<ResolvedLlmCandidate> pool = new ArrayList<>();
            if (!userKeys.isEmpty()) {
                pool.addAll(orderDbCandidates(userKeys, preferredProvider));
            }
            if (!orgKeys.isEmpty()) {
                pool.addAll(orderDbCandidates(orgKeys, preferredProvider));
            }
            return pool;
        }

        // Fallback to System .env keys + Ollama
        return buildSystemCandidatePool(preferredProvider);
    }

    private List<ResolvedLlmCandidate> orderDbCandidates(List<AiApiKey> keys, AiProviderType preferredProvider) {
        Instant now = Instant.now();
        List<AiApiKey> ready = new ArrayList<>();
        List<AiApiKey> coolingDown = new ArrayList<>();

        for (AiApiKey key : keys) {
            if (key.getCooldownUntil() == null || key.getCooldownUntil().isBefore(now)) {
                ready.add(key);
            } else {
                coolingDown.add(key);
            }
        }
        // Sort cooling-down keys by earliest expiry as last-resort fallback within the user/org pool
        coolingDown.sort(Comparator.comparing(AiApiKey::getCooldownUntil));

        List<AiApiKey> combined = new ArrayList<>(ready);
        combined.addAll(coolingDown);

        if (preferredProvider != null) {
            combined.sort(Comparator.comparing(k -> k.getProvider() == preferredProvider ? 0 : 1));
        }

        List<ResolvedLlmCandidate> result = new ArrayList<>();
        for (AiApiKey k : combined) {
            String decrypted = k.getEncryptedApiKey() != null && !k.getEncryptedApiKey().isBlank()
                    ? EncryptionUtil.decrypt(k.getEncryptedApiKey())
                    : "";
            result.add(new ResolvedLlmCandidate(
                    k.getId(),
                    k.getScope(),
                    k.getProvider(),
                    k.getLabel(),
                    decrypted,
                    k.getBaseUrl() != null && !k.getBaseUrl().isBlank()
                            ? k.getBaseUrl()
                            : (k.getProvider() == AiProviderType.OLLAMA ? defaultOllamaBaseUrl : defaultGroqBaseUrl),
                    k.getModelName() != null && !k.getModelName().isBlank()
                            ? k.getModelName()
                            : (k.getProvider() == AiProviderType.OLLAMA ? defaultOllamaModel : defaultGroqModel),
                    null
            ));
        }
        return result;
    }

    private List<ResolvedLlmCandidate> buildSystemCandidatePool(AiProviderType preferredProvider) {
        List<String> sysKeys = parseSystemGroqKeys();
        List<ResolvedLlmCandidate> groqCandidates = new ArrayList<>();
        Instant now = Instant.now();

        if (!sysKeys.isEmpty()) {
            int n = sysKeys.size();
            int startIdx = Math.floorMod(currentSystemKeyIndex.get(), n);
            List<ResolvedLlmCandidate> cooling = new ArrayList<>();

            for (int offset = 0; offset < n; offset++) {
                int idx = (startIdx + offset) % n;
                String rawKey = sysKeys.get(idx);
                Instant cooldown = systemKeyCooldowns.get(idx);
                ResolvedLlmCandidate candidate = new ResolvedLlmCandidate(
                        "SYSTEM-GROQ-" + (idx + 1),
                        AiKeyScope.SYSTEM,
                        AiProviderType.GROQ,
                        "System Groq Key #" + (idx + 1),
                        rawKey,
                        defaultGroqBaseUrl,
                        defaultGroqModel,
                        idx
                );
                if (cooldown == null || cooldown.isBefore(now)) {
                    groqCandidates.add(candidate);
                } else {
                    cooling.add(candidate);
                }
            }
            groqCandidates.addAll(cooling);
        }

        List<ResolvedLlmCandidate> ollamaCandidates = new ArrayList<>();
        if (ollamaEnabled) {
            ollamaCandidates.add(new ResolvedLlmCandidate(
                    "SYSTEM-OLLAMA",
                    AiKeyScope.SYSTEM,
                    AiProviderType.OLLAMA,
                    "Local Ollama (" + defaultOllamaModel + ")",
                    "ollama",
                    defaultOllamaBaseUrl,
                    defaultOllamaModel,
                    null
            ));
        }

        List<ResolvedLlmCandidate> combined = new ArrayList<>();
        if (preferredProvider == AiProviderType.OLLAMA) {
            combined.addAll(ollamaCandidates);
            combined.addAll(groqCandidates);
        } else {
            combined.addAll(groqCandidates);
            combined.addAll(ollamaCandidates);
        }
        return combined;
    }

    @Transactional
    public void recordKeySuccess(ResolvedLlmCandidate candidate) {
        if (candidate.scope() == AiKeyScope.SYSTEM) {
            if (candidate.systemIndex() != null) {
                systemKeyCooldowns.remove(candidate.systemIndex());
                systemKeyLastErrors.remove(candidate.systemIndex());
                currentSystemKeyIndex.set(candidate.systemIndex());
            }
            return;
        }
        apiKeyRepository.findById(candidate.keyId()).ifPresent(k -> {
            k.setStatus("ACTIVE");
            k.setLastUsedAt(Instant.now());
            k.setCooldownUntil(null);
            apiKeyRepository.save(k);
        });
    }

    @Transactional
    public void recordKeyFailure(ResolvedLlmCandidate candidate, String errorMessage) {
        Instant now = Instant.now();
        Instant cooldownUntil = now.plusSeconds(cooldownSeconds);
        String status = classifyFailureStatus(errorMessage);

        if (candidate.scope() == AiKeyScope.SYSTEM) {
            if (candidate.systemIndex() != null) {
                systemKeyCooldowns.put(candidate.systemIndex(), cooldownUntil);
                systemKeyLastErrors.put(candidate.systemIndex(), errorMessage);
                // Advance active system key pointer to the next key immediately
                currentSystemKeyIndex.set(candidate.systemIndex() + 1);
                log.warn("System Groq key #{} failed ({}). Switching to next system key in pool.",
                        candidate.systemIndex() + 1, status);
            }
            return;
        }

        apiKeyRepository.findById(candidate.keyId()).ifPresent(k -> {
            k.setFailureCount((k.getFailureCount() != null ? k.getFailureCount() : 0) + 1);
            k.setLastFailedAt(now);
            k.setLastError(errorMessage != null && errorMessage.length() > 500
                    ? errorMessage.substring(0, 500)
                    : errorMessage);
            k.setStatus(status);
            k.setCooldownUntil(cooldownUntil);
            apiKeyRepository.save(k);
            log.warn("{} AI key '{}' ({}) failed with status {}. Switching to next key in pool.",
                    k.getScope(), k.getLabel(), k.getId(), status);
        });
    }

    public List<String> parseSystemGroqKeys() {
        if (systemGroqApiKeysRaw == null || systemGroqApiKeysRaw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(systemGroqApiKeysRaw.split("[,;\\s]+"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    public Optional<ResolvedLlmCandidate> getLocalOllamaFallbackCandidate() {
        if (!ollamaEnabled) {
            return Optional.empty();
        }
        String effectiveUrl = resolveEffectiveOllamaBaseUrl(defaultOllamaBaseUrl);
        if (!isOllamaReachable(effectiveUrl)) {
            return Optional.empty();
        }
        return Optional.of(new ResolvedLlmCandidate(
                "SYSTEM-OLLAMA",
                AiKeyScope.SYSTEM,
                AiProviderType.OLLAMA,
                "Local Ollama (" + defaultOllamaModel + ")",
                "ollama",
                effectiveUrl,
                defaultOllamaModel,
                null
        ));
    }

    public String resolveEffectiveOllamaBaseUrl(String rawUrl) {
        String candidateUrl = (rawUrl != null && !rawUrl.isBlank()) ? rawUrl.trim() : defaultOllamaBaseUrl;
        if (candidateUrl.endsWith("/")) {
            candidateUrl = candidateUrl.substring(0, candidateUrl.length() - 1);
        }
        if ( checkOllamaEndpoint(candidateUrl)) {
            return candidateUrl;
        }
        // When running inside Docker on macOS/Windows, localhost:11434 in UI maps to host.docker.internal:11434
        if (candidateUrl.contains("localhost") || candidateUrl.contains("127.0.0.1")) {
            String dockerHostUrl = candidateUrl
                    .replace("localhost", "host.docker.internal")
                    .replace("127.0.0.1", "host.docker.internal");
            if (checkOllamaEndpoint(dockerHostUrl)) {
                return dockerHostUrl;
            }
        }
        if (!candidateUrl.equals(defaultOllamaBaseUrl) && checkOllamaEndpoint(defaultOllamaBaseUrl)) {
            return defaultOllamaBaseUrl;
        }
        return candidateUrl;
    }

    public boolean isOllamaReachable(String baseUrl) {
        if (!ollamaEnabled) return false;
        String target = (baseUrl != null && !baseUrl.isBlank()) ? baseUrl.trim() : defaultOllamaBaseUrl;
        if (checkOllamaEndpoint(target)) {
            return true;
        }
        if (target.contains("localhost") || target.contains("127.0.0.1")) {
            String dockerHostUrl = target
                    .replace("localhost", "host.docker.internal")
                    .replace("127.0.0.1", "host.docker.internal");
            return checkOllamaEndpoint(dockerHostUrl);
        }
        return false;
    }

    private boolean checkOllamaEndpoint(String baseUrl) {
        try {
            URI uri = URI.create(baseUrl + "/api/tags");
            HttpURLConnection conn = (HttpURLConnection) uri.toURL().openConnection();
            conn.setConnectTimeout(800);
            conn.setReadTimeout(800);
            conn.setRequestMethod("GET");
            int code = conn.getResponseCode();
            return code >= 200 && code < 400;
        } catch (Exception e) {
            return false;
        }
    }

    private AiApiKey findAuthorizedKey(String id) {
        AiApiKey entity = apiKeyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AiApiKey", id));
        String userId = UserContext.getCurrentUserId();
        String orgId = UserContext.getCurrentOrgId();

        if (entity.getScope() == AiKeyScope.USER && !Objects.equals(entity.getUserId(), userId)) {
            throw new DatashifterException("Access denied to this user API key");
        }
        if (!Objects.equals(entity.getOrgId(), orgId)) {
            throw new DatashifterException("Access denied to this organization API key");
        }
        return entity;
    }

    private String classifyFailureStatus(String err) {
        if (err == null) return "FAILED";
        String lower = err.toLowerCase();
        if (lower.contains("401") || lower.contains("invalid_api_key") || lower.contains("expired") || lower.contains("unauthorized")) {
            return "EXPIRED";
        }
        if (lower.contains("429") || lower.contains("rate_limit") || lower.contains("rate limit") || lower.contains("quota")) {
            return "RATE_LIMITED";
        }
        return "FAILED";
    }

    private String maskApiKey(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) return "(none)";
        if (rawKey.length() <= 8) return "****" + rawKey.substring(Math.max(0, rawKey.length() - 2));
        return rawKey.substring(0, 4) + "••••••••" + rawKey.substring(rawKey.length() - 4);
    }

    private AiApiKeyResponse toResponse(AiApiKey e) {
        return AiApiKeyResponse.builder()
                .id(e.getId())
                .scope(e.getScope())
                .userId(e.getUserId())
                .orgId(e.getOrgId())
                .provider(e.getProvider())
                .label(e.getLabel())
                .maskedKey(e.getMaskedKey())
                .baseUrl(e.getBaseUrl())
                .modelName(e.getModelName())
                .priorityOrder(e.getPriorityOrder())
                .isActive(e.getIsActive())
                .status(e.getStatus())
                .failureCount(e.getFailureCount())
                .lastError(e.getLastError())
                .lastUsedAt(e.getLastUsedAt())
                .lastFailedAt(e.getLastFailedAt())
                .cooldownUntil(e.getCooldownUntil())
                .createdAt(e.getCreatedAt())
                .build();
    }
}
