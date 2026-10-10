package com.datashifter.connector.spi.adapters.oracle;

import com.datashifter.common.dtos.ConnectionDtos.*;
import com.datashifter.common.enums.DatabaseType;
import com.datashifter.common.exceptions.ConnectionException;
import com.datashifter.connector.spi.adapters.postgres.ConnectionPoolManager;
import com.datashifter.connector.spi.interfaces.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.sql.*;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class OracleConnector implements DatabaseConnector {

    private final ConnectionPoolManager poolManager;

    @Override
    public DatabaseType getSupportedType() {
        return DatabaseType.ORACLE;
    }

    @Override
    public long testConnection(ConnectionConfig config) {
        long start = System.currentTimeMillis();
        int maxPoolSize = config.getMaxPoolSize() != null ? config.getMaxPoolSize() : 10;
        try (java.sql.Connection conn = poolManager.getConnection(config, maxPoolSize)) {
            conn.createStatement().execute("SELECT 1 FROM DUAL");
        } catch (Exception e) {
            throw new ConnectionException("Oracle connection failed: " + e.getMessage(), e);
        }
        return System.currentTimeMillis() - start;
    }

    @Override
    public List<String> listTables(ConnectionConfig config) {
        List<String> tables = new ArrayList<>();
        String sql = "SELECT table_name FROM all_tables WHERE owner = ? ORDER BY table_name";
        int maxPoolSize = config.getMaxPoolSize() != null ? config.getMaxPoolSize() : 10;
        try (java.sql.Connection conn = poolManager.getConnection(config, maxPoolSize);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, config.getSchemaName().toUpperCase());
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                tables.add(rs.getString("table_name"));
            }
        } catch (Exception e) {
            throw new ConnectionException("Failed to list Oracle tables: " + e.getMessage(), e);
        }
        return tables;
    }

    @Override
    public TableMetadata getTableMetadata(ConnectionConfig config, String tableName) {
        return TableMetadata.builder()
                .tableName(tableName)
                .columns(getColumns(config, tableName))
                .foreignKeys(getForeignKeys(config, tableName))
                .estimatedRowCount(getEstimatedRowCount(config, tableName))
                .build();
    }

    @Override
    public List<ColumnMetadata> getColumns(ConnectionConfig config, String tableName) {
        List<ColumnMetadata> columns = new ArrayList<>();
        String sql = """
            SELECT c.column_name, c.data_type, c.nullable, c.data_length,
                   CASE WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0 END as is_pk
            FROM all_tab_columns c
            LEFT JOIN (
                SELECT cols.column_name FROM all_constraints cons
                JOIN all_cons_columns cols ON cons.constraint_name = cols.constraint_name
                AND cons.owner = cols.owner
                WHERE cons.constraint_type = 'P' AND cons.owner = ? AND cons.table_name = ?
            ) pk ON c.column_name = pk.column_name
            WHERE c.owner = ? AND c.table_name = ?
            ORDER BY c.column_id
            """;
        int maxPoolSize = config.getMaxPoolSize() != null ? config.getMaxPoolSize() : 10;
        try (java.sql.Connection conn = poolManager.getConnection(config, maxPoolSize);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            String schema = config.getSchemaName().toUpperCase();
            String table = tableName.toUpperCase();
            ps.setString(1, schema); ps.setString(2, table);
            ps.setString(3, schema); ps.setString(4, table);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                columns.add(ColumnMetadata.builder()
                        .columnName(rs.getString("column_name"))
                        .dataType(rs.getString("data_type"))
                        .nullable("Y".equals(rs.getString("nullable")))
                        .primaryKey(rs.getInt("is_pk") == 1)
                        .maxLength(rs.getInt("data_length"))
                        .build());
            }
        } catch (Exception e) {
            throw new ConnectionException("Failed to get Oracle columns: " + e.getMessage(), e);
        }
        return columns;
    }

    @Override
    public List<ForeignKeyMetadata> getForeignKeys(ConnectionConfig config, String tableName) {
        List<ForeignKeyMetadata> fks = new ArrayList<>();
        String sql = """
            SELECT a.constraint_name, a.column_name, c_pk.table_name as ref_table, b.column_name as ref_column
            FROM all_cons_columns a
            JOIN all_constraints c ON a.constraint_name = c.constraint_name AND a.owner = c.owner
            JOIN all_constraints c_pk ON c.r_constraint_name = c_pk.constraint_name AND c.r_owner = c_pk.owner
            JOIN all_cons_columns b ON c_pk.constraint_name = b.constraint_name AND c_pk.owner = b.owner
            WHERE c.constraint_type = 'R' AND a.owner = ? AND a.table_name = ?
            """;
        int maxPoolSize = config.getMaxPoolSize() != null ? config.getMaxPoolSize() : 10;
        try (java.sql.Connection conn = poolManager.getConnection(config, maxPoolSize);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, config.getSchemaName().toUpperCase());
            ps.setString(2, tableName.toUpperCase());
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                fks.add(ForeignKeyMetadata.builder()
                        .constraintName(rs.getString("constraint_name"))
                        .columnName(rs.getString("column_name"))
                        .referencedTable(rs.getString("ref_table"))
                        .referencedColumn(rs.getString("ref_column"))
                        .build());
            }
        } catch (Exception e) {
            throw new ConnectionException("Failed to get Oracle FKs: " + e.getMessage(), e);
        }
        return fks;
    }

    @Override
    public long getEstimatedRowCount(ConnectionConfig config, String tableName) {
        String sql = "SELECT num_rows FROM all_tables WHERE owner = ? AND table_name = ?";
        int maxPoolSize = config.getMaxPoolSize() != null ? config.getMaxPoolSize() : 10;
        try (java.sql.Connection conn = poolManager.getConnection(config, maxPoolSize);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, config.getSchemaName().toUpperCase());
            ps.setString(2, tableName.toUpperCase());
            ResultSet rs = ps.executeQuery();
            if (rs.next()) return rs.getLong("num_rows");
        } catch (Exception e) {
            throw new ConnectionException("Failed to get row count: " + e.getMessage(), e);
        }
        return 0;
    }

    @Override
    public String getPrimaryKeyColumn(ConnectionConfig config, String tableName) {
        String sql = """
            SELECT cols.column_name FROM all_constraints cons
            JOIN all_cons_columns cols ON cons.constraint_name = cols.constraint_name AND cons.owner = cols.owner
            WHERE cons.constraint_type = 'P' AND cons.owner = ? AND cons.table_name = ?
            ORDER BY cols.position FETCH FIRST 1 ROW ONLY
            """;
        int maxPoolSize = config.getMaxPoolSize() != null ? config.getMaxPoolSize() : 10;
        try (java.sql.Connection conn = poolManager.getConnection(config, maxPoolSize);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, config.getSchemaName().toUpperCase());
            ps.setString(2, tableName.toUpperCase());
            ResultSet rs = ps.executeQuery();
            if (rs.next()) return rs.getString("column_name");
        } catch (Exception e) {
            throw new ConnectionException("Failed to get PK: " + e.getMessage(), e);
        }
        return null;
    }

    @Override
    public List<Map<String, Object>> readChunk(ConnectionConfig config, String tableName,
                                                String pkColumn, String lastPkValue, int chunkSize) {
        List<Map<String, Object>> records = new ArrayList<>(chunkSize);
        String sql = lastPkValue == null
                ? String.format("SELECT * FROM %s.%s ORDER BY %s FETCH FIRST %d ROWS ONLY",
                    config.getSchemaName(), tableName, pkColumn, chunkSize)
                : String.format("SELECT * FROM %s.%s WHERE %s > ? ORDER BY %s FETCH FIRST %d ROWS ONLY",
                    config.getSchemaName(), tableName, pkColumn, pkColumn, chunkSize);
        int maxPoolSize = config.getMaxPoolSize() != null ? config.getMaxPoolSize() : 10;
        try (java.sql.Connection conn = poolManager.getConnection(config, maxPoolSize);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setFetchSize(Math.min(chunkSize, 5000));
            if (lastPkValue != null) {
                try {
                    ps.setLong(1, Long.parseLong(lastPkValue));
                } catch (NumberFormatException e) {
                    ps.setString(1, lastPkValue);
                }
            }
            ResultSet rs = ps.executeQuery();
            ResultSetMetaData meta = rs.getMetaData();
            int colCount = meta.getColumnCount();
            while (rs.next()) {
                Map<String, Object> row = new LinkedHashMap<>(colCount);
                for (int i = 1; i <= colCount; i++) {
                    row.put(meta.getColumnName(i), rs.getObject(i));
                }
                records.add(row);
            }
        } catch (Exception e) {
            throw new ConnectionException("Failed to read chunk: " + e.getMessage(), e);
        }
        return records;
    }

    @Override
    public WriteResult writeBatch(ConnectionConfig config, String tableName,
                                   List<Map<String, Object>> records, String writeMode,
                                   String pkColumn) {
        if (records == null || records.isEmpty()) {
            return WriteResult.builder().totalRecords(0).successCount(0).failureCount(0).build();
        }

        String fullTable = config.getSchemaName() + "." + tableName;
        Set<String> columnSet = records.get(0).keySet();
        List<String> columns = new ArrayList<>(columnSet);
        String sql = buildWriteSql(fullTable, columns, writeMode, pkColumn);

        int maxPoolSize = config.getMaxPoolSize() != null ? config.getMaxPoolSize() : 10;
        List<WriteResult.FailedRecord> failedRecords = new ArrayList<>();
        int successCount = 0;

        try (java.sql.Connection conn = poolManager.getConnection(config, maxPoolSize);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            conn.setAutoCommit(false);

            for (Map<String, Object> record : records) {
                int idx = 1;
                if ("UPSERT".equals(writeMode)) {
                    for (String col : columns) {
                        ps.setObject(idx++, record.get(col));
                    }
                } else if ("UPDATE_ONLY".equals(writeMode)) {
                    for (String col : columns) {
                        if (!col.equalsIgnoreCase(pkColumn)) ps.setObject(idx++, record.get(col));
                    }
                    ps.setObject(idx++, record.get(pkColumn));
                } else {
                    for (String col : columns) {
                        ps.setObject(idx++, record.get(col));
                    }
                }
                ps.addBatch();
            }

            try {
                int[] results = ps.executeBatch();
                conn.commit();
                successCount = records.size();

                for (int i = 0; i < results.length; i++) {
                    if (results[i] == Statement.EXECUTE_FAILED) {
                        successCount--;
                        failedRecords.add(WriteResult.FailedRecord.builder()
                                .record(records.get(i))
                                .errorMessage("Row " + i + " failed in batch")
                                .errorType("BATCH_ITEM_FAILED")
                                .build());
                    }
                }
            } catch (BatchUpdateException bue) {
                try { conn.commit(); } catch (SQLException commitEx) {
                    try { conn.rollback(); } catch (SQLException ignored) {}
                }

                int[] updateCounts = bue.getUpdateCounts();
                if (updateCounts != null) {
                    for (int i = 0; i < updateCounts.length; i++) {
                        if (updateCounts[i] == Statement.EXECUTE_FAILED) {
                            failedRecords.add(WriteResult.FailedRecord.builder()
                                    .record(i < records.size() ? records.get(i) : Map.of())
                                    .errorMessage(bue.getMessage())
                                    .errorType("BATCH_WRITE_FAILED")
                                    .build());
                        } else {
                            successCount++;
                        }
                    }
                }

                if (successCount == 0 && failedRecords.isEmpty()) {
                    for (Map<String, Object> record : records) {
                        failedRecords.add(WriteResult.FailedRecord.builder()
                                .record(record)
                                .errorMessage(bue.getMessage())
                                .errorType("BATCH_WRITE_FAILED")
                                .build());
                    }
                }
            } catch (Exception e) {
                conn.rollback();
                throw e;
            }
        } catch (Exception e) {
            log.error("Oracle batch write failed: {}", e.getMessage());
            for (Map<String, Object> record : records) {
                failedRecords.add(WriteResult.FailedRecord.builder()
                        .record(record)
                        .errorMessage(e.getMessage())
                        .errorType("WRITE_FAILED")
                        .build());
            }
        }

        return WriteResult.builder()
                .totalRecords(records.size())
                .successCount(successCount)
                .failureCount(failedRecords.size())
                .failedRecords(failedRecords)
                .build();
    }

    private String buildWriteSql(String table, List<String> columns, String writeMode, String pkColumn) {
        String colList = String.join(", ", columns);
        String placeholders = String.join(", ", Collections.nCopies(columns.size(), "?"));
        if ("INSERT_ONLY".equals(writeMode) || "INSERT_IGNORE".equals(writeMode)) {
            return String.format("INSERT INTO %s (%s) VALUES (%s)", table, colList, placeholders);
        }
        if ("UPDATE_ONLY".equals(writeMode)) {
            List<String> setClauses = new ArrayList<>();
            for (String col : columns) {
                if (!col.equalsIgnoreCase(pkColumn)) setClauses.add(col + " = ?");
            }
            return String.format("UPDATE %s SET %s WHERE %s = ?", table, String.join(", ", setClauses), pkColumn);
        }
        // UPSERT — Oracle MERGE
        List<String> selectClauses = new ArrayList<>();
        for (String col : columns) {
            selectClauses.add("? AS " + col);
        }
        List<String> updateClauses = new ArrayList<>();
        for (String col : columns) {
            if (!col.equalsIgnoreCase(pkColumn)) updateClauses.add("t." + col + " = s." + col);
        }
        List<String> sColList = new ArrayList<>();
        for (String col : columns) {
            sColList.add("s." + col);
        }
        return String.format(
            "MERGE INTO %s t USING (SELECT %s FROM DUAL) s ON (t.%s = s.%s) " +
            (updateClauses.isEmpty() ? "" : "WHEN MATCHED THEN UPDATE SET " + String.join(", ", updateClauses) + " ") +
            "WHEN NOT MATCHED THEN INSERT (%s) VALUES (%s)",
            table, String.join(", ", selectClauses), pkColumn, pkColumn,
            colList, String.join(", ", sColList)
        );
    }
}
