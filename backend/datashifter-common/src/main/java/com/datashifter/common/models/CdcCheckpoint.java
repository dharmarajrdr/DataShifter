package com.datashifter.common.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Entity for persisting durable Change Data Capture checkpoints in PostgreSQL.
 * Enables fault-tolerant resume from exact trail file offset / SCN / LSN.
 */
@Entity
@Table(name = "cdc_checkpoints", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"pipeline_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CdcCheckpoint extends BaseEntity {

    @Column(name = "pipeline_id", nullable = false, length = 36)
    private String pipelineId;

    @Column(name = "execution_log_id", length = 36)
    private String executionLogId;

    @Column(name = "source_file", length = 255)
    private String sourceFile;

    @Column(name = "file_offset")
    @Builder.Default
    private Long fileOffset = 0L;

    @Column(name = "last_scn", length = 50)
    private String lastScn;

    @Column(name = "last_lsn", length = 50)
    private String lastLsn;

    @Column(name = "tx_id", length = 100)
    private String txId;

    @Column(name = "events_processed")
    @Builder.Default
    private Long eventsProcessed = 0L;

    @Column(name = "checkpoint_at")
    @Builder.Default
    private Instant checkpointAt = Instant.now();

    @Column(name = "status", length = 20)
    @Builder.Default
    private String status = "ACTIVE";
}
