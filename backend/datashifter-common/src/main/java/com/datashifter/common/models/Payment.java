package com.datashifter.common.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Payment record — every successful/failed payment attempt.
 */
@Entity
@Table(name = "payments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Payment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id")
    private Subscription subscription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private Plan plan;

    /** RAZORPAY, STRIPE */
    @Column(name = "payment_provider", nullable = false, length = 20)
    private String paymentProvider;

    /** Provider's payment/order ID */
    @Column(name = "provider_payment_id", length = 100)
    private String providerPaymentId;

    /** Provider's order ID */
    @Column(name = "provider_order_id", length = 100)
    private String providerOrderId;

    /** Amount in smallest currency unit (paise/cents) */
    @Column(nullable = false)
    private Long amount;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "INR";

    /** PENDING, SUCCESS, FAILED, REFUNDED */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    /** MONTHLY, HALF_YEARLY, YEARLY */
    @Column(name = "billing_cycle", nullable = false, length = 20)
    private String billingCycle;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    /** Raw provider response JSON */
    @Column(name = "provider_response", columnDefinition = "TEXT")
    private String providerResponse;
}
