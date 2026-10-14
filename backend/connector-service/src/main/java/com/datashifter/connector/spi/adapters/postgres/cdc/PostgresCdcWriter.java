package com.datashifter.connector.spi.adapters.postgres.cdc;

import com.datashifter.common.cdc.CdcEvent;
import com.datashifter.common.cdc.CdcWriteResult;
import com.datashifter.common.enums.CdcOperationType;
import com.datashifter.common.enums.DatabaseType;
import com.datashifter.connector.spi.adapters.postgres.ConnectionPoolManager;
import com.datashifter.connector.spi.interfaces.CdcTargetWriter;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.*;

/**
 * High-throughput idempotent target writer for PostgreSQL.
 * Translates CDC mutation events into idempotent SQL:
 * - INSERT/UPDATE -> INSERT ... ON CONFLICT (pk) DO UPDATE SET ...
 * - DELETE        -> DELETE FROM target WHERE pk = ?
 * - TRUNCATE      -> TRUNCATE TABLE target CASCADE
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class PostgresCdcWriter implements CdcTargetWriter {

    private final ConnectionPoolManager poolManager;

    @Override
    public DatabaseType getSupportedType() {
        return DatabaseType.POSTGRESQL;
    }

    @Override
    public CdcWriteResult applyBatch(ConnectionConfig config,
                                     String targetTable,
                                     List<CdcEvent> events,
                                     String primaryKeyColumn) {
        if (events == null || events.isEmpty()) {
            return CdcWriteResult.builder().totalEvents(0).build();
        }

        int appliedInserts = 0;
        int appliedUpdates = 0;
        int appliedDeletes = 0;
        int failureCount = 0;
        List<CdcWriteResult.CdcFailedRecord> failedRecords = new ArrayList<>();

        try (Connection conn = poolManager.getConnection(config)) {
            conn.setAutoCommit(false);

            for (CdcEvent event : events) {
                if (event.isTransactionBoundary()) {
                    continue;
                }

                try {
                    CdcOperationType op = event.getOperationType();
                    if (op == CdcOperationType.INSERT || op == CdcOperationType.UPDATE) {
                        applyUpsert(conn, targetTable, event, primaryKeyColumn);
                        if (op == CdcOperationType.INSERT) {
                            appliedInserts++;
                        } else {
                            appliedUpdates++;
                        }
                    } else if (op == CdcOperationType.DELETE) {
                        applyDelete(conn, targetTable, event, primaryKeyColumn);
                        appliedDeletes++;
                    } else if (op == CdcOperationType.TRUNCATE) {
                        applyTruncate(conn, targetTable);
                    }
                } catch (Exception e) {
                    failureCount++;
                    log.error("Failed to apply CDC event {} to table {}: {}", event.getEventId(), targetTable, e.getMessage());
                    failedRecords.add(CdcWriteResult.CdcFailedRecord.builder()
                            .event(event)
                            .errorType(e.getClass().getSimpleName())
                            .errorMessage(e.getMessage())
                            .build());

                    if (Boolean.FALSE.equals(config.getIgnoreExceptions())) {
                        conn.rollback();
                        throw new RuntimeException("CDC write aborted due to target error on " + targetTable, e);
                    }
                }
            }

            conn.commit();

        } catch (SQLException e) {
            log.error("SQL error applying CDC batch to {}: {}", targetTable, e.getMessage());
            throw new RuntimeException("PostgreSQL CDC batch write failed: " + e.getMessage(), e);
        }

        return CdcWriteResult.builder()
                .totalEvents(events.size())
                .appliedInserts(appliedInserts)
                .appliedUpdates(appliedUpdates)
                .appliedDeletes(appliedDeletes)
                .failureCount(failureCount)
                .failedRecords(failedRecords)
                .build();
    }

    private void applyUpsert(Connection conn, String targetTable, CdcEvent event, String pkCol) throws SQLException {
        Map<String, Object> data = event.getAfterData();
        if (data == null || data.isEmpty()) {
            return;
        }

        String effectivePk = resolvePrimaryKeyColumn(event, pkCol);
        List<String> columns = new ArrayList<>(data.keySet());

        StringBuilder sql = new StringBuilder();
        sql.append("INSERT INTO ").append(targetTable).append(" (");
        for (int i = 0; i < columns.size(); i++) {
            if (i > 0) sql.append(", ");
            sql.append("\"").append(columns.get(i)).append("\"");
        }
        sql.append(") VALUES (");
        for (int i = 0; i < columns.size(); i++) {
            if (i > 0) sql.append(", ");
            sql.append("?");
        }
        sql.append(")");

        if (effectivePk != null && !effectivePk.isBlank() && data.containsKey(effectivePk)) {
            sql.append(" ON CONFLICT (\"").append(effectivePk).append("\") DO UPDATE SET ");
            boolean firstUpdateCol = true;
            for (String col : columns) {
                if (!col.equalsIgnoreCase(effectivePk)) {
                    if (!firstUpdateCol) sql.append(", ");
                    sql.append("\"").append(col).append("\" = EXCLUDED.\"").append(col).append("\"");
                    firstUpdateCol = false;
                }
            }
            if (firstUpdateCol) {
                // All columns are primary key -> do nothing on conflict
                sql.append(" ON CONFLICT DO NOTHING");
            }
        }

        try (PreparedStatement stmt = conn.prepareStatement(sql.toString())) {
            for (int i = 0; i < columns.size(); i++) {
                stmt.setObject(i + 1, data.get(columns.get(i)));
            }
            stmt.executeUpdate();
        }
    }

    private void applyDelete(Connection conn, String targetTable, CdcEvent event, String pkCol) throws SQLException {
        String effectivePk = resolvePrimaryKeyColumn(event, pkCol);
        Object pkVal = resolvePrimaryKeyValue(event, effectivePk);

        if (effectivePk == null || pkVal == null) {
            log.warn("Cannot apply DELETE on {}: primary key missing from CDC event {}", targetTable, event.getEventId());
            return;
        }

        String sql = "DELETE FROM " + targetTable + " WHERE \"" + effectivePk + "\" = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setObject(1, pkVal);
            stmt.executeUpdate();
        }
    }

    private void applyTruncate(Connection conn, String targetTable) throws SQLException {
        String sql = "TRUNCATE TABLE " + targetTable + " CASCADE";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.executeUpdate();
        }
    }

    private String resolvePrimaryKeyColumn(CdcEvent event, String fallbackPk) {
        if (event.getPrimaryKeyValues() != null && !event.getPrimaryKeyValues().isEmpty()) {
            return event.getPrimaryKeyValues().keySet().iterator().next();
        }
        return fallbackPk;
    }

    private Object resolvePrimaryKeyValue(CdcEvent event, String pkCol) {
        if (event.getPrimaryKeyValues() != null && pkCol != null && event.getPrimaryKeyValues().containsKey(pkCol)) {
            return event.getPrimaryKeyValues().get(pkCol);
        }
        if (event.getBeforeData() != null && pkCol != null && event.getBeforeData().containsKey(pkCol)) {
            return event.getBeforeData().get(pkCol);
        }
        if (event.getAfterData() != null && pkCol != null && event.getAfterData().containsKey(pkCol)) {
            return event.getAfterData().get(pkCol);
        }
        return null;
    }
}
