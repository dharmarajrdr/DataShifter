package com.datashifter.connector.spi.adapters.postgres.cdc;

import com.datashifter.common.cdc.*;
import com.datashifter.common.enums.DatabaseType;
import com.datashifter.connector.cdc.segregation.CdcOperationFilter;
import com.datashifter.connector.cdc.segregation.CdcTableFilter;
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
 * High-throughput Change Data Capture source reader for PostgreSQL Write-Ahead Log (WAL) files.
 * Implements the CdcSourceReader SPI for PostgreSQL, supporting binary WAL parsing,
 * logical decoded JSON streaming, LSN tracking, transaction buffering, and segment rotation.
 */
@Component
@Slf4j
public class PostgresWalFileReader implements CdcSourceReader {

    private final PostgresWalParser parser;
    private final PostgresTransactionBuffer transactionBuffer;

    private CdcReaderConfig config;
    private PostgresWalSequenceTracker sequenceTracker;
    private CdcTableFilter tableFilter;
    private CdcOperationFilter operationFilter;
    private RandomAccessFile currentRaf;
    private FileChannel currentChannel;
    private boolean isBinaryFormat;
    private long currentOffset;
    private long currentLsn;
    private String currentLsnFormatted;
    private String currentFileName;
    private final Queue<CdcEvent> pendingEvents = new ArrayDeque<>();
    private final AtomicBoolean isOpen = new AtomicBoolean(false);

    public PostgresWalFileReader() {
        this.parser = new PostgresWalParser();
        this.transactionBuffer = new PostgresTransactionBuffer();
    }

    public PostgresWalFileReader(PostgresWalParser parser, PostgresTransactionBuffer transactionBuffer) {
        this.parser = parser;
        this.transactionBuffer = transactionBuffer;
    }

    @Override
    public DatabaseType getSupportedType() {
        return DatabaseType.POSTGRESQL;
    }

