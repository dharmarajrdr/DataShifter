package com.datashifter.adapter.postgres.writer;

import com.datashifter.adapter.sdk.AdapterConfig;
import com.datashifter.adapter.sdk.DataRecord;
import com.datashifter.adapter.sdk.DataWriter;
import com.datashifter.adapter.sdk.RecordOperation;
import com.datashifter.adapter.sdk.WriteMode;
import com.datashifter.adapter.sdk.WriteResult;
import com.datashifter.adapter.sdk.annotations.AdapterConfigProperty;
import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.adapter.sdk.annotations.DataShifterAdapter;
import lombok.extern.slf4j.Slf4j;

import java.sql.BatchUpdateException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/**
 * High-throughput batch and streaming writer adapter for PostgreSQL.
 */
@DataShifterAdapter(
        id = "postgres-writer",
        name = "PostgreSQL Writer",
        description = "High-throughput batch and streaming writer for PostgreSQL with ON CONFLICT UPSERT support",
        type = AdapterType.WRITER,
        mode = AdapterMode.BOTH,
        category = "database",
        version = "1.0.0"
)
@AdapterConfigProperty(name = "connectionId", label = "Saved Connection", type = "connection", description = "Reference to a configured database connection")
@AdapterConfigProperty(name = "host", label = "Host", type = "string", defaultValue = "localhost")
@AdapterConfigProperty(name = "port", label = "Port", type = "number", defaultValue = "5432")
@AdapterConfigProperty(name = "databaseName", label = "Database Name", type = "string", required = true)
@AdapterConfigProperty(name = "schemaName", label = "Schema", type = "string", defaultValue = "public")
@AdapterConfigProperty(name = "username", label = "Username", type = "string", required = true)
@AdapterConfigProperty(name = "password", label = "Password", type = "password", required = true)
@AdapterConfigProperty(name = "maxPoolSize", label = "Connection Pool Size", type = "number", defaultValue = "10")
@Slf4j
public class PostgresWriter implements DataWriter {

    private final PostgresWriterConnectionHelper connectionHelper = new PostgresWriterConnectionHelper();
    private final PostgresSqlBuilder sqlBuilder = new PostgresSqlBuilder();
    private boolean initialized = false;

    @Override
    public synchronized void init(AdapterConfig config) throws Exception {
        if (!initialized) {
            connectionHelper.init(config);
            initialized = true;
            log.info("Initialized PostgresWriter adapter");
        }
    }

    private Connection acquireConnection(AdapterConfig config) throws Exception {
        if (!initialized) {
            init(config);
        }
        return connectionHelper.getConnection();
    }

    @Override
    public WriteResult writeBatch(AdapterConfig config,
                                  String targetTable,
                                  List<DataRecord> records,
                                  WriteMode writeMode,
                                  String primaryKeyColumn) throws Exception {
        if (records == null || records.isEmpty()) {
            return WriteResult.empty();
        }

        String fullTable = qualifyTable(config, targetTable);
        List<String> columns = new ArrayList<>(records.get(0).getData().keySet());
        String sql = sqlBuilder.buildWriteSql(fullTable, columns, writeMode, primaryKeyColumn);

        List<WriteResult.FailedRecord> failedRecords = new ArrayList<>();
        int successCount = 0;

        try (Connection conn = acquireConnection(config);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            conn.setAutoCommit(false);

            for (DataRecord record : records) {
                sqlBuilder.bindRecord(ps, record, columns, writeMode, primaryKeyColumn);
                ps.addBatch();
            }

            try {
                int[] results = ps.executeBatch();
                conn.commit();
                successCount = records.size();

                for (int i = 0; i < results.length; i++) {
                    if (results[i] == Statement.EXECUTE_FAILED) {
                        successCount--;
                        failedRecords.add(new WriteResult.FailedRecord(
                                records.get(i), "Row " + i + " failed in PostgreSQL batch", "BATCH_ITEM_FAILED"));
                    }
                }
            } catch (BatchUpdateException bue) {
                conn.rollback();
                log.warn("Batch write encountered exception on table {}, executing row-by-row fallback: {}",
                        fullTable, bue.getMessage());
                return executeRowByRowFallback(conn, sql, records, columns, writeMode, primaryKeyColumn);
            } catch (SQLException e) {
                conn.rollback();
                log.error("Batch write failed on PostgreSQL table {}, executing row-by-row fallback", fullTable, e);
                return executeRowByRowFallback(conn, sql, records, columns, writeMode, primaryKeyColumn);
            }
        }

        return WriteResult.builder()
                .totalRecords(records.size())
                .successCount(successCount)
                .failureCount(failedRecords.size())
                .failedRecords(failedRecords)
                .build();
    }

