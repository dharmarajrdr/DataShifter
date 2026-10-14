package com.datashifter.adapter.postgres.writer;

import com.datashifter.adapter.sdk.DataRecord;
import com.datashifter.adapter.sdk.WriteMode;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * SQL statement generation and parameter binding utility for PostgreSQL Writer.
 */
public class PostgresSqlBuilder {

    public String buildWriteSql(String fullTable, List<String> columns, WriteMode writeMode, String pkColumn) {
        if (writeMode == null) {
            writeMode = WriteMode.UPSERT;
        }

        return switch (writeMode) {
            case INSERT_ONLY -> buildInsertSql(fullTable, columns);
            case UPDATE_ONLY -> buildUpdateSql(fullTable, columns, pkColumn);
            case INSERT_IGNORE -> buildInsertIgnoreSql(fullTable, columns, pkColumn);
            case REPLACE, UPSERT -> buildUpsertSql(fullTable, columns, pkColumn);
        };
    }

    public String buildInsertSql(String fullTable, List<String> columns) {
        String cols = columns.stream().map(this::quoteIdentifier).collect(Collectors.joining(", "));
        String placeholders = columns.stream().map(c -> "?").collect(Collectors.joining(", "));
        return String.format("INSERT INTO %s (%s) VALUES (%s)", fullTable, cols, placeholders);
    }

    public String buildInsertIgnoreSql(String fullTable, List<String> columns, String pkColumn) {
        String insert = buildInsertSql(fullTable, columns);
        if (pkColumn != null && !pkColumn.isBlank()) {
            return String.format("%s ON CONFLICT (%s) DO NOTHING", insert, quoteIdentifier(pkColumn));
        }
        return insert;
    }

    public String buildUpsertSql(String fullTable, List<String> columns, String pkColumn) {
        if (pkColumn == null || pkColumn.isBlank()) {
            return buildInsertSql(fullTable, columns);
        }

        String insert = buildInsertSql(fullTable, columns);
        List<String> nonPkColumns = columns.stream()
                .filter(c -> !c.equalsIgnoreCase(pkColumn))
                .toList();

        if (nonPkColumns.isEmpty()) {
            return String.format("%s ON CONFLICT (%s) DO NOTHING", insert, quoteIdentifier(pkColumn));
        }

        String updateSet = nonPkColumns.stream()
                .map(c -> String.format("%s = EXCLUDED.%s", quoteIdentifier(c), quoteIdentifier(c)))
                .collect(Collectors.joining(", "));

        return String.format("%s ON CONFLICT (%s) DO UPDATE SET %s", insert, quoteIdentifier(pkColumn), updateSet);
    }

    public String buildUpdateSql(String fullTable, List<String> columns, String pkColumn) {
        if (pkColumn == null || pkColumn.isBlank()) {
            throw new IllegalArgumentException("UPDATE_ONLY write mode requires a primary key column");
        }

        List<String> nonPkColumns = columns.stream()
                .filter(c -> !c.equalsIgnoreCase(pkColumn))
                .toList();

        String setClause = nonPkColumns.stream()
                .map(c -> quoteIdentifier(c) + " = ?")
                .collect(Collectors.joining(", "));

        return String.format("UPDATE %s SET %s WHERE %s = ?", fullTable, setClause, quoteIdentifier(pkColumn));
    }

    public String buildDeleteSql(String fullTable, String pkColumn) {
        return String.format("DELETE FROM %s WHERE %s = ?", fullTable, quoteIdentifier(pkColumn));
    }

    public void bindRecord(PreparedStatement ps, DataRecord record, List<String> columns, WriteMode writeMode, String pkColumn) throws SQLException {
        if (writeMode == WriteMode.UPDATE_ONLY && pkColumn != null) {
            int paramIndex = 1;
            List<String> nonPkColumns = columns.stream().filter(c -> !c.equalsIgnoreCase(pkColumn)).toList();
            for (String col : nonPkColumns) {
                ps.setObject(paramIndex++, record.getField(col));
            }
            ps.setObject(paramIndex, record.getField(pkColumn));
        } else {
            int paramIndex = 1;
            for (String col : columns) {
                ps.setObject(paramIndex++, record.getField(col));
            }
        }
    }

    private String quoteIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return "";
        }
        if (identifier.startsWith("\"") && identifier.endsWith("\"")) {
            return identifier;
        }
        return "\"" + identifier + "\"";
    }
}
