package com.datashifter.pipeline.validation.datatype;

import com.datashifter.common.enums.DatabaseType;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Oracle SQL data type dialect implementation.
 */
@Component
public class OracleTypeDialect implements DatabaseTypeDialect {

    private static final Set<String> NUMERIC_TYPES = Set.of(
            "NUMBER",
            "FLOAT",
            "BINARY_FLOAT",
            "BINARY_DOUBLE",
            "INTEGER",
            "INT",
            "SMALLINT",
            "DEC",
            "DECIMAL",
            "NUMERIC",
            "DOUBLE PRECISION",
            "REAL"
    );

    private static final Set<String> STRING_TYPES = Set.of(
            "VARCHAR2",
            "NVARCHAR2",
            "VARCHAR",
            "CHAR",
            "NCHAR",
            "CLOB",
            "NCLOB",
            "LONG",
            "ROWID",
            "UROWID",
            "XMLTYPE"
    );

    private static final Set<String> DATE_TIME_TYPES = Set.of(
            "DATE",
            "TIMESTAMP",
            "TIMESTAMP WITH TIME ZONE",
            "TIMESTAMP WITH LOCAL TIME ZONE"
    );

    private static final Set<String> BINARY_TYPES = Set.of(
            "BLOB",
            "RAW",
            "LONG RAW",
            "BFILE"
    );

    @Override
    public DatabaseType getDatabaseType() {
        return DatabaseType.ORACLE;
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
        if (DATE_TIME_TYPES.contains(normalized)
                || normalized.startsWith("TIMESTAMP")
                || normalized.startsWith("INTERVAL")) {
            return CanonicalDataType.DATE_TIME;
        }
        if ("BOOLEAN".equals(normalized) || "BOOL".equals(normalized)) {
            return CanonicalDataType.BOOLEAN;
        }
        if ("JSON".equals(normalized)) {
            return CanonicalDataType.JSON;
        }
        if (BINARY_TYPES.contains(normalized)) {
            return CanonicalDataType.BINARY;
        }

        return CanonicalDataType.UNKNOWN;
    }

    /**
     * In Oracle, boolean values are commonly stored as NUMBER(1) or CHAR(1)/VARCHAR2
     * in addition to Oracle 23ai's native BOOLEAN type.
     */
    @Override
    public boolean canRepresentBoolean(CanonicalDataType canonicalType, String rawDbType) {
        if (canonicalType == CanonicalDataType.BOOLEAN
                || canonicalType == CanonicalDataType.NUMERIC) {
            return true;
        }
        String normalized = normalizeRawType(rawDbType);
        return "CHAR".equals(normalized)
                || "NCHAR".equals(normalized)
                || "VARCHAR2".equals(normalized)
                || "NVARCHAR2".equals(normalized)
                || "VARCHAR".equals(normalized);
    }
}

