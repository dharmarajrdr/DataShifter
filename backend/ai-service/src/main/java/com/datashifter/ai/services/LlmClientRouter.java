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

            try {
                log.info("Invoking LLM via {} [{}] (scope={}, model={})",
                        candidate.provider(), candidate.label(), candidate.scope(), candidate.modelName());

                ChatModel chatModel = buildChatModel(candidate);
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
                        candidate.modelName(),
                        candidate.scope().name(),
                        candidate.label()
                );
            } catch (Exception ex) {
                String errMsg = ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName();
                log.warn("LLM invocation failed on candidate '{}' ({}): {}",
                        candidate.label(), candidate.provider(), errMsg);
                keyManagementService.recordKeyFailure(candidate, errMsg);
                attemptErrors.add(candidate.label() + ": " + errMsg);
            }
        }

        throw new DatashifterException("All configured LLM keys/providers failed. Attempts: " + String.join(" | ", attemptErrors));
    }

    /**
     * Tests a single candidate or newly configured key with a lightweight ping prompt.
     */
    public Map<String, Object> testCandidate(ResolvedLlmCandidate candidate) {
        long start = System.currentTimeMillis();
        try {
            ChatModel chatModel = buildChatModel(candidate);
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
                    "model", candidate.modelName(),
                    "provider", candidate.provider().name(),
                    "reply", reply != null ? reply.trim() : "OK"
            );
        } catch (Exception ex) {
            String errMsg = ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName();
            keyManagementService.recordKeyFailure(candidate, errMsg);
            return Map.of(
                    "success", false,
                    "provider", candidate.provider().name(),
                    "model", candidate.modelName(),
                    "message", errMsg
            );
        }
    }

    private ChatModel buildChatModel(ResolvedLlmCandidate candidate) {
        if (candidate.provider() == AiProviderType.OLLAMA) {
            OllamaApi ollamaApi = new OllamaApi(candidate.baseUrl());
            OllamaOptions options = OllamaOptions.builder()
                    .model(candidate.modelName())
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
                .model(candidate.modelName())
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
