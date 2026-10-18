package com.datashifter.adapter.postgres.wal;

import com.datashifter.adapter.sdk.RecordOperation;
import lombok.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Raw parsed change record extracted from a PostgreSQL Write-Ahead Log (WAL) segment or logical stream.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class PostgresWalRecord {

    /** WAL segment file name (e.g. "000000010000000000000003") */
    private String sourceFile;

    /** Byte offset within the WAL file */
    private long fileOffset;

    /** Record length in bytes */
    private int recordLength;

    /** 64-bit Log Sequence Number (LSN) */
    private long lsn;

    /** Formatted LSN string (e.g. "0/3D7E5D8") */
    private String lsnFormatted;

    /** Transaction ID (XID) e.g. "12091" */
    private String transactionId;

    /** Resource Manager ID (e.g. RM_HEAP_ID=10, RM_TRANSACTION_ID=1) */
    private int resourceManagerId;

    /** Operation code within the Resource Manager */
    private int opCode;

    /** Canonical CDC operation type (INSERT, UPDATE, DELETE, READ) */
    private RecordOperation operationType;

    /** Schema name (default: "public") */
    @Builder.Default
    private String schemaName = "public";

    /** Target table name */
    private String tableName;

    /** Timestamp of the change */
    private Instant timestamp;

    /** Primary key values if available */
    @Builder.Default
    private Map<String, Object> primaryKeyValues = new LinkedHashMap<>();

    /** Column values before change (for UPDATE and DELETE) */
    @Builder.Default
    private Map<String, Object> beforeColumns = new LinkedHashMap<>();

    /** Column values after change (for INSERT and UPDATE) */
    @Builder.Default
    private Map<String, Object> afterColumns = new LinkedHashMap<>();

    /** True if this record was skipped/filtered out at the parser level */
    private boolean filtered;

    /** Specific raw operation indicator e.g. COMMIT, ABORT, BEGIN */
    private String boundaryType;

    public boolean isCommit() {
        return "COMMIT".equalsIgnoreCase(boundaryType) ||
                (resourceManagerId == PostgresWalConstants.RM_TRANSACTION_ID && opCode == PostgresWalConstants.XLOG_XACT_COMMIT);
    }

    public boolean isAbort() {
        return "ABORT".equalsIgnoreCase(boundaryType) || "ROLLBACK".equalsIgnoreCase(boundaryType) ||
                (resourceManagerId == PostgresWalConstants.RM_TRANSACTION_ID && opCode == PostgresWalConstants.XLOG_XACT_ABORT);
    }

    public boolean isBegin() {
        return "BEGIN".equalsIgnoreCase(boundaryType);
    }

    public boolean isTransactionBoundary() {
        return isCommit() || isAbort() || isBegin();
    }
}
