package com.datashifter.common.dtos;

import java.time.Instant;
import java.util.List;

import com.datashifter.common.enums.UdfStatus;

import lombok.Builder;
import lombok.Getter;

public final class UdfDtos {
    private UdfDtos() {
    }

    @Getter
    @Builder
    public static class UdfResponse {
        private String id;
        private String name;
        private String description;
        private String version;
        private UdfStatus status;
        private String artifactName;
        private String artifactSha256;
        private Long sizeBytes;
        private String validationMessage;
        private Instant createdAt;
        private Instant updatedAt;
        private List<UdfFunctionResponse> functions;
        @Builder.Default
        private Long pipelineCount = 0L;
        @Builder.Default
        private Long columnCount = 0L;
    }

    @Getter
    @Builder
    public static class UdfFunctionResponse {
        private String id;
        private String className;
        private String methodName;
        private String functionName;
        private String description;
        private List<String> parameterTypes;
        private String returnType;
        private boolean staticMethod;
    }

    @Getter
    public static class UdfTestRequest {
        private String className;
        private String methodName;
        private java.util.Map<String, Object> inputData;
    }
}