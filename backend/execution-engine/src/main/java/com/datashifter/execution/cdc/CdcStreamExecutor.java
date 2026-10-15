package com.datashifter.execution.cdc;

import com.datashifter.common.cdc.*;
import com.datashifter.common.enums.DatabaseType;
import com.datashifter.common.enums.PipelineMode;
import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.events.PipelineEvents.*;
import com.datashifter.common.exceptions.ResourceNotFoundException;
import com.datashifter.common.models.Connection;
import com.datashifter.common.models.Pipeline;
import com.datashifter.common.models.PipelineTable;
import com.datashifter.common.utils.EncryptionUtil;
import com.datashifter.connector.cdc.checkpoint.CdcCheckpointManager;
import com.datashifter.connector.cdc.replay.CdcMicroBatchAggregator;
import com.datashifter.connector.cdc.replay.CdcReplayCoordinator;
import com.datashifter.connector.cdc.segregation.*;
import com.datashifter.connector.factories.CdcSourceReaderFactory;
import com.datashifter.common.cdc.CdcSourceReader;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;

import com.datashifter.execution.consumers.CommandRegistry;
import com.datashifter.execution.repositories.ExecutionConnectionRepository;
import com.datashifter.execution.repositories.ExecutionPipelineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * Executes continuous, real-time Change Data Capture (CDC) replication.
 * Manages the endless streaming lifecycle, event polling, segregation filtering,
 * micro-batch target replay, dual-tier checkpointing, and PAUSE/RESUME/STOP commands.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CdcStreamExecutor {

    private final ExecutionPipelineRepository pipelineRepo;
    private final ExecutionConnectionRepository connectionRepo;
    private final CdcSourceReaderFactory readerFactory;
    private final CdcCheckpointManager checkpointManager;
    private final CdcReplayCoordinator replayCoordinator;
    private final CommandRegistry commandRegistry;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final com.datashifter.execution.adapters.AdapterExecutionManager adapterExecutionManager;
    private final com.datashifter.execution.adapters.AdapterExecutionBridge adapterExecutionBridge;

    public CdcStreamExecutor(ExecutionPipelineRepository pipelineRepo,
                             ExecutionConnectionRepository connectionRepo,
                             CdcSourceReaderFactory readerFactory,
                             CdcCheckpointManager checkpointManager,
                             CdcReplayCoordinator replayCoordinator,
                             CommandRegistry commandRegistry,
                             KafkaTemplate<String, Object> kafkaTemplate) {
        this(pipelineRepo, connectionRepo, readerFactory, checkpointManager, replayCoordinator, commandRegistry, kafkaTemplate, null, new com.datashifter.execution.adapters.AdapterExecutionBridge());
    }

    public void executeCdcStream(Pipeline pipeline, String executionLogId) {
        String pipelineId = pipeline.getId();
        log.info("=== Starting CDC Stream Execution for pipeline: {} ===", pipelineId);

        // 1. Mark pipeline as RUNNING
        pipeline.setStatus(PipelineStatus.RUNNING);
        pipelineRepo.saveAndFlush(pipeline);
        publishStatus(pipelineId, executionLogId, PipelineStatus.VALIDATED, PipelineStatus.RUNNING, "CDC stream started");

        // 2. Resolve connections and build target connection config
        Connection sourceConn = pipeline.getSourceConnectionId() != null
                ? connectionRepo.findById(pipeline.getSourceConnectionId()).orElse(null)
                : null;
        Connection targetConn = pipeline.getTargetConnectionId() != null
                ? connectionRepo.findById(pipeline.getTargetConnectionId()).orElse(null)
                : null;

        ConnectionConfig targetConfig = targetConn != null
                ? toConnectionConfig(targetConn, pipeline.getTargetPoolSize(), pipeline)
                : ConnectionConfig.builder().build();

        // Check if dynamic target/source adapters are configured
        com.datashifter.adapter.sdk.DataWriter targetAdapterWriter = null;
        com.datashifter.adapter.sdk.AdapterConfig targetAdapterConfig = null;
        if (pipeline.getTargetAdapterId() != null && !pipeline.getTargetAdapterId().isBlank()) {
            targetAdapterConfig = adapterExecutionManager.parseConfig(pipeline.getTargetConfig());
            targetAdapterWriter = adapterExecutionManager.getWriter(pipeline.getTargetAdapterId(), targetAdapterConfig);
            log.info("Initialized CDC target adapter: {}", pipeline.getTargetAdapterId());
        }

        com.datashifter.adapter.sdk.DataReader sourceAdapterReader = null;
        com.datashifter.adapter.sdk.AdapterConfig sourceAdapterConfig = null;
        if (pipeline.getSourceAdapterId() != null && !pipeline.getSourceAdapterId().isBlank()) {
            sourceAdapterConfig = adapterExecutionManager.parseConfig(pipeline.getSourceConfig());
            sourceAdapterReader = adapterExecutionManager.getReader(pipeline.getSourceAdapterId(), sourceAdapterConfig);
            log.info("Initialized CDC source adapter: {}", pipeline.getSourceAdapterId());
        }

        // 3. Resolve starting position (Resume from Checkpoint if exists, else snapshot SCN)
        CdcPosition startPosition = resolveStartingPosition(pipeline);

        // 4. Configure table segregation and reader
        Set<String> selectedTables = pipeline.getPipelineTables().stream()
                .map(PipelineTable::getSourceTable)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        CdcTableFilter tableFilter = selectedTables.isEmpty()
                ? CdcTableFilter.allowAll()
                : new CdcTableFilter(selectedTables);

        CdcSegregationEngine segregationEngine = new CdcSegregationEngine(
                tableFilter,
                CdcOperationFilter.allowAll(),
                Collections.emptyList()
        );

        int batchSize = pipeline.getCdcBatchSize() != null ? pipeline.getCdcBatchSize() : 500;
        int flushIntervalMs = pipeline.getCdcFlushIntervalMs() != null ? pipeline.getCdcFlushIntervalMs() : 200;

        CdcReaderConfig readerConfig = CdcReaderConfig.builder()
                .pipelineId(pipelineId)
                .directoryPath(pipeline.getCdcDirectoryPath())
                .filePattern(pipeline.getCdcFilePattern() != null ? pipeline.getCdcFilePattern() : ".*")
                .batchSize(batchSize)
                .startingPosition(startPosition)
                .targetTableNames(selectedTables)
                .build();

        CdcSourceReader reader = null;
        if (sourceAdapterReader == null && sourceConn != null) {
            DatabaseType readerDbType = sourceConn.getDbType();
            if ("POSTGRES_WAL".equalsIgnoreCase(pipeline.getCdcLogType())) {
                readerDbType = DatabaseType.POSTGRESQL;
            } else if ("ORACLE_TRAIL".equalsIgnoreCase(pipeline.getCdcLogType())) {
                readerDbType = DatabaseType.ORACLE;
            }
            reader = readerFactory.getReader(readerDbType);
        }

        CdcMicroBatchAggregator aggregator = new CdcMicroBatchAggregator(batchSize, flushIntervalMs);

        Instant streamStartedAt = Instant.now();
        AtomicLong totalEventsProcessed = new AtomicLong(0);
        long lastProgressPublishMs = System.currentTimeMillis();

        try {
            if (reader != null) {
                reader.open(readerConfig);
                log.info("CDC source reader opened for pipeline {} at position {}", pipelineId, startPosition);
            }

            while (!Thread.currentThread().isInterrupted()) {
                // Check command registry for PAUSE command
                if (commandRegistry.isPauseRequested(pipelineId)) {
                    log.info("CDC pipeline {} received PAUSE request. Committing state...", pipelineId);
                    flushAggregator(aggregator, targetConfig, pipelineId, totalEventsProcessed, targetAdapterWriter, targetAdapterConfig);
                    CdcPosition pos = (reader != null) ? reader.getCurrentPosition() : null;
                    checkpointDurable(pipelineId, pos, totalEventsProcessed.get());
                    commandRegistry.clearCommand(pipelineId);

                    pipeline.setStatus(PipelineStatus.PAUSED);
                    pipelineRepo.saveAndFlush(pipeline);
                    publishStatus(pipelineId, executionLogId, PipelineStatus.RUNNING, PipelineStatus.PAUSED, "CDC paused by user");
                    return;
                }

                // Check command registry for STOP command
                if (commandRegistry.isStopRequested(pipelineId)) {
                    log.info("CDC pipeline {} received STOP request. Committing state...", pipelineId);
                    flushAggregator(aggregator, targetConfig, pipelineId, totalEventsProcessed, targetAdapterWriter, targetAdapterConfig);
                    CdcPosition pos = (reader != null) ? reader.getCurrentPosition() : null;
                    checkpointDurable(pipelineId, pos, totalEventsProcessed.get());
                    commandRegistry.clearCommand(pipelineId);

                    pipeline.setStatus(PipelineStatus.ERRORED);
                    pipelineRepo.saveAndFlush(pipeline);
                    publishStatus(pipelineId, executionLogId, PipelineStatus.RUNNING, PipelineStatus.ERRORED, "CDC stopped by user");
                    return;
                }

                // Poll raw events from source adapter or reader
                List<CdcEvent> rawEvents;
                if (sourceAdapterReader != null) {
                    List<com.datashifter.adapter.sdk.DataRecord> records = sourceAdapterReader.poll(batchSize, Duration.ofMillis(100));
                    rawEvents = new ArrayList<>();
                    if (records != null) {
                        for (com.datashifter.adapter.sdk.DataRecord r : records) {
                            CdcEvent evt = adapterExecutionBridge.dataRecordToCdcEvent(r);
                            if (evt != null) {
                                if (evt.getPipelineId() == null) evt.setPipelineId(pipelineId);
                                rawEvents.add(evt);
                            }
                        }
                    }
                } else if (reader != null) {
                    rawEvents = reader.poll(batchSize, Duration.ofMillis(100));
                } else {
                    rawEvents = Collections.emptyList();
                }

                if (rawEvents != null && !rawEvents.isEmpty()) {
                    for (CdcEvent raw : rawEvents) {
                        Optional<CdcEvent> transformed = segregationEngine.filterAndTransform(raw);
                        transformed.ifPresent(aggregator::add);
                    }
                }

                // Check micro-batch flush criteria
                if (aggregator.shouldFlush()) {
                    flushAggregator(aggregator, targetConfig, pipelineId, totalEventsProcessed, targetAdapterWriter, targetAdapterConfig);
                } else if (rawEvents == null || rawEvents.isEmpty()) {
                    // Back off slightly on empty stream to prevent tight loop CPU spinning
                    try {
                        Thread.sleep(50);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }

                // Publish progress every 1 second
                long now = System.currentTimeMillis();
                if (now - lastProgressPublishMs >= 1000) {
                    CdcPosition pos = (reader != null) ? reader.getCurrentPosition() : null;
                    publishProgress(pipelineId, executionLogId, totalEventsProcessed.get(), streamStartedAt, pos);
                    lastProgressPublishMs = now;
                }
            }

        } catch (Exception e) {
            log.error("Fatal exception in CDC stream execution for pipeline {}: {}", pipelineId, e.getMessage(), e);
            try {
                flushAggregator(aggregator, targetConfig, pipelineId, totalEventsProcessed, targetAdapterWriter, targetAdapterConfig);
                CdcPosition pos = (reader != null) ? reader.getCurrentPosition() : null;
                checkpointDurable(pipelineId, pos, totalEventsProcessed.get());
            } catch (Exception flushErr) {
                log.warn("Failed to flush during error shutdown: {}", flushErr.getMessage());
            }
            pipeline.setStatus(PipelineStatus.ERRORED);
            pipelineRepo.saveAndFlush(pipeline);
            publishStatus(pipelineId, executionLogId, PipelineStatus.RUNNING, PipelineStatus.ERRORED, e.getMessage());
        } finally {
            if (sourceAdapterReader != null) {
                adapterExecutionManager.close(sourceAdapterReader);
            }
            if (targetAdapterWriter != null) {
                adapterExecutionManager.close(targetAdapterWriter);
            }
            if (reader != null) {
                try {
                    reader.close();
                } catch (Exception closeErr) {
                    log.warn("Error closing CDC reader for pipeline {}: {}", pipelineId, closeErr.getMessage());
                }
            }
        }
    }

    private void flushAggregator(CdcMicroBatchAggregator aggregator,
                                 ConnectionConfig targetConfig,
                                 String pipelineId,
                                 AtomicLong totalEventsProcessed,
                                 com.datashifter.adapter.sdk.DataWriter targetAdapterWriter,
                                 com.datashifter.adapter.sdk.AdapterConfig targetAdapterConfig) {
        List<CdcEvent> batch = aggregator.drain();
        if (!batch.isEmpty()) {
            if (targetAdapterWriter != null) {
                try {
                    adapterExecutionBridge.applyCdcEvents(targetAdapterWriter, targetAdapterConfig, null, batch, null);
                } catch (Exception e) {
                    log.error("CDC target adapter replay failed: {}", e.getMessage(), e);
                    throw new RuntimeException("CDC adapter replay failed: " + e.getMessage(), e);
                }
            } else if (replayCoordinator != null && targetConfig != null) {
                CdcWriteResult result = replayCoordinator.replayBatch(targetConfig, batch, pipelineId);
            }
            long total = totalEventsProcessed.addAndGet(batch.size());
            log.debug("CDC replayed batch of {} events for pipeline {}. Total processed: {}",
                    batch.size(), pipelineId, total);
        }
    }

    private void checkpointDurable(String pipelineId, CdcPosition position, long totalProcessed) {
        if (position != null && checkpointManager != null) {
            checkpointManager.forceDurableFlush(pipelineId, position, totalProcessed);
        }
    }

    private CdcPosition resolveStartingPosition(Pipeline pipeline) {
        // First check if an existing checkpoint exists (hot Redis or durable DB)
        if (checkpointManager != null) {
            Optional<CdcPosition> checkpointPos = checkpointManager.getResumePosition(pipeline.getId());
            if (checkpointPos.isPresent()) {
                log.info("Found existing checkpoint for CDC pipeline {}: SCN={}, file={}, offset={}",
                        pipeline.getId(), checkpointPos.get().getScn(),
                        checkpointPos.get().getSourceFile(), checkpointPos.get().getFileOffset());
                return checkpointPos.get();
            }
        }

        // If no checkpoint, check if starting SCN/LSN was injected from snapshot or configured
        if (pipeline.getCdcStartingScn() != null && !pipeline.getCdcStartingScn().isBlank()) {
            String scnStr = pipeline.getCdcStartingScn().trim();
            log.info("Initializing CDC pipeline {} from configured starting SCN/LSN: {}", pipeline.getId(), scnStr);

            if (scnStr.contains("/")) {
                String[] parts = scnStr.split("/");
                if (parts.length == 2) {
                    try {
                        long high = Long.parseUnsignedLong(parts[0], 16);
                        long low = Long.parseUnsignedLong(parts[1], 16);
                        long lsn = (high << 32) | low;
                        return CdcPosition.builder()
                                .lsn(lsn)
                                .token(scnStr)
                                .build();
                    } catch (Exception ignored) {}
                }
            }

            try {
                long scn = Long.parseLong(scnStr);
                return CdcPosition.builder()
                        .scn(scn)
                        .token(scnStr)
                        .build();
            } catch (NumberFormatException e) {
                return CdcPosition.builder()
                        .token(scnStr)
                        .build();
            }
        }

        // Fallback: start from stream beginning
        return CdcPosition.builder().build();
    }

    private void publishStatus(String pipelineId, String executionLogId,
                               PipelineStatus from, PipelineStatus to, String reason) {
        kafkaTemplate.send(KafkaTopics.PIPELINE_STATUS, StatusChangeEvent.builder()
                .pipelineId(pipelineId)
                .executionLogId(executionLogId)
                .previousStatus(from)
                .newStatus(to)
                .reason(reason)
                .timestamp(Instant.now())
                .build());
    }

    private void publishProgress(String pipelineId, String executionLogId,
                                 long totalRowsProcessed, Instant startedAt,
                                 CdcPosition currentPos) {
        long elapsedSec = Math.max(1, (Instant.now().toEpochMilli() - startedAt.toEpochMilli()) / 1000);
        long avgRate = totalRowsProcessed / elapsedSec;

        String posDisplay = (currentPos != null && currentPos.getScn() != null && currentPos.getScn() > 0)
                ? "SCN: " + currentPos.getScn()
                : (currentPos != null && currentPos.getLsn() != null && currentPos.getLsn() > 0)
                    ? "LSN: " + (currentPos.getToken() != null ? currentPos.getToken() : Long.toHexString(currentPos.getLsn()))
                    : (currentPos != null && currentPos.getToken() != null ? currentPos.getToken() : "N/A");

        kafkaTemplate.send(KafkaTopics.PIPELINE_PROGRESS, ProgressEvent.builder()
                .pipelineId(pipelineId)
                .executionLogId(executionLogId)
                .tableName("CDC_STREAM")
                .tableIndex(0)
                .totalTables(1)
                .chunkNumber(0)
                .rowsProcessedInChunk(0)
                .totalRowsProcessed(totalRowsProcessed)
                .totalRowsInTable(totalRowsProcessed)
                .overallProgress(100.0) // CDC is streaming
                .rowsPerSec(avgRate)
                .avgRowsPerSec(avgRate)
                .eta(posDisplay)
                .timestamp(Instant.now())
                .build());
    }

    private ConnectionConfig toConnectionConfig(Connection conn, Integer poolSize, Pipeline pipeline) {
        return ConnectionConfig.builder()
                .connectionId(conn.getId())
                .dbType(conn.getDbType())
                .host(conn.getHost())
                .port(conn.getPort())
                .databaseName(conn.getDatabaseName())
                .schemaName(conn.getSchemaName())
                .username(conn.getUsername())
                .password(decryptPasswordSafe(conn.getEncryptedPassword()))
                .maxPoolSize(poolSize != null ? poolSize : 10)
                .ignoreExceptions(pipeline != null && Boolean.TRUE.equals(pipeline.getIgnoreExceptions()))
                .maxErrorThreshold(pipeline != null && pipeline.getMaxErrorThreshold() != null ? pipeline.getMaxErrorThreshold() : 1000)
                .build();
    }

    private String decryptPasswordSafe(String encryptedPassword) {
        if (encryptedPassword == null || encryptedPassword.isBlank()) return "";
        try {
            return EncryptionUtil.decrypt(encryptedPassword);
        } catch (Exception e) {
            return encryptedPassword;
        }
    }
}

