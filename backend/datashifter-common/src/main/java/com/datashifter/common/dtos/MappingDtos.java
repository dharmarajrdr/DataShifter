package com.datashifter.common.dtos;

import com.datashifter.common.enums.FilterOperator;
import com.datashifter.common.enums.LogicalOperator;
import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.enums.WriteMode;
import com.datashifter.common.enums.TransformFunction;
import lombok.*;

import java.util.List;

/**
 * DTOs for the column mapping API.
 *
 * The GET /mappings endpoint returns pipeline table pairs
 * enriched with live column metadata from source and target connections.
 */
public class MappingDtos {
    private MappingDtos() {}

    /**
     * Full mapping response for a pipeline — contains all table pairs
     * with their column metadata and existing mappings.
     */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MappingResponse {
        private String pipelineId;
        private String pipelineName;
        private String sourceConnectionId;
        private String targetConnectionId;
        private WriteMode defaultWriteMode;
        private PipelineStatus status;
        private List<String> validationErrors;

        /** All table mappings in this pipeline */
        private List<TablePairMapping> tablePairs;
    }

    /**
     * A single source table → target table mapping pair,
     * enriched with column metadata from both databases.
     */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TablePairMapping {
        private String pipelineTableId;
        private String targetTableMappingId;
        private String sourceTable;
        private String targetTable;
        private WriteMode writeMode;
        private int executionOrder;

        /** Live column metadata fetched from source database */
        private List<ColumnInfo> sourceColumns;

        /** Live column metadata fetched from target database */
        private List<ColumnInfo> targetColumns;

        /** Existing column mappings (saved previously) */
        private List<ColumnMappingEntry> mappings;

        /** Existing filters (saved previously) */
        private List<FilterEntry> filters;
    }

    /**
     * Column info — combines name, type, and constraints.
     * Used for both source and target columns.
     */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ColumnInfo {
        private String name;
        private String dataType;
        private boolean nullable;
        private boolean primaryKey;
        private boolean mapped;
    }

    /**
     * A single column-to-column mapping with optional transformations.
     */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ColumnMappingEntry {
        private String id;
        private String sourceColumn;
        private String sourceType;
        private String targetColumn;
        private String targetType;
        private String defaultValue;
        private List<TransformEntry> transforms;
    }

    /**
     * A transformation step applied to a column mapping.
     */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TransformEntry {
        private String id;
        private TransformFunction fn;
        private String args;
        private int order;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class FilterEntry {
        private String id;
        private String columnName;
        private FilterOperator operator;
        private String value;
        private LogicalOperator logicalOperator;
        private int filterOrder;
    }
}