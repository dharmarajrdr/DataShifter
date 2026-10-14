package com.datashifter.connector.spi.adapters.oracle.cdc;

import com.datashifter.common.cdc.*;
import com.datashifter.common.enums.DatabaseType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.channels.FileChannel;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * High-throughput Change Data Capture source reader for Oracle GoldenGate trail files.
 * Supports binary and JSON trail parsing, SCN/RBA offset tracking, transaction buffering,
 * and continuous file rotation traversal.
 */
@Component
@Slf4j
public class OracleTrailFileReader implements CdcSourceReader {

    private final OracleTrailParser parser;
    private final OracleTransactionBuffer transactionBuffer;

    private CdcReaderConfig config;
    private OracleTrailSequenceTracker sequenceTracker;
    private RandomAccessFile currentRaf;
    private FileChannel currentChannel;
    private boolean isBinaryFormat;
    private long currentRba;
    private long currentScn;
    private String currentFileName;
    private final AtomicBoolean isOpen = new AtomicBoolean(false);

    public OracleTrailFileReader() {
        this.parser = new OracleTrailParser();
        this.transactionBuffer = new OracleTransactionBuffer();
    }

    public OracleTrailFileReader(OracleTrailParser parser, OracleTransactionBuffer transactionBuffer) {
        this.parser = parser;
        this.transactionBuffer = transactionBuffer;
    }

    @Override
    public DatabaseType getSupportedType() {
        return DatabaseType.ORACLE;
    }

    @Override
    public synchronized void open(CdcReaderConfig config) throws Exception {
        this.config = config;
        this.sequenceTracker = new OracleTrailSequenceTracker(config.getDirectoryPath(), config.getFilePattern());

        File startFile = sequenceTracker.resolveStartingFile(config.getStartingPosition());
        if (startFile == null) {
            log.warn("Oracle trail directory is currently empty. Reader will poll for incoming files.");
            this.isOpen.set(true);
            return;
        }

        long startingOffset = 0L;
        if (config.getStartingPosition() != null && config.getStartingPosition().getFileOffset() != null) {
            startingOffset = config.getStartingPosition().getFileOffset();
        }

        openFile(startFile, startingOffset);
        this.isOpen.set(true);
    }

    @Override
    public synchronized List<CdcEvent> poll(int maxEvents, Duration timeout) throws Exception {
        if (!isOpen.get()) {
            throw new IllegalStateException("OracleTrailFileReader is not open.");
        }

        List<CdcEvent> results = new ArrayList<>();
        long deadline = System.currentTimeMillis() + timeout.toMillis();

        while (results.size() < maxEvents && System.currentTimeMillis() <= deadline) {
            // If no file is open, attempt to discover newly arrived trail files
            if (currentChannel == null || currentRaf == null) {
                File nextFile = sequenceTracker.advanceToNextFile();
                if (nextFile != null) {
                    openFile(nextFile, 0L);
                } else {
                    // Backoff briefly before polling directory again
                    Thread.sleep(Math.min(50, Math.max(10, timeout.toMillis())));
                    break;
                }
            }

            OracleTrailRecord rawRecord = null;
            if (isBinaryFormat) {
                rawRecord = parser.parseNextBinaryRecord(currentChannel, currentFileName);
            } else {
                rawRecord = parser.parseNextJsonRecord(currentRaf, currentFileName);
            }

            if (rawRecord != null) {
                this.currentRba = isBinaryFormat ? currentChannel.position() : currentRaf.getFilePointer();
                if (rawRecord.getScn() > 0) {
                    this.currentScn = rawRecord.getScn();
                }

                // Pass to transaction buffer (handles atomicity and commit boundaries)
                List<OracleTrailRecord> emitted = transactionBuffer.processRecord(rawRecord);
                for (OracleTrailRecord r : emitted) {
                    CdcEvent event = convertToCdcEvent(r);
                    if (event != null) {
                        results.add(event);
                        if (results.size() >= maxEvents) {
                            break;
                        }
                    }
                }
            } else {
                // Reached EOF on current file — check if next sequence file has appeared
                File nextFile = sequenceTracker.advanceToNextFile();
                if (nextFile != null) {
                    log.info("Reached end of trail file {}. Rotating to next file: {}", currentFileName, nextFile.getName());
                    closeCurrentFile();
                    openFile(nextFile, 0L);
                } else {
                    // No new file yet; wait briefly for live file appends
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
    public synchronized void commitCheckpoint(CdcPosition position) throws Exception {
        if (position != null) {
            if (position.getScn() != null && position.getScn() > 0) {
                this.currentScn = position.getScn();
            }
            if (position.getFileOffset() != null) {
                this.currentRba = position.getFileOffset();
            }
            if (position.getSourceFile() != null) {
                this.currentFileName = position.getSourceFile();
            }
            log.debug("Committed checkpoint: file={}, RBA={}, SCN={}", currentFileName, currentRba, currentScn);
        }
    }

    @Override
    public synchronized CdcPosition getCurrentPosition() {
        return CdcPosition.builder()
                .sourceFile(currentFileName)
                .fileOffset(currentRba)
                .scn(currentScn)
                .token(currentScn > 0 ? String.valueOf(currentScn) : null)
                .timestamp(Instant.now())
                .build();
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
        log.info("Closed OracleTrailFileReader");
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

        log.info("Opened Oracle trail file '{}' (binary={}) at RBA offset {}", currentFileName, isBinaryFormat, actualOffset);
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

    private CdcEvent convertToCdcEvent(OracleTrailRecord r) {
        if (r == null || r.isTransactionBoundary()) {
            return null;
        }

        String pipelineId = config != null ? config.getPipelineId() : null;

        return CdcEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .pipelineId(pipelineId)
                .sourceDatabaseType(DatabaseType.ORACLE)
                .schemaName(r.getSchemaName())
                .tableName(r.getTableName())
                .operationType(r.getOperationType())
                .transactionId(r.getTransactionId())
                .commitTimestamp(r.getTimestamp() != null ? r.getTimestamp() : Instant.now())
                .primaryKeyValues(r.getPrimaryKeyValues())
                .afterData(r.getAfterColumns())
                .beforeData(r.getBeforeColumns())
                .position(CdcPosition.builder()
                        .sourceFile(r.getSourceFile())
                        .fileOffset(r.getRba())
                        .scn(r.getScn())
                        .token(r.getScn() > 0 ? String.valueOf(r.getScn()) : null)
                        .transactionId(r.getTransactionId())
                        .timestamp(r.getTimestamp())
                        .build())
                .build();
    }
}
