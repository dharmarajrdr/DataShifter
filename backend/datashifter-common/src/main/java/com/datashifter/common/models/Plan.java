package com.datashifter.common.models;

import jakarta.persistence.*;
import lombok.*;

/**
 * Subscription plan definition (seeded, rarely changes).
 *
 * Example plans:
 *   Free      — 1 pipeline, 1 connection, 10K rows/month
 *   Starter   — 5 pipelines, 5 connections, 1M rows/month
 *   Pro       — 25 pipelines, 25 connections, 50M rows/month
 *   Business  — 100 pipelines, 100 connections, 500M rows/month
 *   Enterprise — Unlimited
 */
@Entity
@Table(name = "plans")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Plan extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** Monthly price in smallest currency unit (e.g., paise for INR, cents for USD) */
    @Column(name = "price_monthly", nullable = false)
    private Long priceMonthly;

    /** Yearly price (discounted) */
    @Column(name = "price_yearly", nullable = false)
    private Long priceYearly;

    /** Half-yearly price */
    @Column(name = "price_half_yearly", nullable = false)
    private Long priceHalfYearly;

    /** Currency code: INR, USD */
    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "INR";

    @Column(name = "max_pipelines")
    private Integer maxPipelines;

    @Column(name = "max_connections")
    private Integer maxConnections;

    @Column(name = "max_rows_per_month")
    private Long maxRowsPerMonth;

    @Column(name = "max_members")
    private Integer maxMembers;

    @Column(name = "parallel_pipelines")
    private Integer parallelPipelines;

    @Column(name = "support_level", length = 20)
    @Builder.Default
    private String supportLevel = "COMMUNITY";

    /** Display order on pricing page */
    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    /** Highlight this plan as recommended */
    @Column(name = "is_featured")
    @Builder.Default
    private Boolean isFeatured = false;
}
