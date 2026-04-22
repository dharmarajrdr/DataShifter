package com.datashifter.common.events;

import com.datashifter.common.enums.ErrorType;
import com.datashifter.common.enums.PipelineStatus;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * All Kafka event schemas used across services.
 *
 * Topics:
 *   pipeline.jobs          — pipeline-service → execution-engine (job triggers)
 *   pipeline.commands      — pipeline-service → execution-engine (pause/resume/stop)
 *   pipeline.progress      — execution-engine → monitor-service (chunk-level progress)
 *   pipeline.errors        — execution-engine → monitor-service (error events)
 *   pipeline.status        — execution-engine → pipeline-service (state transitions)
 */
public class PipelineEvents {
    private PipelineEvents() {}

    /* ===== pipeline.jobs ===== */

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PipelineJobEvent {
        private String pipelineId;
        private String executionLogId;
        private String action;  // START, RESUME
        private Instant timestamp;
    }

    /* ===== pipeline.commands ===== */

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PipelineCommandEvent {
        private String pipelineId;
        private String command;  // PAUSE, STOP
        private Instant timestamp;
    }

    /* ===== pipeline.progress ===== */

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ProgressEvent {
        private String pipelineId;
        private String executionLogId;
        private String tableName;
        private int tableIndex;
        private int totalTables;
        private long chunkNumber;
        private long rowsProcessedInChunk;
        private long totalRowsProcessed;
        private long totalRowsInTable;
        private double tableProgress;
        private double overallProgress;
        private long rowsPerSec;
        /** Average rows/sec excluding paused time — true throughput */
        private long avgRowsPerSec;
        private Instant timestamp;
        private String eta;
        private List<Map<String, Object>> inflightRecords;
    }

    /* ===== pipeline.errors ===== */

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ErrorEvent {
        private String pipelineId;
        private String executionLogId;
        private ErrorType errorType;
        private String sourceTable;
        private String targetTable;
        private Long chunkNumber;
        private Long rowNumber;
        private String errorMessage;
        private String sourceRowData;
        private boolean pipelineStopped;
        private Instant timestamp;
    }

    /* ===== pipeline.status ===== */

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class StatusChangeEvent {
        private String pipelineId;
        private String executionLogId;
        private PipelineStatus previousStatus;
        private PipelineStatus newStatus;
        private String reason;
        private Instant timestamp;
    }
}