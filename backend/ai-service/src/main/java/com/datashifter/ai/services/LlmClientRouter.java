package com.datashifter.ai.services;

import com.datashifter.ai.services.AiKeyManagementService.ResolvedLlmCandidate;
import com.datashifter.common.enums.AiProviderType;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.security.UserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.ollama.api.OllamaApi;
import org.springframework.ai.ollama.api.OllamaOptions;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class LlmClientRouter {

    private final AiKeyManagementService keyManagementService;

    public record LlmInvocationResult(
            String content,
            String providerUsed,
            String modelUsed,
            String keySource,
            String keyLabel
    ) {}

    private static final List<String> GROQ_FALLBACK_MODELS = List.of(
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "qwen/qwen3.8-27b"
    );

    /**
     * Executes a prompt with Spring AI ChatClient, automatically rotating through
     * the resolved key pool (User -> Org -> System) if a key fails or hits rate limits.
     */
    public LlmInvocationResult callWithFailover(
            String systemPrompt,
            List<Message> historyMessages,
            String userPrompt,
            List<Object> toolBeans,
            AiProviderType preferredProvider
    ) {
        String userId = UserContext.getCurrentUserId();
        String orgId = UserContext.getCurrentOrgId();

        List<ResolvedLlmCandidate> candidates = keyManagementService.resolveCandidatePool(userId, orgId, preferredProvider);
        if (candidates.isEmpty()) {
            throw new DatashifterException(
                    "No LLM API keys or Ollama instances are configured. Please add a Groq API key or Ollama endpoint in User Profile / Organization Settings, or set GROQ_API_KEYS in the environment.");
        }

        List<String> attemptErrors = new ArrayList<>();

        for (ResolvedLlmCandidate candidate : candidates) {
            // Skip system Ollama fallback if Ollama is not reachable and other candidates were tried
            if (candidate.provider() == AiProviderType.OLLAMA
                    && "SYSTEM-OLLAMA".equals(candidate.keyId())
                    && !keyManagementService.isOllamaReachable(candidate.baseUrl())) {
                attemptErrors.add(candidate.label() + ": Local Ollama server not reachable at " + candidate.baseUrl());
                continue;
            }

            List<String> modelsToTry = buildModelsToTry(candidate);
            String lastCandidateError = null;

            for (String modelName : modelsToTry) {
                try {
                    log.info("Invoking LLM via {} [{}] (scope={}, model={})",
                            candidate.provider(), candidate.label(), candidate.scope(), modelName);

                    ChatModel chatModel = buildChatModel(candidate, modelName);
                    var requestSpec = ChatClient.create(chatModel)
                            .prompt()
                            .system(systemPrompt);

                    if (historyMessages != null && !historyMessages.isEmpty()) {
                        requestSpec = requestSpec.messages(historyMessages);
                    }

                    requestSpec = requestSpec.user(userPrompt);

                    if (toolBeans != null && !toolBeans.isEmpty()) {
                        requestSpec = requestSpec.tools(toolBeans.toArray());
                    }

                    String responseText = requestSpec.call().content();
                    keyManagementService.recordKeySuccess(candidate);

                    return new LlmInvocationResult(
                            responseText != null ? responseText : "",
                            candidate.provider().name(),
                            modelName,
                            candidate.scope().name(),
                            candidate.label()
                    );
                } catch (Exception ex) {
                    String errMsg = ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName();
                    lastCandidateError = errMsg;
                    if (isModelNotFoundError(errMsg)) {
                        log.warn("Model '{}' not found on candidate '{}', trying next fallback model...",
                                modelName, candidate.label());
                        continue;
                    }
                    break;
                }
            }

            if (lastCandidateError != null) {
                log.warn("LLM invocation failed on candidate '{}' ({}): {}",
                        candidate.label(), candidate.provider(), lastCandidateError);
                keyManagementService.recordKeyFailure(candidate, lastCandidateError);
                attemptErrors.add(candidate.label() + ": " + lastCandidateError);
            }
        }

        throw new DatashifterException("All configured LLM keys/providers failed. Attempts: " + String.join(" | ", attemptErrors));
    }

    /**
     * Tests a single candidate or newly configured key with a lightweight ping prompt.
     */
    public Map<String, Object> testCandidate(ResolvedLlmCandidate candidate) {
        long start = System.currentTimeMillis();
        List<String> modelsToTry = buildModelsToTry(candidate);
        String lastErr = null;

        for (String modelName : modelsToTry) {
            try {
                ChatModel chatModel = buildChatModel(candidate, modelName);
                String reply = ChatClient.create(chatModel)
                        .prompt()
                        .user("Reply with the single word: OK")
                        .call()
                        .content();
                long latencyMs = System.currentTimeMillis() - start;
                keyManagementService.recordKeySuccess(candidate);
                return Map.of(
                        "success", true,
                        "latencyMs", latencyMs,
                        "model", modelName,
                        "provider", candidate.provider().name(),
                        "reply", reply != null ? reply.trim() : "OK"
                );
            } catch (Exception ex) {
                String errMsg = ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName();
                lastErr = errMsg;
                if (isModelNotFoundError(errMsg)) {
                    continue;
                }
                break;
            }
        }

        keyManagementService.recordKeyFailure(candidate, lastErr);
        return Map.of(
                "success", false,
                "provider", candidate.provider().name(),
                "model", candidate.modelName(),
                "message", lastErr != null ? lastErr : "Unknown error"
        );
    }

    private List<String> buildModelsToTry(ResolvedLlmCandidate candidate) {
        List<String> models = new ArrayList<>();
        if (candidate.modelName() != null && !candidate.modelName().isBlank()) {
            models.add(candidate.modelName().trim());
        }
        if (candidate.provider() == AiProviderType.GROQ) {
            for (String fallback : GROQ_FALLBACK_MODELS) {
                if (!models.contains(fallback)) {
                    models.add(fallback);
                }
            }
        }
        return models;
    }

    private boolean isModelNotFoundError(String errMsg) {
        if (errMsg == null) return false;
        String lower = errMsg.toLowerCase();
        return lower.contains("model_not_found") || (lower.contains("404") && lower.contains("model"));
    }

    private ChatModel buildChatModel(ResolvedLlmCandidate candidate, String modelName) {
        if (candidate.provider() == AiProviderType.OLLAMA) {
            OllamaApi ollamaApi = new OllamaApi(candidate.baseUrl());
            OllamaOptions options = OllamaOptions.builder()
                    .model(modelName)
                    .temperature(0.2)
                    .build();
            return OllamaChatModel.builder()
                    .ollamaApi(ollamaApi)
                    .defaultOptions(options)
                    .build();
        }

        // Default: GROQ (OpenAI-compatible API)
        String baseUrl = normalizeOpenAiBaseUrl(candidate.baseUrl());
        OpenAiApi openAiApi = new OpenAiApi(baseUrl, candidate.apiKey());
        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model(modelName)
                .temperature(0.2)
                .build();
        return OpenAiChatModel.builder()
                .openAiApi(openAiApi)
                .defaultOptions(options)
                .build();
    }

    private String normalizeOpenAiBaseUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return "https://api.groq.com/openai";
        }
        String trimmed = rawUrl.trim();
        // Spring AI OpenAiApi appends /v1/chat/completions automatically, so strip trailing /v1 if present
        if (trimmed.endsWith("/v1/")) {
            return trimmed.substring(0, trimmed.length() - 4);
        }
        if (trimmed.endsWith("/v1")) {
            return trimmed.substring(0, trimmed.length() - 3);
        }
        if (trimmed.endsWith("/")) {
            return trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }
}
