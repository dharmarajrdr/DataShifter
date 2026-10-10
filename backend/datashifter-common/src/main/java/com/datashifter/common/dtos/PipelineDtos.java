package com.datashifter.common.dtos;

import com.datashifter.common.enums.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;
import java.util.List;

public class PipelineDtos {
    private PipelineDtos() {}

    /* ---------- Pipeline CRUD ---------- */

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreatePipelineRequest {
        @NotBlank private String name;
        private String description;
        private String namespaceId;
        @NotBlank private String sourceConnectionId;
        @NotBlank private String targetConnectionId;
        private Integer chunkSize;
        private WriteMode defaultWriteMode;
        private Boolean ignoreExceptions;
        private Integer maxErrorThreshold;
        private Boolean logSourceRow;
 
        /** Source tables with execution order */
        private List<PipelineTableRequest> tables;
 
        /** Selected target table names — creates empty TargetTableMapping entries for each source→target pair */
        private List<String> targetTables;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdatePipelineRequest {
        private String name;
        private String description;
        private Integer chunkSize;
        private WriteMode defaultWriteMode;
        private Boolean ignoreExceptions;
        private Integer maxErrorThreshold;
        private Boolean logSourceRow;
        private Integer sourcePoolSize;
        private Integer targetPoolSize;
        private Boolean previewInflightRecords;
        /** Per-table write mode overrides: list of {targetTableMappingId, writeMode} */
        private List<TableWriteModeOverride> tableWriteModeOverrides;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TableWriteModeOverride {
        private String targetTableMappingId;
        private WriteMode writeMode;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AddTablePairRequest {
        @NotBlank private String sourceTable;
        @NotBlank private String targetTable;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PipelineResponse {
        private String id;
        private String name;
        private String description;
        private String sourceConnectionId;
        private String targetConnectionId;
        private PipelineStatus status;
        private Integer chunkSize;
        private WriteMode defaultWriteMode;
        private Boolean ignoreExceptions;
        private Integer maxErrorThreshold;
        private Boolean logSourceRow;
        private Integer sourcePoolSize;
        private Integer targetPoolSize;
        private Boolean previewInflightRecords;
        private List<PipelineTableResponse> tables;
        private List<String> validationErrors;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PipelineSummaryResponse {
        private String id;
        private String name;
        private String namespaceId;
        private String namespaceName;
        private String sourceConnectionId;
        private String targetConnectionId;
        private String sourceName;
        private String targetName;
        private PipelineStatus status;
        private List<String> validationErrors;
        private int tableCount;
        private double progress;
        private long rowsProcessed;
        private long totalRows;
        private Instant createdAt;

        /** Pipeline creator/owner — populated from auth context in Phase 2 */
        private String ownerName;
        private String ownerInitials;
        private String ownerColor;
    }

    /* ---------- Pipeline Tables ---------- */

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PipelineTableRequest {
        @NotBlank private String sourceTable;
        @NotNull  private Integer executionOrder;
        private TableMappingType mappingType;
        private List<TargetTableMappingRequest> targetMappings;
        private List<FilterRequest> filters;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PipelineTableResponse {
        private String id;
        private String sourceTable;
        private Integer executionOrder;
        private TableMappingType mappingType;
        private List<TargetTableMappingResponse> targetMappings;
        private List<FilterResponse> filters;
    }

    /* ---------- Target Table Mappings ---------- */

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TargetTableMappingRequest {
        @NotBlank private String targetTable;
        private WriteMode writeMode;
        private List<ColumnMappingRequest> columnMappings;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TargetTableMappingResponse {
        private String id;
        private String targetTable;
        private WriteMode writeMode;
        private List<ColumnMappingResponse> columnMappings;
    }

    /* ---------- Column Mappings ---------- */

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ColumnMappingRequest {
        /** Null for target-only mappings (e.g., CURRENT_TIMESTAMP, DEFAULT_IF_NULL) */
        private String sourceColumn;
        private String sourceType;
        @NotBlank private String targetColumn;
        private String targetType;
        private Integer mappingOrder;
        private String defaultValue;
        private List<TransformationRequest> transformations;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ColumnMappingResponse {
        private String id;
        private String sourceColumn;
        private String sourceType;
        private String targetColumn;
        private String targetType;
        private Integer mappingOrder;
        private String defaultValue;
        private List<TransformationResponse> transformations;
    }

    /* ---------- Transformations ---------- */

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TransformationRequest {
        @NotNull private TransformFunction functionName;
        private String arguments;
        private Integer executionOrder;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TransformationResponse {
        private String id;
        private TransformFunction functionName;
        private String arguments;
        private Integer executionOrder;
    }

    /* ---------- Filters ---------- */

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class FilterRequest {
        @NotBlank private String columnName;
        @NotNull  private FilterOperator operator;
        private String value;
        private LogicalOperator logicalOperator;
        private Integer filterOrder;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class FilterResponse {
        private String id;
        private String columnName;
        private FilterOperator operator;
        private String value;
        private LogicalOperator logicalOperator;
        private Integer filterOrder;
    }

    /* ---------- Pipeline Actions ---------- */

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PipelineActionRequest {
        @NotNull private PipelineAction action;
    }

    public enum PipelineAction {
        START, PAUSE, RESUME, STOP, VALIDATE
    }
}