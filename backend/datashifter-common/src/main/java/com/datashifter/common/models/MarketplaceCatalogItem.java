package com.datashifter.common.models;

import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Public catalog listing for an official adapter available in the Adapter Marketplace.
 */
@Entity
@Table(name = "marketplace_catalog")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarketplaceCatalogItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "adapter_definition_id")
    private AdapterDefinition adapterDefinition;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "adapter_key", nullable = false, unique = true, length = 120)
    private String adapterKey;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String category = "database";

    @Enumerated(EnumType.STRING)
    @Column(name = "adapter_type", nullable = false, length = 20)
    private AdapterType adapterType;

    @Enumerated(EnumType.STRING)
    @Column(name = "supported_mode", nullable = false, length = 20)
    @Builder.Default
    private AdapterMode supportedMode = AdapterMode.BATCH;

    /** Price in smallest currency unit (e.g. paise: 499900 = ₹4,999; 0 = Free) */
    @Column(name = "price_paise", nullable = false)
    @Builder.Default
    private Long pricePaise = 0L;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String currency = "INR";

    @Column(name = "is_free", nullable = false)
    @Builder.Default
    private Boolean isFree = false;

    @Column(name = "icon_url", length = 500)
    private String iconUrl;

    @Column(name = "documentation_url", length = 500)
    private String documentationUrl;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
