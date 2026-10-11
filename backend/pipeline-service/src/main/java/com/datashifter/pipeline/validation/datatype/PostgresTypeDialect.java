package com.datashifter.pipeline.validation.datatype;

import com.datashifter.common.enums.DatabaseType;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * PostgreSQL data type dialect implementation.
 */
@Component
public class PostgresTypeDialect implements DatabaseTypeDialect {

    private static final Set<String> NUMERIC_TYPES = Set.of(
            "SMALLINT",
            "INTEGER",
            "INT",
            "INT2",
            "INT4",
            "INT8",
            "BIGINT",
            "DECIMAL",
            "NUMERIC",
            "REAL",
            "FLOAT",
            "FLOAT4",
            "FLOAT8",
            "DOUBLE PRECISION",
            "SMALLSERIAL",
            "SERIAL",
            "SERIAL2",
            "SERIAL4",
            "SERIAL8",
            "BIGSERIAL",
            "MONEY",
            "OID"
    );

    private static final Set<String> STRING_TYPES = Set.of(
            "CHARACTER VARYING",
            "VARCHAR",
            "CHARACTER",
            "CHAR",
            "BPCHAR",
            "TEXT",
            "CITEXT",
            "NAME",
            "XML"
    );

    private static final Set<String> BOOLEAN_TYPES = Set.of(
            "BOOLEAN",
            "BOOL",
            "BIT"
    );

    private static final Set<String> DATE_TIME_TYPES = Set.of(
            "DATE",
            "TIMESTAMP",
            "TIMESTAMP WITHOUT TIME ZONE",
            "TIMESTAMP WITH TIME ZONE",
            "TIMESTAMPTZ",
            "TIME",
            "TIME WITHOUT TIME ZONE",
            "TIME WITH TIME ZONE",
            "TIMETZ",
            "INTERVAL"
    );

    private static final Set<String> JSON_TYPES = Set.of(
            "JSON",
            "JSONB"
    );

    private static final Set<String> BINARY_TYPES = Set.of(
            "BYTEA",
            "BIT VARYING",
            "VARBIT"
    );

    @Override
    public DatabaseType getDatabaseType() {
        return DatabaseType.POSTGRESQL;
    }

    @Override
    public CanonicalDataType resolveCanonicalType(String rawDbType) {
        String normalized = normalizeRawType(rawDbType);
        if (normalized.isEmpty()) {
            return CanonicalDataType.UNKNOWN;
        }

        if (NUMERIC_TYPES.contains(normalized)) {
            return CanonicalDataType.NUMERIC;
        }
        if (STRING_TYPES.contains(normalized)) {
            return CanonicalDataType.STRING;
        }
        if (BOOLEAN_TYPES.contains(normalized)) {
            return CanonicalDataType.BOOLEAN;
        }
        if (DATE_TIME_TYPES.contains(normalized)
                || normalized.startsWith("TIMESTAMP")
                || normalized.startsWith("TIME ")
                || normalized.startsWith("INTERVAL")) {
            return CanonicalDataType.DATE_TIME;
        }
        if (JSON_TYPES.contains(normalized)) {
            return CanonicalDataType.JSON;
        }
        if ("UUID".equals(normalized)) {
            return CanonicalDataType.UUID;
        }
        if (BINARY_TYPES.contains(normalized)) {
            return CanonicalDataType.BINARY;
        }

        return CanonicalDataType.UNKNOWN;
    }
}