    @Override
    public synchronized void open(CdcReaderConfig config) throws Exception {
        this.config = config;
        this.sequenceTracker = new PostgresWalSequenceTracker(config.getDirectoryPath(), config.getFilePattern());
        this.tableFilter = CdcTableFilter.of(config.getTargetTableNames());
        this.operationFilter = CdcOperationFilter.of(config.getAllowedOperations());

        File startFile = sequenceTracker.resolveStartingFile(config.getStartingPosition());
        if (startFile == null) {
            log.warn("PostgreSQL WAL directory is currently empty. Reader will poll for incoming segments.");
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
            throw new IllegalStateException("PostgresWalFileReader is not open.");
        }

        List<CdcEvent> results = new ArrayList<>();
        long deadline = System.currentTimeMillis() + timeout.toMillis();

        while (!pendingEvents.isEmpty() && results.size() < maxEvents) {
            results.add(pendingEvents.poll());
        }

        while (results.size() < maxEvents && System.currentTimeMillis() <= deadline) {
            if (currentChannel == null || currentRaf == null) {
                File nextFile = sequenceTracker.advanceToNextFile();
                if (nextFile != null) {
                    openFile(nextFile, 0L);
                } else {
                    Thread.sleep(Math.min(50, Math.max(10, timeout.toMillis())));
                    break;
                }
            }

            PostgresWalRecord rawRecord = null;
            if (isBinaryFormat) {
                rawRecord = parser.parseNextBinaryRecord(currentChannel, currentFileName, tableFilter);
            } else {
                rawRecord = parser.parseNextJsonRecord(currentRaf, currentFileName, tableFilter);
            }

            if (rawRecord != null) {
                this.currentOffset = isBinaryFormat ? currentChannel.position() : currentRaf.getFilePointer();
                if (rawRecord.getLsn() > 0) {
                    this.currentLsn = rawRecord.getLsn();
                    this.currentLsnFormatted = rawRecord.getLsnFormatted();
                }

                if (rawRecord.isFiltered()) {
                    continue;
                }

                long startLsn = (config != null && config.getStartingPosition() != null && config.getStartingPosition().getLsn() != null)
                        ? config.getStartingPosition().getLsn()
                        : 0L;
                if (startLsn == 0 && config != null && config.getStartingPosition() != null && config.getStartingPosition().getToken() != null) {
                    startLsn = PostgresWalConstants.parseLsn(config.getStartingPosition().getToken());
                }

                if (startLsn > 0 && rawRecord.getLsn() > 0 && rawRecord.getLsn() < startLsn) {
                    continue;
                }

                List<PostgresWalRecord> emitted = transactionBuffer.processRecord(rawRecord);
                for (PostgresWalRecord r : emitted) {
                    if (operationFilter != null && !operationFilter.matches(r.getOperationType())) {
                        continue;
                    }
                    CdcEvent event = convertToCdcEvent(r);
                    if (event != null) {
                        if (results.size() < maxEvents) {
                            results.add(event);
                        } else {
                            pendingEvents.add(event);
                        }
                    }
                }
            } else {
                // Reached end of current WAL file; check if next segment has been written
                File nextFile = sequenceTracker.advanceToNextFile();
                if (nextFile != null) {
                    List<PostgresWalRecord> flushed = transactionBuffer.flushAll();
                    for (PostgresWalRecord r : flushed) {
                        if (operationFilter != null && !operationFilter.matches(r.getOperationType())) continue;
                        CdcEvent event = convertToCdcEvent(r);
                        if (event != null) {
                            if (results.size() < maxEvents) {
                                results.add(event);
                            } else {
                                pendingEvents.add(event);
                            }
                        }
                    }
                    log.info("Reached end of WAL file {}. Rotating to next segment: {}", currentFileName, nextFile.getName());
                    closeCurrentFile();
                    openFile(nextFile, 0L);
                    if (!results.isEmpty()) break;
                } else {
                    List<PostgresWalRecord> flushed = transactionBuffer.flushAll();
                    for (PostgresWalRecord r : flushed) {
                        if (operationFilter != null && !operationFilter.matches(r.getOperationType())) continue;
                        CdcEvent event = convertToCdcEvent(r);
                        if (event != null) {
                            if (results.size() < maxEvents) {
                                results.add(event);
                            } else {
                                pendingEvents.add(event);
                            }
                        }
                    }
                    if (!results.isEmpty()) break;
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
            if (position.getLsn() != null && position.getLsn() > 0) {
                this.currentLsn = position.getLsn();
                this.currentLsnFormatted = PostgresWalConstants.formatLsn(this.currentLsn);
            } else if (position.getToken() != null && !position.getToken().isBlank()) {
                this.currentLsnFormatted = position.getToken();
                this.currentLsn = PostgresWalConstants.parseLsn(this.currentLsnFormatted);
            }
            if (position.getFileOffset() != null) {
                this.currentOffset = position.getFileOffset();
            }
            if (position.getSourceFile() != null) {
                this.currentFileName = position.getSourceFile();
            }
            log.debug("Committed PostgreSQL checkpoint: file={}, offset={}, LSN={}", currentFileName, currentOffset, currentLsnFormatted);
        }
    }

    @Override
    public synchronized CdcPosition getCurrentPosition() {
        return CdcPosition.builder()
                .sourceFile(currentFileName)
                .fileOffset(currentOffset)
                .lsn(currentLsn)
                .token(currentLsnFormatted != null ? currentLsnFormatted : (currentLsn > 0 ? PostgresWalConstants.formatLsn(currentLsn) : null))
                .timestamp(Instant.now())
                .build();
    }

    @Override
    public synchronized boolean hasNext() {
        if (!isOpen.get()) return false;
        try {
            if (!pendingEvents.isEmpty()) {
                return true;
            }
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
        pendingEvents.clear();
        log.info("Closed PostgresWalFileReader");
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
        } catch (IOException e) {
            log.warn("Error closing WAL file channel: {}", e.getMessage());
        } finally {
            currentChannel = null;
            currentRaf = null;
        }
    }

    private CdcEvent convertToCdcEvent(PostgresWalRecord r) {
        if (r == null || r.getOperationType() == null || r.isTransactionBoundary()) {
            return null;
        }

        String fullTable = (r.getSchemaName() != null && !r.getSchemaName().isBlank())
                ? r.getSchemaName() + "." + r.getTableName()
                : r.getTableName();

        CdcPosition pos = CdcPosition.builder()
                .sourceFile(r.getSourceFile())
                .fileOffset(r.getFileOffset())
                .lsn(r.getLsn())
                .token(r.getLsnFormatted())
                .transactionId(r.getTransactionId())
                .timestamp(r.getTimestamp())
                .build();

        String pipelineId = config != null ? config.getPipelineId() : null;

        return CdcEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .pipelineId(pipelineId)
                .sourceDatabaseType(DatabaseType.POSTGRESQL)
                .schemaName(r.getSchemaName())
                .tableName(r.getTableName())
                .operationType(r.getOperationType())
                .transactionId(r.getTransactionId())
                .commitTimestamp(r.getTimestamp() != null ? r.getTimestamp() : Instant.now())
                .primaryKeyValues(r.getPrimaryKeyValues())
                .afterData(r.getAfterColumns())
                .beforeData(r.getBeforeColumns())
                .position(pos)
                .build();
    }
}
