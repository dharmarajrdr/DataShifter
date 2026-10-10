package com.datashifter.execution.strategies.writers;

import com.datashifter.common.enums.WriteMode;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.datashifter.connector.spi.interfaces.DatabaseConnector;
import com.datashifter.connector.spi.interfaces.WriteResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * INSERT_ONLY — inserts all records. Fails on PK conflict.
 *
 * Use when:
 *   - Loading into an empty target table
 *   - PK duplicates should be treated as errors
 *   - Parent tables before child tables (FK order)
 */
@Component
@Slf4j
class InsertOnlyStrategy implements WriteStrategy {

    @Override
    public WriteMode getMode() {
        return WriteMode.INSERT_ONLY;
    }

    @Override
    public WriteResult write(DatabaseConnector connector, ConnectionConfig config,
                              String targetTable, List<Map<String, Object>> records,
                              String pkColumn) {
        log.debug("INSERT_ONLY: writing {} records to {}", records.size(), targetTable);
        WriteResult result = connector.writeBatch(config, targetTable, records, "INSERT_ONLY", pkColumn);

        // Reclassify errors — any duplicate key error is PK_DUPLICATE
        result.getFailedRecords().forEach(f -> {
            String msg = f.getErrorMessage() != null ? f.getErrorMessage().toUpperCase() : "";
            if (msg.contains("UNIQUE") || msg.contains("DUPLICATE") || msg.contains("PRIMARY")
                    || msg.contains("ORA-00001") || msg.contains("ALREADY_EXISTS")) {
                f.setErrorType("PK_DUPLICATE");
            }
        });

        return result;
    }
}

/**
 * INSERT_IGNORE — inserts records. Ignores/skips records on PK or unique key conflicts.
 *
 * Use when:
 *   - Loading into a target table that may already contain some records
 *   - Duplicate PKs should be silently ignored (not treated as errors)
 */
@Component
@Slf4j
class InsertIgnoreStrategy implements WriteStrategy {

    @Override
    public WriteMode getMode() {
        return WriteMode.INSERT_IGNORE;
    }

    @Override
    public WriteResult write(DatabaseConnector connector, ConnectionConfig config,
                              String targetTable, List<Map<String, Object>> records,
                              String pkColumn) {
        log.debug("INSERT_IGNORE: writing {} records to {}", records.size(), targetTable);
        WriteResult result = connector.writeBatch(config, targetTable, records, "INSERT_IGNORE", pkColumn);

        // Filter out duplicate key errors — for INSERT_IGNORE, duplicates are treated as skipped / ignored
        List<WriteResult.FailedRecord> realFailures = result.getFailedRecords().stream()
                .filter(f -> {
                    String msg = f.getErrorMessage() != null ? f.getErrorMessage().toUpperCase() : "";
                    boolean isDuplicate = msg.contains("UNIQUE") || msg.contains("DUPLICATE") || msg.contains("PRIMARY")
                            || msg.contains("ORA-00001") || msg.contains("ALREADY_EXISTS");
                    if (isDuplicate) {
                        log.trace("INSERT_IGNORE: ignored duplicate record on PK/unique key in target {}", targetTable);
                    }
                    return !isDuplicate;
                })
                .collect(Collectors.toList());

        int ignoredDuplicates = result.getFailedRecords().size() - realFailures.size();
        return WriteResult.builder()
                .totalRecords(result.getTotalRecords())
                .successCount(result.getSuccessCount() + ignoredDuplicates)
                .failureCount(realFailures.size())
                .failedRecords(realFailures)
                .build();
    }
}

/**
 * UPSERT — inserts if PK doesn't exist, updates if it does.
 *
 * Use when:
 *   - Target may have partial data from a previous run
 *   - N:1 merges (multiple source tables writing to same target)
 *   - Resume after failure (idempotent — safe to re-run)
 *
 * DB-specific implementation:
 *   Oracle  → MERGE INTO ... WHEN MATCHED THEN UPDATE WHEN NOT MATCHED THEN INSERT
 *   Spanner → InsertOrUpdate mutation
 *   Postgres (future) → INSERT ... ON CONFLICT DO UPDATE
 */
