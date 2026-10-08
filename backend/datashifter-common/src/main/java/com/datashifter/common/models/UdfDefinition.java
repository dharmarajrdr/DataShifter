package com.datashifter.common.models;

import com.datashifter.common.enums.UdfStatus;

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

@Entity
@Table(name = "udf_definitions", indexes = {
        @Index(name = "idx_udf_definitions_org", columnList = "organization_id"),
        @Index(name = "idx_udf_definitions_org_name", columnList = "organization_id,name", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UdfDefinition extends BaseEntity {

    @Column(name = "organization_id", nullable = false, length = 36)
    private String organizationId;

    @Column(name = "created_by_user_id", nullable = false, length = 36)
    private String createdByUserId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String version = "1.0.0";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private UdfStatus status = UdfStatus.VALIDATING;

    @Column(name = "artifact_name", nullable = false, length = 255)
    private String artifactName;

    @Column(name = "storage_key", nullable = false, length = 500)
    private String storageKey;

    @Column(name = "artifact_sha256", nullable = false, length = 64)
    private String artifactSha256;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Column(name = "validation_message", length = 2000)
    private String validationMessage;
}