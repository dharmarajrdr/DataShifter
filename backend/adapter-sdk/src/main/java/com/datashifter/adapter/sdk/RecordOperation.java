package com.datashifter.adapter.sdk;

/**
 * Mutation operation represented by a DataRecord.
 */
public enum RecordOperation {
    /** Snapshot / batch read record */
    READ,

    /** Insert operation */
    INSERT,

    /** Update operation */
    UPDATE,

    /** Delete operation */
    DELETE
}