@Component
@Slf4j
class UpsertStrategy implements WriteStrategy {

    @Override
    public WriteMode getMode() {
        return WriteMode.UPSERT;
    }

    @Override
    public WriteResult write(DatabaseConnector connector, ConnectionConfig config,
                              String targetTable, List<Map<String, Object>> records,
                              String pkColumn) {
        log.debug("UPSERT: writing {} records to {}", records.size(), targetTable);
        return connector.writeBatch(config, targetTable, records, "UPSERT", pkColumn);
    }

    @Override
    public void validate(String targetTable, String pkColumn, List<String> targetColumns) {
        if (pkColumn == null || pkColumn.isBlank()) {
            throw new IllegalArgumentException(
                    "UPSERT requires a primary key column on target table: " + targetTable);
        }
        // PK must be in the target column list
        boolean pkPresent = targetColumns.stream()
                .anyMatch(c -> c.equalsIgnoreCase(pkColumn));
        if (!pkPresent) {
            throw new IllegalArgumentException(String.format(
                    "UPSERT requires PK column '%s' to be mapped in target table '%s'. " +
                    "Mapped columns: %s", pkColumn, targetTable, targetColumns));
        }
    }
}

/**
 * UPDATE_ONLY — updates existing records by PK. Skips if PK not found.
 *
 * Use when:
 *   - Target already has all rows, just need to update column values
 *   - Reference/lookup table refresh
 *   - Records that don't exist in target are intentionally skipped (not an error)
 */
@Component
@Slf4j
class UpdateOnlyStrategy implements WriteStrategy {

    @Override
    public WriteMode getMode() {
        return WriteMode.UPDATE_ONLY;
    }

    @Override
    public WriteResult write(DatabaseConnector connector, ConnectionConfig config,
                              String targetTable, List<Map<String, Object>> records,
                              String pkColumn) {
        log.debug("UPDATE_ONLY: writing {} records to {}", records.size(), targetTable);
        WriteResult result = connector.writeBatch(config, targetTable, records, "UPDATE_ONLY", pkColumn);

        // For UPDATE_ONLY, a "not found" is not an error — it's expected
        // Reclassify NOT_FOUND errors as skipped (remove from failures)
        List<WriteResult.FailedRecord> realFailures = result.getFailedRecords().stream()
                .filter(f -> {
                    String msg = f.getErrorMessage() != null ? f.getErrorMessage().toUpperCase() : "";
                    boolean notFound = msg.contains("NOT FOUND") || msg.contains("NO ROWS") || msg.contains("0 ROWS");
                    if (notFound) {
                        log.trace("UPDATE_ONLY: skipped record — PK not found in target");
                    }
                    return !notFound;
                })
                .collect(Collectors.toList());

        int skippedCount = result.getFailedRecords().size() - realFailures.size();
        if (skippedCount > 0) {
            log.debug("UPDATE_ONLY: {} records skipped (PK not in target)", skippedCount);
        }

        return WriteResult.builder()
                .totalRecords(result.getTotalRecords())
                .successCount(result.getSuccessCount() + skippedCount)
                .failureCount(realFailures.size())
                .failedRecords(realFailures)
                .build();
    }

    @Override
    public void validate(String targetTable, String pkColumn, List<String> targetColumns) {
        if (pkColumn == null || pkColumn.isBlank()) {
            throw new IllegalArgumentException(
                    "UPDATE_ONLY requires a primary key column on target table: " + targetTable);
        }
        boolean pkPresent = targetColumns.stream()
                .anyMatch(c -> c.equalsIgnoreCase(pkColumn));
        if (!pkPresent) {
            throw new IllegalArgumentException(String.format(
                    "UPDATE_ONLY requires PK column '%s' to be mapped in target table '%s'.",
                    pkColumn, targetTable));
        }
    }
}