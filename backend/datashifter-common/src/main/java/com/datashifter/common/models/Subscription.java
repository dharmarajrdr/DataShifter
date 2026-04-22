package com.datashifter.common.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Active subscription for an organization.
 * One org has at most one active subscription at a time.
 */
@Entity
@Table(name = "subscriptions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Subscription extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private Plan plan;

    /** MONTHLY, HALF_YEARLY, YEARLY */
    @Column(name = "billing_cycle", nullable = false, length = 20)
    private String billingCycle;

    /** ACTIVE, EXPIRED, CANCELLED, PAST_DUE */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    /** Razorpay subscription ID (if applicable) */
    @Column(name = "razorpay_subscription_id", length = 100)
    private String razorpaySubscriptionId;

    /** Stripe subscription ID (if applicable) */
    @Column(name = "stripe_subscription_id", length = 100)
    private String stripeSubscriptionId;

    @Column(name = "auto_renew")
    @Builder.Default
    private Boolean autoRenew = true;
}
