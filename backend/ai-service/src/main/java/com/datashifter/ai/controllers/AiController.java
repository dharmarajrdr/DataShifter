package com.datashifter.ai.controllers;

import com.datashifter.ai.services.AiKeyManagementService;
import com.datashifter.ai.services.AiKeyManagementService.ResolvedLlmCandidate;
import com.datashifter.ai.services.BeetelAgentService;
import com.datashifter.ai.services.LlmClientRouter;
import com.datashifter.common.dtos.AiDtos.*;
import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.enums.AiContextType;
import com.datashifter.common.models.AiApiKey;
import com.datashifter.common.repositories.AiApiKeyRepository;
import com.datashifter.common.utils.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiKeyManagementService keyManagementService;
    private final LlmClientRouter llmClientRouter;
    private final BeetelAgentService beetelAgentService;
    private final AiApiKeyRepository apiKeyRepository;

    // =========================================================================
    // LLM API KEY POOL MANAGEMENT (USER / ORG / SYSTEM STATUS)
    // =========================================================================

    @GetMapping("/keys/status")
    public ApiResponse<AiKeyPoolStatusResponse> getKeyPoolStatus() {
        return ApiResponse.success(keyManagementService.getPoolStatus());
    }

    @PostMapping("/keys")
    public ApiResponse<AiApiKeyResponse> createKey(@RequestBody CreateAiApiKeyRequest request) {
        return ApiResponse.success(keyManagementService.createKey(request), "API key added");
    }

    @PutMapping("/keys/{id}")
    public ApiResponse<AiApiKeyResponse> updateKey(
            @PathVariable String id,
            @RequestBody UpdateAiApiKeyRequest request) {
        return ApiResponse.success(keyManagementService.updateKey(id, request), "API key updated");
    }

    @DeleteMapping("/keys/{id}")
    public ResponseEntity<Void> deleteKey(@PathVariable String id) {
        keyManagementService.deleteKey(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/keys/{id}/reset")
    public ApiResponse<AiApiKeyResponse> resetKeyHealth(@PathVariable String id) {
        return ApiResponse.success(keyManagementService.resetKeyHealth(id), "Key health reset");
    }

    @PostMapping("/keys/{id}/test")
    public ApiResponse<Map<String, Object>> testKey(@PathVariable String id) {
        AiApiKey key = apiKeyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Key not found: " + id));
        String decrypted = key.getEncryptedApiKey() != null && !key.getEncryptedApiKey().isBlank()
                ? EncryptionUtil.decrypt(key.getEncryptedApiKey())
                : "";
        ResolvedLlmCandidate candidate = new ResolvedLlmCandidate(
                key.getId(),
                key.getScope(),
                key.getProvider(),
                key.getLabel(),
                decrypted,
                key.getBaseUrl(),
                key.getModelName(),
                null
        );
        return ApiResponse.success(llmClientRouter.testCandidate(candidate));
    }

    // =========================================================================
    // CHAT SESSIONS, SAME-ORG SHARING & CONTEXT
    // =========================================================================

    @GetMapping("/org-members")
    public ApiResponse<List<ChatParticipantDto>> listOrganizationMembers() {
        return ApiResponse.success(beetelAgentService.listOrganizationMembers());
    }

    @GetMapping("/sessions")
    public ApiResponse<List<ChatSessionResponse>> listSessions(
            @RequestParam(required = false) AiContextType contextType,
            @RequestParam(required = false) String contextId) {
        return ApiResponse.success(beetelAgentService.listSessions(contextType, contextId));
    }

    @PostMapping("/sessions")
    public ApiResponse<ChatSessionResponse> createSession(
            @RequestBody(required = false) CreateChatSessionRequest request) {
        return ApiResponse.success(beetelAgentService.createSession(request));
    }

    @GetMapping("/sessions/{id}")
    public ApiResponse<ChatSessionResponse> getSession(
            @PathVariable String id,
            @RequestParam(required = false, defaultValue = "15") Integer limit) {
        return ApiResponse.success(beetelAgentService.getSession(id, limit));
    }

    @PostMapping("/sessions/{id}/share")
    public ApiResponse<ChatSessionResponse> shareSession(
            @PathVariable String id,
            @RequestBody ShareChatSessionRequest request) {
        return ApiResponse.success(
                beetelAgentService.shareSession(id, request),
                "Conversation shared with selected organization members");
    }

    @GetMapping("/sessions/{id}/messages")
    public ApiResponse<ChatMessagePageResponse> getSessionMessages(
            @PathVariable String id,
            @RequestParam(required = false) String beforeMessageId,
            @RequestParam(required = false, defaultValue = "15") Integer limit) {
        return ApiResponse.success(beetelAgentService.getSessionMessagesPage(id, beforeMessageId, limit));
    }

    @PutMapping("/sessions/{id}/context")
    public ApiResponse<ChatSessionResponse> updateSessionContext(
            @PathVariable String id,
            @RequestBody UpdateSessionContextRequest request) {
        return ApiResponse.success(beetelAgentService.updateSessionContext(id, request));
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<Void> deleteSession(@PathVariable String id) {
        beetelAgentService.deleteSession(id);
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // CHAT MESSAGES & EXECUTION PLAN CONFIRMATION
    // =========================================================================

    @PostMapping("/chat")
    public ApiResponse<ChatMessageResponse> sendMessage(@RequestBody ChatMessageRequest request) {
        return ApiResponse.success(beetelAgentService.sendMessage(request));
    }

    @PostMapping("/plans/{planId}/decision")
    public ApiResponse<ChatMessageResponse> decidePlan(
            @PathVariable String planId,
            @RequestBody PlanDecisionRequest decision) {
        return ApiResponse.success(beetelAgentService.decidePlan(planId, decision));
    }
}

