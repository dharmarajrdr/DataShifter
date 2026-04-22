package com.datashifter.common.models;

import com.datashifter.common.enums.FilterOperator;
import com.datashifter.common.enums.LogicalOperator;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "filters")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Filter extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_table_id", nullable = false)
    private PipelineTable pipelineTable;

    @Column(name = "column_name", nullable = false)
    private String columnName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FilterOperator operator;

    /** Value to compare against. For IN operator, comma-separated values. Null for IS_NULL/NOT_NULL. */
    @Lob
    @Column
    private String value;

    /** How this filter combines with the next filter in the chain */
    @Enumerated(EnumType.STRING)
    @Column(name = "logical_operator", length = 5)
    @Builder.Default
    private LogicalOperator logicalOperator = LogicalOperator.AND;

    @Column(name = "filter_order", nullable = false)
    private Integer filterOrder;
}
