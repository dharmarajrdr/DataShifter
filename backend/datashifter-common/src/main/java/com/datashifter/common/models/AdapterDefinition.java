package com.datashifter.common.models;

import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Persisted definition of an adapter (either an official marketplace adapter
 * or a private tenant-uploaded custom JAR).
 */
@Entity
@Table(name = "adapter_definitions", indexes = {
        @Index(name = "idx_adapter_definitions_org", columnList = "organization_id"),
        @Index(name = "idx_adapter_definitions_key", columnList = "adapter_key")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdapterDefinition extends BaseEntity {

    /** Organization owning this adapter, or NULL for system-wide / official adapters */
    @Column(name = "organization_id", length = 36)
    private String organizationId;

    @Column(name = "created_by_user_id", length = 36)
    private String createdByUserId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "adapter_key", nullable = false, length = 120)
    private String adapterKey;

    @Column(length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "adapter_type", nullable = false, length = 20)
    private AdapterType adapterType;

    @Enumerated(EnumType.STRING)
    @Column(name = "supported_mode", nullable = false, length = 20)
    @Builder.Default
    private AdapterMode supportedMode = AdapterMode.BATCH;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String category = "database";

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String version = "1.0.0";

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "READY";

    @Column(name = "class_name", nullable = false, length = 500)
    private String className;

    @Column(name = "storage_key", length = 500)
    private String storageKey;

    @Column(name = "artifact_name", length = 255)
    private String artifactName;

    @Column(name = "artifact_sha256", length = 64)
    private String artifactSha256;

    @Column(name = "size_bytes")
    @Builder.Default
    private Long sizeBytes = 0L;

    @Column(name = "config_schema", columnDefinition = "TEXT")
    private String configSchema;

    @Column(name = "is_official", nullable = false)
    @Builder.Default
    private Boolean isOfficial = false;
}
