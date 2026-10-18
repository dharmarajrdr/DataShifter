package com.datashifter.adapter.postgres.wal;

import com.datashifter.adapter.sdk.AdapterConfig;
import com.datashifter.adapter.sdk.DataReader;
import com.datashifter.adapter.sdk.DataRecord;
import com.datashifter.adapter.sdk.RecordOperation;
import com.datashifter.adapter.sdk.annotations.AdapterConfigProperty;
import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.adapter.sdk.annotations.DataShifterAdapter;
import lombok.extern.slf4j.Slf4j;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.channels.FileChannel;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * High-throughput Change Data Capture streaming reader for PostgreSQL Write-Ahead Log (WAL) files.
 */
@DataShifterAdapter(
        id = "postgres-wal-reader",
        name = "PostgreSQL WAL CDC Reader",
        description = "High-throughput Change Data Capture streaming reader for PostgreSQL Write-Ahead Log (WAL) files and logical decoding streams",
        type = AdapterType.READER,
        mode = AdapterMode.CDC,
        category = "cdc",
        version = "1.0.0"
)
@AdapterConfigProperty(name = "walDirectory", label = "WAL Directory", type = "string", description = "Directory containing PostgreSQL WAL files", required = true)
@AdapterConfigProperty(name = "filePattern", label = "File Pattern", type = "string", description = "WAL file pattern e.g. ^[0-9A-Fa-f]{24}$", defaultValue = "^[0-9A-Fa-f]{24}$")
@AdapterConfigProperty(name = "startingLsn", label = "Starting LSN", type = "string", description = "PostgreSQL LSN to start reading from e.g. 0/16B3748")
@AdapterConfigProperty(name = "startingFile", label = "Starting WAL File", type = "string", description = "Starting WAL file name")
@AdapterConfigProperty(name = "targetTables", label = "Target Tables", type = "string", description = "Comma-separated list of tables to capture")
@Slf4j
public class PostgresWalReader implements DataReader {

    private final PostgresWalParser parser = new PostgresWalParser();
    private final PostgresTransactionBuffer transactionBuffer = new PostgresTransactionBuffer();

    private PostgresWalSequenceTracker sequenceTracker;
    private Set<String> targetTables = new HashSet<>();
    private RandomAccessFile currentRaf;
    private FileChannel currentChannel;
    private boolean isBinaryFormat;
    private long currentOffset;
    private long currentLsn;
    private String currentLsnFormatted;
    private String currentFileName;
    private final AtomicBoolean isOpen = new AtomicBoolean(false);

    @Override
    public synchronized void init(AdapterConfig config) throws Exception {
        String dir = config.getString("walDirectory", "");
        String pattern = config.getString("filePattern", "^[0-9A-Fa-f]{24}$");
        this.sequenceTracker = new PostgresWalSequenceTracker(dir, pattern);

        String tablesStr = config.getString("targetTables", "");
        if (!tablesStr.isBlank()) {
            for (String t : tablesStr.split(",")) {
                this.targetTables.add(t.trim());
            }
        }

        String startingLsnStr = config.getString("startingLsn", null);
        Long startingLsn = (startingLsnStr != null && !startingLsnStr.isBlank())
                ? PostgresWalConstants.parseLsn(startingLsnStr)
                : null;

        String startingFile = config.getString("startingFile", null);
        File startFile = sequenceTracker.resolveStartingFile(startingFile, startingLsn);

        if (startFile == null) {
            log.warn("PostgreSQL WAL directory is currently empty. Reader will poll for incoming segments.");
            this.isOpen.set(true);
            return;
        }

        openFile(startFile, 0L);
        this.isOpen.set(true);
        log.info("Initialized PostgresWalReader for directory {}", dir);
    }

    @Override
    public synchronized List<DataRecord> poll(int maxRecords, Duration timeout) throws Exception {
        if (!isOpen.get()) {
            throw new IllegalStateException("PostgresWalReader is not initialized or open.");
        }

        List<DataRecord> results = new ArrayList<>();
        long deadline = System.currentTimeMillis() + timeout.toMillis();

        while (results.size() < maxRecords && System.currentTimeMillis() <= deadline) {
            if (currentChannel == null || currentRaf == null) {
                File nextFile = sequenceTracker.advanceToNextFile();
                if (nextFile != null) {
                    openFile(nextFile, 0L);
                } else {
                    Thread.sleep(Math.min(50, Math.max(10, timeout.toMillis())));
                    break;
                }
            }

            PostgresWalRecord rawRecord = isBinaryFormat
                    ? parser.parseNextBinaryRecord(currentChannel, currentFileName, targetTables)
                    : parser.parseNextJsonRecord(currentRaf, currentFileName, targetTables);

            if (rawRecord != null) {
                this.currentOffset = isBinaryFormat ? currentChannel.position() : currentRaf.getFilePointer();
                if (rawRecord.getLsn() > 0) {
                    this.currentLsn = rawRecord.getLsn();
                    this.currentLsnFormatted = rawRecord.getLsnFormatted();
                }

                if (rawRecord.isFiltered()) {
                    continue;
                }

                List<PostgresWalRecord> emitted = transactionBuffer.processRecord(rawRecord);
                for (PostgresWalRecord r : emitted) {
                    DataRecord record = convertToDataRecord(r);
                    if (record != null) {
                        results.add(record);
                        if (results.size() >= maxRecords) {
                            break;
                        }
                    }
                }
            } else {
                File nextFile = sequenceTracker.advanceToNextFile();
                if (nextFile != null) {
                    log.info("Reached end of WAL segment {}. Rotating to: {}", currentFileName, nextFile.getName());
                    closeCurrentFile();
                    openFile(nextFile, 0L);
                } else {
                    long remaining = deadline - System.currentTimeMillis();
                    if (remaining > 0) {
                        Thread.sleep(Math.min(remaining, 50));
                    }
                    break;
                }
            }
        }

        return results;
    }

