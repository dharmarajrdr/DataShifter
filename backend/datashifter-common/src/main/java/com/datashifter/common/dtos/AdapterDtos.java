package com.datashifter.common.dtos;

import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.List;

public final class AdapterDtos {

    private AdapterDtos() {}

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdapterResponse {
        private String id;
        private String organizationId;
        private String name;
        private String adapterKey;
        private String description;
        private AdapterType adapterType;
        private AdapterMode supportedMode;
        private String category;
        private String version;
        private String status;
        private String className;
        private String artifactName;
        private Long sizeBytes;
        private String configSchema;
        private boolean isOfficial;
        private boolean isPurchased;
        @Builder.Default
        private Integer pipelineCount = 0;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MarketplaceItemResponse {
        private String id;
        private String adapterDefinitionId;
        private String name;
        private String adapterKey;
        private String description;
        private String category;
        private AdapterType adapterType;
        private AdapterMode supportedMode;
        private Long pricePaise;
        private String currency;
        private boolean isFree;
        private boolean isPurchased;
        private String iconUrl;
        private String documentationUrl;
        private Integer displayOrder;
        private String configSchema;
        private Instant createdAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PurchaseAdapterRequest {
        private String marketplaceItemId;
        private String paymentId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PurchaseAdapterResponse {
        private String id;
        private String organizationId;
        private String marketplaceItemId;
        private String adapterKey;
        private String adapterName;
        private String status;
        private Long amountPaidPaise;
        private String currency;
        private Instant purchasedAt;
    }
}
