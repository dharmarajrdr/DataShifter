package com.datashifter.execution.cdc;

import com.datashifter.common.cdc.*;
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

    public void executeCdcStream(Pipeline pipeline, String executionLogId) {
        String pipelineId = pipeline.getId();
        log.info("=== Starting CDC Stream Execution for pipeline: {} ===", pipelineId);

        // 1. Mark pipeline as RUNNING
        pipeline.setStatus(PipelineStatus.RUNNING);
        pipelineRepo.saveAndFlush(pipeline);
        publishStatus(pipelineId, executionLogId, PipelineStatus.VALIDATED, PipelineStatus.RUNNING, "CDC stream started");

        // 2. Resolve connections and build target connection config
        Connection sourceConn = connectionRepo.findById(pipeline.getSourceConnectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Source connection", pipeline.getSourceConnectionId()));
        Connection targetConn = connectionRepo.findById(pipeline.getTargetConnectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Target connection", pipeline.getTargetConnectionId()));

        ConnectionConfig targetConfig = toConnectionConfig(targetConn, pipeline.getTargetPoolSize(), pipeline);

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



        CdcSourceReader reader = readerFactory.getReader(sourceConn.getDbType());
        CdcMicroBatchAggregator aggregator = new CdcMicroBatchAggregator(batchSize, flushIntervalMs);

        Instant streamStartedAt = Instant.now();
        AtomicLong totalEventsProcessed = new AtomicLong(0);
        long lastProgressPublishMs = System.currentTimeMillis();

        try {
            reader.open(readerConfig);
            log.info("CDC source reader opened for pipeline {} at position {}", pipelineId, startPosition);

            while (!Thread.currentThread().isInterrupted()) {
                // Check command registry for PAUSE command
                if (commandRegistry.isPauseRequested(pipelineId)) {
                    log.info("CDC pipeline {} received PAUSE request. Committing state...", pipelineId);
                    flushAggregator(aggregator, targetConfig, pipelineId, totalEventsProcessed);
                    checkpointDurable(pipelineId, reader.getCurrentPosition(), totalEventsProcessed.get());
                    commandRegistry.clearCommand(pipelineId);

                    pipeline.setStatus(PipelineStatus.PAUSED);
                    pipelineRepo.saveAndFlush(pipeline);
                    publishStatus(pipelineId, executionLogId, PipelineStatus.RUNNING, PipelineStatus.PAUSED, "CDC paused by user");
                    return;
                }

                // Check command registry for STOP command
                if (commandRegistry.isStopRequested(pipelineId)) {
                    log.info("CDC pipeline {} received STOP request. Committing state...", pipelineId);
                    flushAggregator(aggregator, targetConfig, pipelineId, totalEventsProcessed);
                    checkpointDurable(pipelineId, reader.getCurrentPosition(), totalEventsProcessed.get());
                    commandRegistry.clearCommand(pipelineId);

                    pipeline.setStatus(PipelineStatus.ERRORED);
                    pipelineRepo.saveAndFlush(pipeline);
                    publishStatus(pipelineId, executionLogId, PipelineStatus.RUNNING, PipelineStatus.ERRORED, "CDC stopped by user");
                    return;
                }

                // Poll raw events from source reader
                List<CdcEvent> rawEvents = reader.poll(batchSize, Duration.ofMillis(100));

                if (rawEvents != null && !rawEvents.isEmpty()) {
                    for (CdcEvent raw : rawEvents) {
                        Optional<CdcEvent> transformed = segregationEngine.filterAndTransform(raw);
                        transformed.ifPresent(aggregator::add);
                    }
                }

                // Check micro-batch flush criteria
                if (aggregator.shouldFlush()) {
                    flushAggregator(aggregator, targetConfig, pipelineId, totalEventsProcessed);
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
                    publishProgress(pipelineId, executionLogId, totalEventsProcessed.get(), streamStartedAt, reader.getCurrentPosition());
                    lastProgressPublishMs = now;
                }
            }

        } catch (Exception e) {
            log.error("Fatal exception in CDC stream execution for pipeline {}: {}", pipelineId, e.getMessage(), e);
            try {
                flushAggregator(aggregator, targetConfig, pipelineId, totalEventsProcessed);
                checkpointDurable(pipelineId, reader.getCurrentPosition(), totalEventsProcessed.get());
            } catch (Exception flushErr) {
                log.warn("Failed to flush during error shutdown: {}", flushErr.getMessage());
            }
            pipeline.setStatus(PipelineStatus.ERRORED);
            pipelineRepo.saveAndFlush(pipeline);
            publishStatus(pipelineId, executionLogId, PipelineStatus.RUNNING, PipelineStatus.ERRORED, e.getMessage());
        } finally {
            try {
                reader.close();
            } catch (Exception closeErr) {
                log.warn("Error closing CDC reader for pipeline {}: {}", pipelineId, closeErr.getMessage());
            }
        }
    }

    private void flushAggregator(CdcMicroBatchAggregator aggregator,
                                 ConnectionConfig targetConfig,
                                 String pipelineId,
                                 AtomicLong totalEventsProcessed) {
        List<CdcEvent> batch = aggregator.drain();
        if (!batch.isEmpty()) {
            CdcWriteResult result = replayCoordinator.replayBatch(targetConfig, batch, pipelineId);
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

        // If no checkpoint, check if starting SCN was injected from snapshot or configured
        if (pipeline.getCdcStartingScn() != null && !pipeline.getCdcStartingScn().isBlank()) {
            String scnStr = pipeline.getCdcStartingScn().trim();
            log.info("Initializing CDC pipeline {} from configured starting SCN: {}", pipeline.getId(), scnStr);
            try {
                long scn = Long.parseLong(scnStr);
                return CdcPosition.builder()
                        .scn(scn)
                        .token(scnStr)
                        .build();
            } catch (NumberFormatException e) {
                // Non-numeric LSN / token
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

        String scnDisplay = (currentPos != null && currentPos.getScn() != null)
                ? String.valueOf(currentPos.getScn())
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
                .eta("SCN: " + scnDisplay)
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

