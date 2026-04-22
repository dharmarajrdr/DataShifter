package com.datashifter.common.models;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "column_mappings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ColumnMapping extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_table_mapping_id", nullable = false)
    private TargetTableMapping targetTableMapping;

    /** Null for target-only mappings (e.g., CURRENT_TIMESTAMP with no source) */
    @Column(name = "source_column")
    private String sourceColumn;

    @Column(name = "source_type", length = 50)
    private String sourceType;

    @Column(name = "target_column", nullable = false)
    private String targetColumn;

    @Column(name = "target_type", length = 50)
    private String targetType;

    @Column(name = "mapping_order", nullable = false)
    private Integer mappingOrder;

    /** Default value for unmapped target columns (M < N scenario) */
    @Column(name = "default_value")
    private String defaultValue;

    /** Chained transformation functions applied in order */
    @OneToMany(mappedBy = "columnMapping", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("executionOrder ASC")
    @Builder.Default
    private Set<Transformation> transformations = new LinkedHashSet<>();
}