package com.datashifter.pipeline.validation.datatype;

import com.datashifter.common.enums.DatabaseType;

/**
 * Strategy interface for mapping database-specific SQL data types to
 * vendor-neutral {@link CanonicalDataType} families and defining
 * dialect-specific compatibility rules.
 *
 * To add support for a new database (e.g., MySQL, SQL Server, Snowflake, Redshift, BigQuery):
 * 1. Implement this interface as a Spring {@code @Component}.
 * 2. Return the corresponding {@link DatabaseType} from {@link #getDatabaseType()}.
 * 3. {@link DatabaseTypeDialectFactory} will auto-register it.
 */
public interface DatabaseTypeDialect {

    /**
     * Returns the database type handled by this dialect.
     */
    DatabaseType getDatabaseType();

    /**
     * Maps a raw database-specific column type name (e.g., "VARCHAR2", "TIMESTAMP(6)", "INT8")
     * to a vendor-neutral {@link CanonicalDataType}.
     */
    CanonicalDataType resolveCanonicalType(String rawDbType);

    /**
     * Indicates whether a column of the given canonical/raw type in this database
     * can represent a boolean value (e.g., Oracle NUMBER(1) or CHAR(1)).
     */
    default boolean canRepresentBoolean(CanonicalDataType canonicalType, String rawDbType) {
        return canonicalType == CanonicalDataType.BOOLEAN;
    }

    /**
     * Normalizes a raw database type string by trimming, uppercasing, and removing
     * parenthesized length/precision/scale specifiers (e.g., "TIMESTAMP(6) WITH TIME ZONE"
     * becomes "TIMESTAMP WITH TIME ZONE").
     */
    default String normalizeRawType(String rawDbType) {
        if (rawDbType == null || rawDbType.isBlank()) {
            return "";
        }
        return rawDbType
                .trim()
                .toUpperCase()
                .replaceAll("\\s*\\([^)]*\\)", "")
                .replaceAll("\\s+", " ")
                .trim();
    }
}

