package com.datashifter.connector.spi.adapters.oracle.cdc;

import com.datashifter.common.enums.CdcOperationType;
import lombok.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Raw parsed record extracted from an Oracle GoldenGate trail file.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class OracleTrailRecord {

    /** Trail file name where this record originated */
    private String sourceFile;

    /** Relative Byte Address (RBA) / byte offset in the trail file */
    private long rba;

    /** Record length in bytes */
    private int recordLength;

    /** Oracle System Change Number (SCN) */
    private long scn;

    /** Operation code (e.g. 3=INSERT, 5=UPDATE, 15=DELETE, 1=COMMIT) */
    private int opCode;

    /** Canonical operation type */
    private CdcOperationType operationType;

    /** Source schema/owner name */
    private String schemaName;

    /** Source table name */
    private String tableName;

    /** Transaction ID (XID) e.g. "0001.002.000034" */
    private String transactionId;

    /** Commit or change timestamp */
    private Instant timestamp;

    /** Primary key columns and values if available */
    @Builder.Default
    private Map<String, Object> primaryKeyValues = new LinkedHashMap<>();

    /** Column values before modification (for UPDATE and DELETE) */
    @Builder.Default
    private Map<String, Object> beforeColumns = new LinkedHashMap<>();

    /** Column values after modification (for INSERT and UPDATE) */
    @Builder.Default
    private Map<String, Object> afterColumns = new LinkedHashMap<>();

    /** Flag indicating record was filtered out at the byte header level */
    @Builder.Default
    private boolean filtered = false;

    /** Is this record a transaction boundary marker (COMMIT or BEGIN)? */
    public boolean isTransactionBoundary() {
        return opCode == OracleTrailConstants.OP_COMMIT || opCode == OracleTrailConstants.OP_BEGIN;
    }

    public boolean isCommit() {
        return opCode == OracleTrailConstants.OP_COMMIT;
    }

    public boolean isBegin() {
        return opCode == OracleTrailConstants.OP_BEGIN;
    }
}
