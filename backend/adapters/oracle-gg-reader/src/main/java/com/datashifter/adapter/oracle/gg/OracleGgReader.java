package com.datashifter.adapter.oracle.gg;

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
 * High-throughput Change Data Capture streaming reader for Oracle GoldenGate trail files.
 */
@DataShifterAdapter(
        id = "oracle-gg-reader",
        name = "Oracle GoldenGate CDC Reader",
        description = "High-throughput Change Data Capture streaming reader for Oracle GoldenGate trail files",
        type = AdapterType.READER,
        mode = AdapterMode.CDC,
        category = "cdc",
        version = "1.0.0"
)
@AdapterConfigProperty(name = "trailDirectory", label = "Trail Directory", type = "string", description = "Directory containing GoldenGate trail files", required = true)
@AdapterConfigProperty(name = "filePattern", label = "File Pattern", type = "string", description = "Trail file pattern e.g. aa*", defaultValue = "aa*")
@AdapterConfigProperty(name = "startingScn", label = "Starting SCN", type = "number", description = "Oracle SCN to start reading from")
@AdapterConfigProperty(name = "startingRba", label = "Starting RBA Offset", type = "number", description = "RBA byte offset to resume from")
@AdapterConfigProperty(name = "startingFile", label = "Starting Trail File", type = "string", description = "Starting trail file name e.g. aa000001")
@AdapterConfigProperty(name = "targetTables", label = "Target Tables", type = "string", description = "Comma-separated list of tables to capture")
@Slf4j
public class OracleGgReader implements DataReader {

    private final OracleTrailParser parser = new OracleTrailParser();
    private final OracleTransactionBuffer transactionBuffer = new OracleTransactionBuffer();

    private OracleTrailSequenceTracker sequenceTracker;
    private Set<String> targetTables = new HashSet<>();
    private RandomAccessFile currentRaf;
    private FileChannel currentChannel;
    private boolean isBinaryFormat;
    private long currentRba;
    private long currentScn;
    private String currentFileName;
    private final AtomicBoolean isOpen = new AtomicBoolean(false);

    @Override
    public synchronized void init(AdapterConfig config) throws Exception {
        String dir = config.getString("trailDirectory", "");
        String pattern = config.getString("filePattern", "aa*");
        this.sequenceTracker = new OracleTrailSequenceTracker(dir, pattern);

        String tablesStr = config.getString("targetTables", "");
        if (!tablesStr.isBlank()) {
            for (String t : tablesStr.split(",")) {
                this.targetTables.add(t.trim());
            }
        }

        String startingFile = config.getString("startingFile", null);
        File startFile = sequenceTracker.resolveStartingFile(startingFile);
        if (startFile == null) {
            log.warn("Oracle trail directory is currently empty. Reader will poll for incoming files.");
            this.isOpen.set(true);
            return;
        }

        long startingOffset = config.getLong("startingRba", 0L);
        openFile(startFile, startingOffset);
        this.isOpen.set(true);
        log.info("Initialized OracleGgReader for directory {}", dir);
    }

    @Override
    public synchronized List<DataRecord> poll(int maxRecords, Duration timeout) throws Exception {
        if (!isOpen.get()) {
            throw new IllegalStateException("OracleGgReader is not initialized or open.");
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

            OracleTrailRecord rawRecord = isBinaryFormat
                    ? parser.parseNextBinaryRecord(currentChannel, currentFileName, targetTables)
                    : parser.parseNextJsonRecord(currentRaf, currentFileName, targetTables);

            if (rawRecord != null) {
                this.currentRba = isBinaryFormat ? currentChannel.position() : currentRaf.getFilePointer();
                if (rawRecord.getScn() > 0) {
                    this.currentScn = rawRecord.getScn();
                }

                if (rawRecord.isFiltered()) {
                    continue;
                }

                List<OracleTrailRecord> emitted = transactionBuffer.processRecord(rawRecord);
                for (OracleTrailRecord r : emitted) {
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
                    log.info("Reached end of trail file {}. Rotating to: {}", currentFileName, nextFile.getName());
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
            if (checkpoint.containsKey("scn")) {
                this.currentScn = ((Number) checkpoint.get("scn")).longValue();
            }
            if (checkpoint.containsKey("rba")) {
                this.currentRba = ((Number) checkpoint.get("rba")).longValue();
            }
            if (checkpoint.containsKey("sourceFile")) {
                this.currentFileName = (String) checkpoint.get("sourceFile");
            }
            log.debug("Committed Oracle GG checkpoint: file={}, RBA={}, SCN={}", currentFileName, currentRba, currentScn);
        }
    }

    @Override
    public synchronized Map<String, Object> getCurrentPosition() {
        Map<String, Object> pos = new LinkedHashMap<>();
        pos.put("sourceFile", currentFileName);
        pos.put("rba", currentRba);
        pos.put("scn", currentScn);
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
        log.info("Closed OracleGgReader");
    }

    private void openFile(File file, long offset) throws IOException {
        closeCurrentFile();
        this.currentFileName = file.getName();
        this.currentRaf = new RandomAccessFile(file, "r");
        this.currentChannel = currentRaf.getChannel();

        OracleTrailHeader header = parser.readHeader(file);
        this.isBinaryFormat = header.isBinaryFormat();

        long actualOffset = Math.max(offset, header.getHeaderLength());
        if (actualOffset < currentChannel.size()) {
            currentChannel.position(actualOffset);
            currentRaf.seek(actualOffset);
        }
        this.currentRba = actualOffset;

        log.info("Opened Oracle trail file '{}' (binary={}) at RBA {}", currentFileName, isBinaryFormat, actualOffset);
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

    private DataRecord convertToDataRecord(OracleTrailRecord r) {
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
                .header("scn", r.getScn())
                .header("rba", r.getRba())
                .header("transactionId", r.getTransactionId())
                .header("sourceFile", r.getSourceFile())
                .header("tableName", r.getTableName())
                .header("schemaName", r.getSchemaName())
                .header("timestamp", r.getTimestamp() != null ? r.getTimestamp().toString() : Instant.now().toString())
                .build();
    }
}
