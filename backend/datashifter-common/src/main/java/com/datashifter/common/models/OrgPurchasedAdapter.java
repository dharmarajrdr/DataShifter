package com.datashifter.common.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Organization entitlement record for an adapter purchased/installed from the Marketplace.
 */
@Entity
@Table(name = "org_purchased_adapters",
        uniqueConstraints = @UniqueConstraint(name = "uq_org_purchased_adapter", columnNames = {"organization_id", "marketplace_item_id"}),
        indexes = @Index(name = "idx_org_purchased_adapters_org", columnList = "organization_id")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrgPurchasedAdapter extends BaseEntity {

    @Column(name = "organization_id", nullable = false, length = 36)
    private String organizationId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "marketplace_item_id", nullable = false)
    private MarketplaceCatalogItem marketplaceItem;

    @Column(name = "payment_id", length = 36)
    private String paymentId;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "amount_paid_paise", nullable = false)
    @Builder.Default
    private Long amountPaidPaise = 0L;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String currency = "INR";

    @Column(name = "purchased_at", nullable = false)
    @Builder.Default
    private Instant purchasedAt = Instant.now();
}
