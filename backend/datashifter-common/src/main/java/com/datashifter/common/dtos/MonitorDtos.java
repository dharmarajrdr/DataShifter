package com.datashifter.common.dtos;

import com.datashifter.common.enums.ErrorType;
import com.datashifter.common.enums.PipelineStatus;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public class MonitorDtos {
    private MonitorDtos() {}

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LiveMonitorResponse {
        private String pipelineId;
        private String pipelineName;
        private PipelineStatus status;
        private long rowsProcessed;
        private long rowsPerSec;
        private long avgRowsPerSec;
        private long errorsSkipped;
        private String eta;
        private double overallProgress;
        private List<TableProgressResponse> tables;
        private List<Map<String, Object>> inflightRecords;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TableProgressResponse {
        private String name;
        private double progress;
        private String status;  // COMPLETED, RUNNING, PENDING
        private long rowsProcessed;
        private long totalRows;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ErrorLogResponse {
        private String id;
        private ErrorType errorType;
        private String sourceTable;
        private String targetTable;
        private Long chunkNumber;
        private Long rowNumber;
        private String errorMessage;
        private String sourceRowData;
        private Instant createdAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ErrorSummaryResponse {
        private long totalErrors;
        private long skipped;
        private long pipelineStopped;
        private String errorRate;
        private String pipelineName;
        private List<ErrorTypeCount> errorsByType;
        private List<ErrorLogResponse> errors;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ErrorTypeCount {
        private ErrorType type;
        private long count;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ExecutionLogResponse {
        private String id;
        private String pipelineId;
        private PipelineStatus status;
        private Instant startedAt;
        private Instant completedAt;
        private long totalRowsProcessed;
        private long totalErrors;
        private Long durationMs;
    }
}