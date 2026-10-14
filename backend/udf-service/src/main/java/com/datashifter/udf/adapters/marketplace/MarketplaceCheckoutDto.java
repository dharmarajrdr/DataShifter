package com.datashifter.udf.adapters.marketplace;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Data Transfer Objects for Marketplace checkout and order initialization.
 */
public final class MarketplaceCheckoutDto {

    private MarketplaceCheckoutDto() {}

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateOrderRequest {
        private String provider; // RAZORPAY, STRIPE, MOCK
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderResponse {
        private String orderId;
        private String marketplaceItemId;
        private String adapterKey;
        private String adapterName;
        private long amountPaise;
        private String currency;
        private String provider;
        private String keyId;
    }
}