    private WriteResult executeRowByRowFallback(Connection conn, String sql, List<DataRecord> records,
                                                List<String> columns, WriteMode writeMode, String pkColumn) {
        int successes = 0;
        List<WriteResult.FailedRecord> failed = new ArrayList<>();

        for (int i = 0; i < records.size(); i++) {
            DataRecord record = records.get(i);
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                sqlBuilder.bindRecord(ps, record, columns, writeMode, pkColumn);
                ps.executeUpdate();
                conn.commit();
                successes++;
            } catch (SQLException ex) {
                try { conn.rollback(); } catch (SQLException ignored) {}
                failed.add(new WriteResult.FailedRecord(record, ex.getMessage(), "ROW_WRITE_ERROR"));
            }
        }

        return WriteResult.builder()
                .totalRecords(records.size())
                .successCount(successes)
                .failureCount(failed.size())
                .failedRecords(failed)
                .build();
    }

    @Override
    public WriteResult applyBatch(AdapterConfig config,
                                  String targetTable,
                                  List<DataRecord> records,
                                  String primaryKeyColumn) throws Exception {
        if (records == null || records.isEmpty()) {
            return WriteResult.empty();
        }

        String fullTable = qualifyTable(config, targetTable);
        List<DataRecord> upsertRecords = new ArrayList<>();
        List<DataRecord> deleteRecords = new ArrayList<>();

        for (DataRecord record : records) {
            if (record.getOperation() == RecordOperation.DELETE) {
                deleteRecords.add(record);
            } else {
                upsertRecords.add(record);
            }
        }

        int totalSuccess = 0;
        List<WriteResult.FailedRecord> allFailed = new ArrayList<>();

        if (!upsertRecords.isEmpty()) {
            WriteResult upsertResult = writeBatch(config, targetTable, upsertRecords, WriteMode.UPSERT, primaryKeyColumn);
            totalSuccess += upsertResult.getSuccessCount();
            allFailed.addAll(upsertResult.getFailedRecords());
        }

        if (!deleteRecords.isEmpty() && primaryKeyColumn != null) {
            String deleteSql = sqlBuilder.buildDeleteSql(fullTable, primaryKeyColumn);
            try (Connection conn = acquireConnection(config);
                 PreparedStatement ps = conn.prepareStatement(deleteSql)) {
                conn.setAutoCommit(false);
                for (DataRecord record : deleteRecords) {
                    Object pkVal = record.getField(primaryKeyColumn);
                    if (pkVal == null && record.getBeforeData() != null) {
                        pkVal = record.getBeforeData().get(primaryKeyColumn);
                    }
                    ps.setObject(1, pkVal);
                    ps.addBatch();
                }
                ps.executeBatch();
                conn.commit();
                totalSuccess += deleteRecords.size();
            } catch (SQLException e) {
                log.error("Failed to apply delete CDC batch on PostgreSQL table {}", fullTable, e);
                for (DataRecord d : deleteRecords) {
                    allFailed.add(new WriteResult.FailedRecord(d, e.getMessage(), "CDC_DELETE_FAILED"));
                }
            }
        }

        return WriteResult.builder()
                .totalRecords(records.size())
                .successCount(totalSuccess)
                .failureCount(allFailed.size())
                .failedRecords(allFailed)
                .build();
    }

    private String qualifyTable(AdapterConfig config, String targetTable) {
        if (targetTable.contains(".")) {
            return targetTable;
        }
        String schema = config.getString("schemaName", "public");
        return schema.isBlank() ? "\"" + targetTable + "\"" : "\"" + schema + "\".\"" + targetTable + "\"";
    }

    @Override
    public void close() throws Exception {
        connectionHelper.close();
    }
}
