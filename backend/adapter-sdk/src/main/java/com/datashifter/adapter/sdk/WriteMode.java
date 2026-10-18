package com.datashifter.adapter.sdk;

/**
 * Target database write mode strategies.
 */
public enum WriteMode {
    /** Insert or update based on primary key */
    UPSERT,

    /** Strict insert, throws exception on duplicate key */
    INSERT_ONLY,

    /** Update only existing records, ignores missing records */
    UPDATE_ONLY,

    /** Delete and replace existing row */
    REPLACE,

    /** Insert rows, ignoring duplicate key collisions silently */
    INSERT_IGNORE
}
