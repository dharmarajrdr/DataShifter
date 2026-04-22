package com.datashifter.common.models;

import com.datashifter.common.enums.PipelineStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "execution_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExecutionLog extends BaseEntity {

    @Column(name = "pipeline_id", nullable = false, length = 36)
    private String pipelineId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PipelineStatus status;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "total_rows_processed")
    @Builder.Default
    private Long totalRowsProcessed = 0L;

    @Column(name = "total_errors")
    @Builder.Default
    private Long totalErrors = 0L;

    @Column(name = "current_table")
    private String currentTable;

    @Column(name = "current_table_index")
    private Integer currentTableIndex;

    /** Duration in milliseconds */
    @Column(name = "duration_ms")
    private Long durationMs;
}
