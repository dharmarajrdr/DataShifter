package com.datashifter.common.dtos;

import com.datashifter.common.enums.UdfStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

public final class UdfDtos {
    private UdfDtos() {}

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
    }
}