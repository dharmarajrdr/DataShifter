package com.datashifter.common.cdc;

import com.datashifter.common.enums.CdcOperationType;
import com.datashifter.common.enums.DatabaseType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

import java.io.Serializable;
import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Canonical Change Data Capture event representation.
 * Standardizes log records across Oracle Trail Files, PostgreSQL WAL, and future log streams.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
@JsonIgnoreProperties(ignoreUnknown = true)
public class CdcEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    /** Unique event identifier */
    private String eventId;

    /** Datashifter Pipeline ID this event is routed to */
    private String pipelineId;

    /** Source Database type (ORACLE, POSTGRESQL, etc.) */
    private DatabaseType sourceDatabaseType;

    /** Source schema/owner name */
    private String schemaName;

    /** Source table name */
    private String tableName;

    /** Operation type: INSERT, UPDATE, DELETE, TRUNCATE, etc. */
    private CdcOperationType operationType;

    /** Position in the log stream (SCN, LSN, file offset) */
    private CdcPosition position;

    /** Transaction ID (XID) */
    private String transactionId;

    /** Commit or change timestamp at source database */
    private Instant commitTimestamp;

    /** Pre-image data: row state before change (populated for UPDATE and DELETE) */
    @Builder.Default
    private Map<String, Object> beforeData = new LinkedHashMap<>();

    /** Post-image data: row state after change (populated for INSERT and UPDATE) */
    @Builder.Default
    private Map<String, Object> afterData = new LinkedHashMap<>();

    /** Primary key column names and their values for targeted upserts/deletes */
    @Builder.Default
    private Map<String, Object> primaryKeyValues = new LinkedHashMap<>();

    /** Extensible metadata */
    @Builder.Default
    private Map<String, Object> metadata = new LinkedHashMap<>();

    /** Ingestion timestamp at Datashifter CDC service */
    @Builder.Default
    private Instant ingestedAt = Instant.now();

    /** Helper to get canonical table identifier "SCHEMA.TABLE" */
    @JsonIgnore
    public String getFullTableName() {
        if (schemaName == null || schemaName.isBlank()) {
            return tableName != null ? tableName.toUpperCase() : "";
        }
        return (schemaName + "." + tableName).toUpperCase();
    }

    @JsonIgnore
    public String computePartitionKey() {
        if (primaryKeyValues != null && !primaryKeyValues.isEmpty()) {
            return getFullTableName() + "#" + primaryKeyValues.toString();
        }
        return getFullTableName();
    }

    @JsonIgnore
    public boolean isTransactionBoundary() {
        return operationType == CdcOperationType.COMMIT || operationType == CdcOperationType.BEGIN;
    }
}