    @Override
    public synchronized void commitCheckpoint(Map<String, Object> checkpoint) throws Exception {
        if (checkpoint != null) {
            if (checkpoint.containsKey("lsn")) {
                this.currentLsn = ((Number) checkpoint.get("lsn")).longValue();
                this.currentLsnFormatted = PostgresWalConstants.formatLsn(this.currentLsn);
            }
            if (checkpoint.containsKey("lsnFormatted")) {
                this.currentLsnFormatted = (String) checkpoint.get("lsnFormatted");
                this.currentLsn = PostgresWalConstants.parseLsn(this.currentLsnFormatted);
            }
            if (checkpoint.containsKey("offset")) {
                this.currentOffset = ((Number) checkpoint.get("offset")).longValue();
            }
            if (checkpoint.containsKey("sourceFile")) {
                this.currentFileName = (String) checkpoint.get("sourceFile");
            }
            log.debug("Committed PostgreSQL checkpoint: file={}, offset={}, LSN={}", currentFileName, currentOffset, currentLsnFormatted);
        }
    }

    @Override
    public synchronized Map<String, Object> getCurrentPosition() {
        Map<String, Object> pos = new LinkedHashMap<>();
        pos.put("sourceFile", currentFileName);
        pos.put("offset", currentOffset);
        pos.put("lsn", currentLsn);
        pos.put("lsnFormatted", currentLsnFormatted != null ? currentLsnFormatted : PostgresWalConstants.formatLsn(currentLsn));
        pos.put("timestamp", Instant.now().toString());
        return pos;
    }

    @Override
    public synchronized boolean hasNext() {
        if (!isOpen.get()) return false;
        try {
            if (currentChannel != null && currentChannel.position() < currentChannel.size()) {
                return true;
            }
            return sequenceTracker != null && sequenceTracker.refreshFiles().size() > sequenceTracker.getCurrentFileIndex() + 1;
        } catch (IOException e) {
            return false;
        }
    }

    @Override
    public synchronized void close() throws Exception {
        isOpen.set(false);
        closeCurrentFile();
        transactionBuffer.clear();
        log.info("Closed PostgresWalReader");
    }

    private void openFile(File file, long offset) throws IOException {
        closeCurrentFile();
        this.currentFileName = file.getName();
        this.currentRaf = new RandomAccessFile(file, "r");
        this.currentChannel = currentRaf.getChannel();

        PostgresWalHeader header = parser.readHeader(file);
        this.isBinaryFormat = header.isBinaryFormat();

        if (offset > 0 && offset < currentChannel.size()) {
            this.currentOffset = offset;
            if (isBinaryFormat) {
                currentChannel.position(offset);
            } else {
                currentRaf.seek(offset);
            }
        } else {
            this.currentOffset = isBinaryFormat ? header.getHeaderLength() : 0L;
            if (isBinaryFormat) {
                currentChannel.position(currentOffset);
            } else {
                currentRaf.seek(0L);
            }
        }

        if (currentLsn == 0) {
            this.currentLsn = PostgresWalConstants.walFileNameToLsn(currentFileName) + currentOffset;
            this.currentLsnFormatted = PostgresWalConstants.formatLsn(currentLsn);
        }

        log.info("Opened PostgreSQL WAL file: {} (format={}, offset={}, LSN={})",
                currentFileName, isBinaryFormat ? "BINARY" : "JSON", currentOffset, currentLsnFormatted);
    }

    private void closeCurrentFile() {
        try {
            if (currentChannel != null && currentChannel.isOpen()) {
                currentChannel.close();
            }
            if (currentRaf != null) {
                currentRaf.close();
            }
        } catch (IOException ignored) {
        } finally {
            currentChannel = null;
            currentRaf = null;
        }
    }

    private DataRecord convertToDataRecord(PostgresWalRecord r) {
        if (r == null || r.isTransactionBoundary()) {
            return null;
        }

        Map<String, Object> data = r.getOperationType() == RecordOperation.DELETE && (r.getAfterColumns() == null || r.getAfterColumns().isEmpty())
                ? (r.getPrimaryKeyValues() != null && !r.getPrimaryKeyValues().isEmpty() ? r.getPrimaryKeyValues() : r.getBeforeColumns())
                : r.getAfterColumns();

        return DataRecord.builder()
                .operation(r.getOperationType())
                .data(data)
                .beforeData(r.getBeforeColumns())
                .header("lsn", r.getLsn())
                .header("lsnFormatted", r.getLsnFormatted())
                .header("transactionId", r.getTransactionId())
                .header("sourceFile", r.getSourceFile())
                .header("tableName", r.getTableName())
                .header("schemaName", r.getSchemaName())
                .header("timestamp", r.getTimestamp() != null ? r.getTimestamp().toString() : Instant.now().toString())
                .build();
    }
}
