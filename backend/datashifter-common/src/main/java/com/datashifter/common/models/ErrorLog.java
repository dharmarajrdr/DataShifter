package com.datashifter.common.models;

import com.datashifter.common.enums.ErrorType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "error_logs", indexes = {
    @Index(name = "idx_error_pipeline", columnList = "pipeline_id"),
    @Index(name = "idx_error_type", columnList = "error_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ErrorLog extends BaseEntity {

    @Column(name = "pipeline_id", nullable = false, length = 36)
    private String pipelineId;

    @Column(name = "execution_log_id", length = 36)
    private String executionLogId;

    @Enumerated(EnumType.STRING)
    @Column(name = "error_type", nullable = false, length = 30)
    private ErrorType errorType;

    @Column(name = "source_table", nullable = false)
    private String sourceTable;

    @Column(name = "target_table", nullable = false)
    private String targetTable;

    @Column(name = "chunk_number")
    private Long chunkNumber;

    @Column(name = "row_number")
    private Long rowNumber;

    @Column(name = "error_message", nullable = false, columnDefinition = "TEXT")
    private String errorMessage;

    /** Full source row data as JSON string — only stored when logSourceRow is enabled */
    @Column(name = "source_row_data", columnDefinition = "TEXT")
    private String sourceRowData;
}