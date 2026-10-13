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
import org.springframework.retry.support.RetryTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class LlmClientRouter {

    private final AiKeyManagementService keyManagementService;

    private static final RetryTemplate NO_INTERNAL_RETRY = RetryTemplate.builder()
            .maxAttempts(1)
            .build();

    public record LlmInvocationResult(
            String content,
            String providerUsed,
            String modelUsed,
            String keySource,
            String keyLabel
    ) {}

    private static final List<String> GROQ_FALLBACK_MODELS = List.of(
            "openai/gpt-oss-20b",
            "openai/gpt-oss-120b",
            "qwen/qwen3.8-27b"
    );

    private static final List<String> OLLAMA_FALLBACK_MODELS = List.of(
            "gemma4:12b",
            "llama3.2",
            "llama3.1"
    );

    /**
     * Executes a prompt with Spring AI ChatClient, automatically rotating through
     * the resolved key pool (User -> Org -> System) and model tiers if a key fails or hits rate limits.
     */
    public LlmInvocationResult callWithFailover(
            String systemPrompt,
            List<Message> historyMessages,
            String userPrompt,
            List<Object> toolBeans,
            AiProviderType preferredProvider
    ) {
        return callWithFailover(systemPrompt, historyMessages, userPrompt, toolBeans, preferredProvider, null);
    }

    public LlmInvocationResult callWithFailover(
            String systemPrompt,
            List<Message> historyMessages,
            String userPrompt,
            List<Object> toolBeans,
            AiProviderType preferredProvider,
            String sessionOwnerUserId
    ) {
        String userId = UserContext.getCurrentUserId();
        String orgId = UserContext.getCurrentOrgId();

        List<ResolvedLlmCandidate> candidates = new ArrayList<>(
                keyManagementService.resolveCandidatePool(userId, sessionOwnerUserId, orgId, preferredProvider)
        );

        boolean hasOllamaCandidate = candidates.stream()
                .anyMatch(c -> c.provider() == AiProviderType.OLLAMA);
        if (!hasOllamaCandidate) {
            keyManagementService.getLocalOllamaFallbackCandidate().ifPresent(localOllama -> {
                if (preferredProvider == AiProviderType.OLLAMA) {
                    candidates.add(0, localOllama);
                } else {
                    candidates.add(localOllama);
                }
            });
        }

        if (candidates.isEmpty()) {
            throw new DatashifterException(
                    "No LLM API keys or Ollama instances are configured. Please add a Groq API key or Ollama endpoint in User Profile / Organization Settings, or set GROQ_API_KEYS in the environment.");
        }

        List<String> attemptErrors = new ArrayList<>();

        for (ResolvedLlmCandidate candidate : candidates) {
            if (candidate.provider() == AiProviderType.OLLAMA
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
                    String responseText = executeChatRequest(chatModel, candidate, systemPrompt, historyMessages, userPrompt, toolBeans);
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
                    if (isModelNotFoundError(errMsg) || isPerModelRateLimitError(errMsg)) {
                        log.warn("Model '{}' unavailable/rate-limited on candidate '{}' ({}), trying next model/key...",
                                modelName, candidate.label(), summarizeError(errMsg));
                        continue;
                    }
                    break;
                }
            }

            if (lastCandidateError != null) {
                log.warn("LLM invocation failed on candidate '{}' ({}): {}",
                        candidate.label(), candidate.provider(), lastCandidateError);
                keyManagementService.recordKeyFailure(candidate, lastCandidateError);
                attemptErrors.add(candidate.label() + ": " + summarizeError(lastCandidateError));
            }
        }

        throw new DatashifterException("All configured LLM keys/providers failed. Attempts: " + String.join(" | ", attemptErrors));
    }

    private String executeChatRequest(
            ChatModel chatModel,
            ResolvedLlmCandidate candidate,
            String systemPrompt,
            List<Message> historyMessages,
            String userPrompt,
            List<Object> toolBeans
    ) {
        try {
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

            return requestSpec.call().content();
        } catch (Exception ex) {
            String errMsg = ex.getMessage() != null ? ex.getMessage() : "";
            // If an Ollama model does not support native function/tool calling, retry cleanly without tools
            // (Live Workspace Inventory is already injected in systemPrompt)
            boolean isOllamaToolError = candidate.provider() == AiProviderType.OLLAMA
                    && toolBeans != null && !toolBeans.isEmpty()
                    && (errMsg.toLowerCase().contains("does not support tools")
                        || errMsg.toLowerCase().contains("tool")
                        || errMsg.contains("400"));

            // If a provider (Groq, OpenAI, etc.) fails with tool call validation error (e.g. model hallucinated an unprovided tool),
            // gracefully retry without tools so the user receives the AI response instead of a raw HTTP 400 crash
            boolean isToolValidationFailure = toolBeans != null && !toolBeans.isEmpty()
                    && (errMsg.toLowerCase().contains("tool call validation failed")
                        || errMsg.toLowerCase().contains("attempted to call tool")
                        || errMsg.toLowerCase().contains("was not in request.tools"));

            if (isOllamaToolError || isToolValidationFailure) {
                log.warn("{} on '{}' encountered tool execution error ({}); retrying cleanly without tools as text fallback.",
                        candidate.provider(), candidate.label(), summarizeError(errMsg));
                var fallbackSpec = ChatClient.create(chatModel)
                        .prompt()
                        .system(systemPrompt);
                if (historyMessages != null && !historyMessages.isEmpty()) {
                    fallbackSpec = fallbackSpec.messages(historyMessages);
                }
                return fallbackSpec.user(userPrompt).call().content();
            }
            throw ex;
        }
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
                if (isModelNotFoundError(errMsg) || isPerModelRateLimitError(errMsg)) {
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
        Set<String> models = new LinkedHashSet<>();
        if (candidate.modelName() != null && !candidate.modelName().isBlank()) {
            models.add(candidate.modelName().trim());
        }
        if (candidate.provider() == AiProviderType.GROQ) {
            models.addAll(GROQ_FALLBACK_MODELS);
        } else if (candidate.provider() == AiProviderType.OLLAMA) {
            models.addAll(OLLAMA_FALLBACK_MODELS);
        }
        return new ArrayList<>(models);
    }

    private boolean isModelNotFoundError(String errMsg) {
        if (errMsg == null) return false;
        String lower = errMsg.toLowerCase();
        return lower.contains("model_not_found")
                || (lower.contains("404") && lower.contains("model"))
                || (lower.contains("not found") && lower.contains("model"));
    }

    private boolean isPerModelRateLimitError(String errMsg) {
        if (errMsg == null) return false;
        String lower = errMsg.toLowerCase();
        return lower.contains("429")
                || lower.contains("413")
                || lower.contains("rate_limit_exceeded")
                || lower.contains("request too large")
                || lower.contains("tokens per minute");
    }

    private String summarizeError(String errMsg) {
        if (errMsg == null) return "Unknown error";
        return errMsg.length() > 600 ? errMsg.substring(0, 600) + "..." : errMsg;
    }

    private ChatModel buildChatModel(ResolvedLlmCandidate candidate, String modelName) {
        if (candidate.provider() == AiProviderType.OLLAMA) {
            String effectiveOllamaUrl = keyManagementService.resolveEffectiveOllamaBaseUrl(candidate.baseUrl());
            OllamaApi ollamaApi = new OllamaApi(effectiveOllamaUrl);
            OllamaOptions options = OllamaOptions.builder()
                    .model(modelName)
                    .temperature(0.2)
                    .build();
            return OllamaChatModel.builder()
                    .ollamaApi(ollamaApi)
                    .defaultOptions(options)
                    .build();
        }

        // Default: GROQ (OpenAI-compatible API) with 1-attempt RetryTemplate for instant key/model failover
        String baseUrl = normalizeOpenAiBaseUrl(candidate.baseUrl());
        OpenAiApi openAiApi = new OpenAiApi(baseUrl, candidate.apiKey());
        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model(modelName)
                .temperature(0.2)
                .build();
        return OpenAiChatModel.builder()
                .openAiApi(openAiApi)
                .defaultOptions(options)
                .retryTemplate(NO_INTERNAL_RETRY)
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
