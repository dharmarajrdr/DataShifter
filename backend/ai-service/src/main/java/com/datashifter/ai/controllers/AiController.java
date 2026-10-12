package com.datashifter.ai.controllers;

import com.datashifter.ai.services.AiKeyManagementService;
import com.datashifter.ai.services.AiKeyManagementService.ResolvedLlmCandidate;
import com.datashifter.ai.services.BeetelAgentService;
import com.datashifter.ai.services.LlmClientRouter;
import com.datashifter.common.dtos.AiDtos.*;
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
    public ResponseEntity<AiKeyPoolStatusResponse> getKeyPoolStatus() {
        return ResponseEntity.ok(keyManagementService.getPoolStatus());
    }

    @PostMapping("/keys")
    public ResponseEntity<AiApiKeyResponse> createKey(@RequestBody CreateAiApiKeyRequest request) {
        return ResponseEntity.ok(keyManagementService.createKey(request));
    }

    @PutMapping("/keys/{id}")
    public ResponseEntity<AiApiKeyResponse> updateKey(
            @PathVariable String id,
            @RequestBody UpdateAiApiKeyRequest request) {
        return ResponseEntity.ok(keyManagementService.updateKey(id, request));
    }

    @DeleteMapping("/keys/{id}")
    public ResponseEntity<Void> deleteKey(@PathVariable String id) {
        keyManagementService.deleteKey(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/keys/{id}/reset")
    public ResponseEntity<AiApiKeyResponse> resetKeyHealth(@PathVariable String id) {
        return ResponseEntity.ok(keyManagementService.resetKeyHealth(id));
    }

    @PostMapping("/keys/{id}/test")
    public ResponseEntity<Map<String, Object>> testKey(@PathVariable String id) {
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
        return ResponseEntity.ok(llmClientRouter.testCandidate(candidate));
    }

    // =========================================================================
    // CHAT SESSIONS & CONTEXT
    // =========================================================================

    @GetMapping("/sessions")
    public ResponseEntity<List<ChatSessionResponse>> listSessions(
            @RequestParam(required = false) AiContextType contextType,
            @RequestParam(required = false) String contextId) {
        return ResponseEntity.ok(beetelAgentService.listSessions(contextType, contextId));
    }

    @PostMapping("/sessions")
    public ResponseEntity<ChatSessionResponse> createSession(
            @RequestBody(required = false) CreateChatSessionRequest request) {
        return ResponseEntity.ok(beetelAgentService.createSession(request));
    }

    @GetMapping("/sessions/{id}")
    public ResponseEntity<ChatSessionResponse> getSession(@PathVariable String id) {
        return ResponseEntity.ok(beetelAgentService.getSession(id));
    }

    @PutMapping("/sessions/{id}/context")
    public ResponseEntity<ChatSessionResponse> updateSessionContext(
            @PathVariable String id,
            @RequestBody UpdateSessionContextRequest request) {
        return ResponseEntity.ok(beetelAgentService.updateSessionContext(id, request));
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
    public ResponseEntity<ChatMessageResponse> sendMessage(@RequestBody ChatMessageRequest request) {
        return ResponseEntity.ok(beetelAgentService.sendMessage(request));
    }

    @PostMapping("/plans/{planId}/decision")
    public ResponseEntity<ChatMessageResponse> decidePlan(
            @PathVariable String planId,
            @RequestBody PlanDecisionRequest decision) {
        return ResponseEntity.ok(beetelAgentService.decidePlan(planId, decision));
    }
}
