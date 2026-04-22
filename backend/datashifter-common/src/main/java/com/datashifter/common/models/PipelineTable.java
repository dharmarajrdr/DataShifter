package com.datashifter.common.models;

import com.datashifter.common.enums.TableMappingType;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "pipeline_tables")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PipelineTable extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_id", nullable = false)
    private Pipeline pipeline;

    @Column(name = "source_table", nullable = false)
    private String sourceTable;

    @Column(name = "execution_order", nullable = false)
    private Integer executionOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "mapping_type", nullable = false, length = 20)
    @Builder.Default
    private TableMappingType mappingType = TableMappingType.ONE_TO_ONE;

    /** Target table mappings — supports 1:1 and 1:N */
    @OneToMany(mappedBy = "pipelineTable", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<TargetTableMapping> targetTableMappings = new LinkedHashSet<>();

    /** Row-level filters on the source table */
    @OneToMany(mappedBy = "pipelineTable", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<Filter> filters = new LinkedHashSet<>();
}
