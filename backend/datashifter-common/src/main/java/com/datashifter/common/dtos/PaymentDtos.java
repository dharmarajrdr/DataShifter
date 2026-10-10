package com.datashifter.common.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;
import java.util.List;

public class PaymentDtos {
    private PaymentDtos() {}

    // ================================================================
    // PLANS
    // ================================================================

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PlanResponse {
        private String id;
        private String name;
        private String description;
        private long priceMonthly;
        private long priceYearly;
        private long priceHalfYearly;
        private String currency;
        private Integer maxPipelines;
        private Integer maxConnections;
        private Long maxRowsPerMonth;
        private Integer maxMembers;
        private Integer parallelPipelines;
        private String supportLevel;
        private boolean featured;
        private int displayOrder;
        private List<String> features;
    }

    // ================================================================
    // SUBSCRIPTION
    // ================================================================

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SubscriptionResponse {
        private String id;
        private String planId;
        private String planName;
        private String billingCycle;
        private String status;
        private Instant startedAt;
        private Instant expiresAt;
        private boolean autoRenew;
        private long daysRemaining;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreateCheckoutRequest {
        @NotBlank private String planId;
        @NotBlank private String billingCycle; // MONTHLY, HALF_YEARLY, YEARLY
        @NotBlank private String provider;     // RAZORPAY, STRIPE
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CheckoutResponse {
        private String orderId;          // Razorpay order_id or Stripe session_id
        private String provider;
        private long amount;
        private String currency;
        private String key;              // Razorpay key_id (public) or Stripe publishable_key
        private String planName;
        private String billingCycle;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class VerifyPaymentRequest {
        @NotBlank private String provider;
        // Razorpay fields
        private String razorpayOrderId;
        private String razorpayPaymentId;
        private String razorpaySignature;
        // Stripe fields
        private String stripeSessionId;
    }

    // ================================================================
    // PAYMENT HISTORY
    // ================================================================

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PaymentResponse {
        private String id;
        private String planName;
        private String billingCycle;
        private String paymentProvider;
        private String providerPaymentId;
        private long amount;
        private String currency;
        private String status;
        private Instant paidAt;
        private String failureReason;
        private Instant createdAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PaymentHistoryResponse {
        private SubscriptionResponse currentSubscription;
        private List<PaymentResponse> payments;
        private long totalPayments;
    }

    // ================================================================
    // BILLING OVERVIEW (for the payments page)
    // ================================================================

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class BillingOverviewResponse {
        private SubscriptionResponse subscription;
        private List<PlanResponse> plans;
        private List<PaymentResponse> recentPayments;
        private boolean isOwner;
    }
}
