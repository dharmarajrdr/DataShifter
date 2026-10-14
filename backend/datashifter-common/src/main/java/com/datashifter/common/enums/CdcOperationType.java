package com.datashifter.common.enums;

/**
 * Types of database mutations or transaction markers captured in Change Data Capture streams.
 */
public enum CdcOperationType {
    INSERT,
    UPDATE,
    DELETE,
    TRUNCATE,
    BEGIN,
    COMMIT,
    ROLLBACK,
    DDL,
    HEARTBEAT
}
