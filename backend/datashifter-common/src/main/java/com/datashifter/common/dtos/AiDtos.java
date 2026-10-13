package com.datashifter.common.dtos;

import com.datashifter.common.enums.AiContextType;
import com.datashifter.common.enums.AiKeyScope;
import com.datashifter.common.enums.AiPlanStatus;
import com.datashifter.common.enums.AiProviderType;
import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public class AiDtos {

    // =========================================================================
    // API KEY MANAGEMENT DTOs
    // =========================================================================

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateAiApiKeyRequest {
        private AiKeyScope scope; // USER or ORG
        private AiProviderType provider; // GROQ or OLLAMA
        private String label;
        private String apiKey; // Plaintext key (encrypted before storage; optional for OLLAMA)
        private String baseUrl; // Optional custom URL (e.g., http://localhost:11434)
        private String modelName; // e.g., openai/gpt-oss-120b or llama3.1
        private Integer priorityOrder;
        private Boolean isActive;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateAiApiKeyRequest {
        private String label;
        private String apiKey; // Optional new key
        private String baseUrl;
        private String modelName;
        private Integer priorityOrder;
        private Boolean isActive;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AiApiKeyResponse {
        private String id;
        private AiKeyScope scope;
        private String userId;
        private String orgId;
        private AiProviderType provider;
        private String label;
        private String maskedKey;
        private String baseUrl;
        private String modelName;
        private Integer priorityOrder;
        private Boolean isActive;
        private String status;
        private Integer failureCount;
        private String lastError;
        private Instant lastUsedAt;
        private Instant lastFailedAt;
        private Instant cooldownUntil;
        private Instant createdAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AiKeyPoolStatusResponse {
        private String agentName;
        private AiKeyScope activeScope; // USER, ORG, or SYSTEM
        private int userKeyCount;
        private int orgKeyCount;
        private int systemKeyCount;
        private boolean ollamaAvailable;
        private String defaultGroqModel;
        private String defaultOllamaModel;
        private List<AiApiKeyResponse> userKeys;
        private List<AiApiKeyResponse> orgKeys;
        private List<String> registeredCapabilities;

        public String getActivePool() {
            return activeScope != null ? activeScope.name() : "SYSTEM";
        }
    }

    // =========================================================================
    // CHAT SESSION & MESSAGE DTOs
    // =========================================================================

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateChatSessionRequest {
        private String title;
        private AiContextType contextType;
        @JsonAlias("contextEntityId")
        private String contextId;
        @JsonAlias("contextEntityName")
        private String contextName;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateSessionContextRequest {
        private AiContextType contextType;
        @JsonAlias("contextEntityId")
        private String contextId;
        @JsonAlias("contextEntityName")
        private String contextName;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChatMessageRequest {
        private String sessionId;
        private String message;
        private AiContextType contextType;
        @JsonAlias("contextEntityId")
        private String contextId;
        @JsonAlias("contextEntityName")
        private String contextName;
        private String markdownFileName;
        @JsonAlias("markdownAttachment")
        private String markdownContent;
        private AiProviderType preferredProvider; // Optional override: GROQ or OLLAMA
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChatSessionResponse {
        private String id;
        private String title;
        private AiContextType contextType;
        private String contextId;
        private String contextName;
        private Instant createdAt;
        private Instant updatedAt;
        private List<ChatMessageResponse> messages;

        public String getContextEntityId() {
            return contextId;
        }

        public String getContextEntityName() {
            return contextName;
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChatMessageResponse {
        private String id;
        private String sessionId;
        private String role;
        private String content;
        private String markdownFileName;
        private String markdownContent;
        private String providerUsed;
        private String modelUsed;
        private String keySource;
        private ExecutionPlanResponse plan;
        private Instant createdAt;

        public String getMarkdownAttachmentName() {
            return markdownFileName;
        }
    }

    // =========================================================================
    // EXECUTION PLAN DTOs (Plan-Confirm-Execute)
    // =========================================================================

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PlanStepDto {
        private int stepNumber;
        private String actionType; // e.g., CREATE_CONNECTION, CREATE_PIPELINE, UPDATE_MAPPINGS, VALIDATE_PIPELINE, CREATE_WORKFLOW, UPDATE_SETTINGS
        private String title;
        private String description;
        private String toolName;
        private Map<String, Object> parameters;
        private String status; // PENDING, COMPLETED, FAILED, SKIPPED
        private String resultSummary;

        public String getOutput() {
            return resultSummary;
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExecutionPlanResponse {
        private String id;
        private String sessionId;
        private String title;
        private String summary;
        private AiPlanStatus status;
        private AiContextType contextType;
        private String contextId;
        private List<PlanStepDto> steps;
        private List<String> executionLogs;
        private String resultEntityType;
        private String resultEntityId;
        private Instant confirmedAt;
        private Instant completedAt;
        private Instant createdAt;

        public String getExecutionResult() {
            if (status == AiPlanStatus.COMPLETED && executionLogs != null && !executionLogs.isEmpty()) {
                return String.join(" • ", executionLogs);
            }
            return null;
        }

        public String getErrorMessage() {
            if (status == AiPlanStatus.FAILED && executionLogs != null && !executionLogs.isEmpty()) {
                return executionLogs.stream()
                        .filter(l -> l.contains("FAILED:"))
                        .findFirst()
                        .orElse(String.join(" • ", executionLogs));
            }
            return null;
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PlanDecisionRequest {
        private boolean approved;
        private String feedback;
    }
}
