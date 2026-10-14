package com.datashifter.connector.cdc.segregation;

import com.datashifter.common.enums.FilterOperator;
import com.datashifter.common.enums.LogicalOperator;
import lombok.*;

/**
 * Single predicate condition in a CDC row filter chain.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CdcRowFilterCriterion {

    /** Column name to evaluate */
    private String columnName;

    /** Comparison operator */
    private FilterOperator operator;

    /** Expected comparison value (or comma-separated list for IN/NOT_IN) */
    private String value;

    /** Logical operator combining with the subsequent criterion (default AND) */
    @Builder.Default
    private LogicalOperator logicalOperator = LogicalOperator.AND;

    /** Optional execution order */
    private int order;
}
