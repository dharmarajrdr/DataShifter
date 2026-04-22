package com.datashifter.common.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;

public class NamespaceDtos {
    private NamespaceDtos() {}

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreateNamespaceRequest {
        @NotBlank private String name;
        private String description;
        private String color;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdateNamespaceRequest {
        private String name;
        private String description;
        private String color;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class NamespaceResponse {
        private String id;
        private String name;
        private String description;
        private String color;
        private String createdBy;
        private int pipelineCount;
        private Instant createdAt;
    }

    /** Request to move a pipeline to a different namespace */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MovePipelineRequest {
        @NotBlank private String namespaceId;
    }
}