package com.datashifter.common.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "chunk_cursors", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"pipeline_id", "table_name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChunkCursor extends BaseEntity {

    @Column(name = "pipeline_id", nullable = false, length = 36)
    private String pipelineId;

    @Column(name = "execution_log_id", length = 36)
    private String executionLogId;

    @Column(name = "table_name", nullable = false)
    private String tableName;

    @Column(name = "current_table_index")
    private Integer currentTableIndex;

    @Column(name = "last_committed_chunk")
    @Builder.Default
    private Long lastCommittedChunk = 0L;

    /** Primary key value of the last successfully processed row — for PK-based cursor */
    @Lob
    @Column(name = "last_committed_pk")
    private String lastCommittedPk;

    @Column(name = "rows_processed")
    @Builder.Default
    private Long rowsProcessed = 0L;

    @Column(name = "checkpoint_at")
    private Instant checkpointAt;
}
