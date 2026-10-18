package com.datashifter.adapter.oracle.writer;

import com.datashifter.adapter.sdk.DataRecord;
import com.datashifter.adapter.sdk.WriteMode;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * SQL statement generation and parameter binding utility for Oracle Writer.
 */
public class OracleSqlBuilder {

    public String buildWriteSql(String fullTable, List<String> columns, WriteMode writeMode, String pkColumn) {
        if (writeMode == null) {
            writeMode = WriteMode.UPSERT;
        }

        return switch (writeMode) {
            case INSERT_ONLY -> buildInsertSql(fullTable, columns);
            case UPDATE_ONLY -> buildUpdateSql(fullTable, columns, pkColumn);
            case INSERT_IGNORE -> buildInsertIgnoreSql(fullTable, columns, pkColumn);
            case REPLACE, UPSERT -> buildMergeSql(fullTable, columns, pkColumn);
        };
    }

    public String buildInsertSql(String fullTable, List<String> columns) {
        String colList = String.join(", ", columns);
        String placeholders = columns.stream().map(c -> "?").collect(Collectors.joining(", "));
        return String.format("INSERT INTO %s (%s) VALUES (%s)", fullTable, colList, placeholders);
    }

    public String buildInsertIgnoreSql(String fullTable, List<String> columns, String pkColumn) {
        String colList = String.join(", ", columns);
        String placeholders = columns.stream().map(c -> "?").collect(Collectors.joining(", "));
        if (pkColumn != null && !pkColumn.isBlank()) {
            return String.format("INSERT /*+ IGNORE_ROW_ON_DUPKEY_INDEX(%s(%s)) */ INTO %s (%s) VALUES (%s)",
                    fullTable, pkColumn, fullTable, colList, placeholders);
        }
        return String.format("INSERT INTO %s (%s) VALUES (%s)", fullTable, colList, placeholders);
    }

    public String buildUpdateSql(String fullTable, List<String> columns, String pkColumn) {
        List<String> nonPkColumns = columns.stream()
                .filter(c -> !c.equalsIgnoreCase(pkColumn))
                .toList();

        String setClause = nonPkColumns.stream()
                .map(c -> c + " = ?")
                .collect(Collectors.joining(", "));

        return String.format("UPDATE %s SET %s WHERE %s = ?", fullTable, setClause, pkColumn);
    }

    public String buildMergeSql(String fullTable, List<String> columns, String pkColumn) {
        if (pkColumn == null || pkColumn.isBlank()) {
            return buildInsertSql(fullTable, columns);
        }

        String usingSelect = columns.stream()
                .map(c -> "? AS " + c)
                .collect(Collectors.joining(", "));

        List<String> nonPkColumns = columns.stream()
                .filter(c -> !c.equalsIgnoreCase(pkColumn))
                .toList();

        String updateSet = nonPkColumns.stream()
                .map(c -> String.format("t.%s = s.%s", c, c))
                .collect(Collectors.joining(", "));

        String insertCols = String.join(", ", columns);
        String insertVals = columns.stream().map(c -> "s." + c).collect(Collectors.joining(", "));

        StringBuilder sql = new StringBuilder();
        sql.append(String.format("MERGE INTO %s t ", fullTable));
        sql.append(String.format("USING (SELECT %s FROM DUAL) s ", usingSelect));
        sql.append(String.format("ON (t.%s = s.%s) ", pkColumn, pkColumn));

        if (!nonPkColumns.isEmpty()) {
            sql.append(String.format("WHEN MATCHED THEN UPDATE SET %s ", updateSet));
        }
        sql.append(String.format("WHEN NOT MATCHED THEN INSERT (%s) VALUES (%s)", insertCols, insertVals));

        return sql.toString();
    }

    public String buildDeleteSql(String fullTable, String pkColumn) {
        return String.format("DELETE FROM %s WHERE %s = ?", fullTable, pkColumn);
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
}
