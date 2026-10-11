package com.datashifter.pipeline.validation.datatype;

/**
 * Vendor-neutral canonical data type families used for compile-time
 * cross-database column mapping validation.
 */
public enum CanonicalDataType {
    NUMERIC,
    STRING,
    BOOLEAN,
    DATE_TIME,
    JSON,
    UUID,
    BINARY,
    UNKNOWN
}
