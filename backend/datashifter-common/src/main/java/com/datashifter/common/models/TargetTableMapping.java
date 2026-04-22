package com.datashifter.common.models;

import com.datashifter.common.enums.WriteMode;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "target_table_mappings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TargetTableMapping extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_table_id", nullable = false)
    private PipelineTable pipelineTable;

    @Column(name = "target_table", nullable = false)
    private String targetTable;

    @Enumerated(EnumType.STRING)
    @Column(name = "write_mode", nullable = false, length = 20)
    @Builder.Default
    private WriteMode writeMode = WriteMode.UPSERT;

    /** Column-level mappings from source to this target table */
    @OneToMany(mappedBy = "targetTableMapping", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("mappingOrder ASC")
    @Builder.Default
    private Set<ColumnMapping> columnMappings = new LinkedHashSet<>();
}
