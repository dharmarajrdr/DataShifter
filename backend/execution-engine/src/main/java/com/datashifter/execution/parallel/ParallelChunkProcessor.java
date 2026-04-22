package com.datashifter.execution.parallel;

import com.datashifter.common.enums.ErrorType;
import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.events.PipelineEvents.*;
import com.datashifter.common.models.PipelineTable;
import com.datashifter.common.models.TargetTableMapping;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.datashifter.connector.spi.interfaces.DatabaseConnector;
import com.datashifter.connector.spi.interfaces.WriteResult;
import com.datashifter.execution.checkpoint.CheckpointManager;
import com.datashifter.execution.checkpoint.CheckpointManager.Checkpoint;
import com.datashifter.execution.consumers.CommandRegistry;
import com.datashifter.execution.contexts.ExecutionContext;
import com.datashifter.execution.contexts.ExecutionContext.TargetTableContext;
import com.datashifter.execution.services.implementations.ColumnMapperService;
import com.datashifter.execution.strategies.filters.FilterChain;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Parallel chunk processor — producer-consumer pattern.
 *
 * Architecture:
 *   [Reader Thread] → reads chunks sequentially (PK cursor) → pushes to BlockingQueue
 *         ↓
 *   [BlockingQueue] — bounded, capacity = queueCapacity
 *         ↓
 *   [Worker 1] [Worker 2] [Worker 3] [Worker N] — each consumes a chunk and:
 *         filter → transform → map → buffer → write → report
 *
 * Checkpoint ordering:
 *   Workers may finish out of order (chunk 5 done before chunk 4).
 *   We track completed chunks in a ConcurrentSkipListSet and only checkpoint
 *   up to the LOWEST contiguous completed chunk (no gaps).
 *   E.g., completed = {0,1,2,4,5} → checkpoint at chunk 2 (gap at 3).
 *
 * Graceful shutdown:
 *   Reader sends N poison pills → workers exit → main thread joins all.
 *   On pause/stop: reader stops producing, workers drain queue, then exit.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ParallelChunkProcessor {

    private final ParallelConfig config;
    private final ColumnMapperService columnMapperService;
    private final CheckpointManager checkpointManager;
    private final CommandRegistry commandRegistry;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Process a single table's data using parallel workers.
     *
     * @param ctx              execution context (pipeline config, connections, chains)
     * @param pt               the pipeline table being processed
     * @param sourceConnector  source DB connector
     * @param targetConnector  target DB connector
     * @param resumeCheckpoint checkpoint from previous run (null if fresh start)
     * @param totalRowsAllTables estimated total rows across all tables (for progress %)
     * @param workerCount      number of parallel worker threads
     */
    public void process(ExecutionContext ctx, PipelineTable pt,
                        DatabaseConnector sourceConnector, DatabaseConnector targetConnector,
                        Checkpoint resumeCheckpoint, long totalRowsAllTables, int workerCount) {

        String pipelineId = ctx.getPipelineId();
        String tableName = pt.getSourceTable();
        int chunkSize = ctx.getPipeline().getChunkSize();
        String pkColumn = sourceConnector.getPrimaryKeyColumn(ctx.getSourceConfig(), tableName);

        // Resume state
        String lastPkValue = resumeCheckpoint != null ? resumeCheckpoint.getLastCommittedPk() : null;
        long startChunk = resumeCheckpoint != null ? resumeCheckpoint.getLastCommittedChunk() + 1 : 0;

        // Shared state
        BlockingQueue<ChunkTask> queue = new ArrayBlockingQueue<>(config.getQueueCapacity());
        ConcurrentSkipListSet<Long> completedChunks = new ConcurrentSkipListSet<>();
        ConcurrentHashMap<Long, String> chunkPkMap = new ConcurrentHashMap<>(); // chunkNumber → lastPkValue
        AtomicBoolean stopSignal = new AtomicBoolean(false);
        AtomicLong highestContiguousCheckpoint = new AtomicLong(startChunk - 1);

        FilterChain filterChain = ctx.getFilterChains().getOrDefault(pt.getId(), new FilterChain(List.of()));

        log.info("Starting parallel processing: table={}, workers={}, chunkSize={}, startChunk={}",
                tableName, workerCount, chunkSize, startChunk);

        // ===== READER THREAD =====
        Thread readerThread = new Thread(() -> {
            long chunkNumber = startChunk;
            String cursorPk = lastPkValue;
            try {
                while (!stopSignal.get()) {
                    // Check pause/stop
                    if (commandRegistry.isPauseRequested(pipelineId) || commandRegistry.isStopRequested(pipelineId)) {
                        stopSignal.set(true);
                        break;
                    }

                    List<Map<String, Object>> records = sourceConnector.readChunk(
                            ctx.getSourceConfig(), tableName, pkColumn, cursorPk, chunkSize);

                    if (records.isEmpty()) {
                        log.info("Reader: table {} — no more records at chunk {}", tableName, chunkNumber);
                        break;
                    }

                    String firstPk = extractPk(records.get(0), pkColumn);
                    String chunkLastPk = extractPk(records.get(records.size() - 1), pkColumn);

                    ChunkTask task = ChunkTask.builder()
                            .chunkNumber(chunkNumber)
                            .records(records)
                            .firstPkValue(firstPk)
                            .lastPkValue(chunkLastPk)
                            .recordCount(records.size())
                            .poison(false)
                            .build();

                    // Blocking put — waits if queue is full (back-pressure)
                    queue.put(task);
                    chunkPkMap.put(chunkNumber, chunkLastPk);

                    cursorPk = chunkLastPk;
                    chunkNumber++;
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("Reader thread interrupted for table {}", tableName);
            } catch (Exception e) {
                log.error("Reader thread error for table {}: {}", tableName, e.getMessage(), e);
                stopSignal.set(true);
            } finally {
                // Send poison pills to all workers
                for (int i = 0; i < workerCount; i++) {
                    try { queue.put(ChunkTask.poison()); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                }
            }
        }, "chunk-reader-" + tableName);

        // ===== WORKER THREADS =====
        ExecutorService workerPool = Executors.newFixedThreadPool(workerCount, r -> {
            Thread t = new Thread(r);
            t.setName("chunk-worker-" + tableName + "-" + t.getId());
            t.setDaemon(true);
            return t;
        });

        List<Future<?>> workerFutures = new ArrayList<>();
        for (int w = 0; w < workerCount; w++) {
            workerFutures.add(workerPool.submit(() -> {
                while (!stopSignal.get()) {
                    ChunkTask task;
                    try {
                        task = queue.poll(1, TimeUnit.SECONDS);
                        if (task == null) continue; // timeout, re-check stop signal
                        if (task.isPoison()) break;
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    }

                    try {
                        processChunk(ctx, pt, targetConnector, filterChain, task, totalRowsAllTables);
                        completedChunks.add(task.getChunkNumber());

                        // Advance contiguous checkpoint
                        advanceCheckpoint(ctx, pt, completedChunks, chunkPkMap, highestContiguousCheckpoint);

                    } catch (Exception e) {
                        log.error("Worker error on chunk {}: {}", task.getChunkNumber(), e.getMessage(), e);
                        ctx.incrementErrors(1);
                        if (ctx.isErrorThresholdExceeded()) {
                            stopSignal.set(true);
                        }
                    }
                }
            }));
        }

        // ===== START AND WAIT =====
        readerThread.start();
        try {
            readerThread.join();
            workerPool.shutdown();
            workerPool.awaitTermination(5, TimeUnit.MINUTES);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            stopSignal.set(true);
            workerPool.shutdownNow();
        }

        // Final checkpoint at the highest contiguous point
        long finalCheckpoint = highestContiguousCheckpoint.get();
        String finalPk = chunkPkMap.get(finalCheckpoint);
        if (finalCheckpoint >= startChunk && finalPk != null) {
            checkpointManager.forceCheckpoint(Checkpoint.builder()
                    .pipelineId(pipelineId).executionLogId(ctx.getExecutionLogId())
                    .tableName(tableName).currentTableIndex(ctx.getCurrentTableIndex())
                    .lastCommittedChunk(finalCheckpoint).lastCommittedPk(finalPk)
                    .rowsProcessed(ctx.getTotalRowsProcessed().get())
                    .timestamp(Instant.now()).build());
        }

        // Propagate pause/stop signal
        if (commandRegistry.isPauseRequested(pipelineId)) {
            commandRegistry.clearCommand(pipelineId);
            throw new RuntimeException("PIPELINE_PAUSED");
        }
        if (commandRegistry.isStopRequested(pipelineId)) {
            commandRegistry.clearCommand(pipelineId);
            throw new RuntimeException("PIPELINE_STOPPED");
        }
        if (ctx.isErrorThresholdExceeded()) {
            throw new RuntimeException("Error threshold exceeded: " + ctx.getTotalErrors().get());
        }

        log.info("Parallel processing complete: table={}, chunks={}, workers={}",
                tableName, finalCheckpoint - startChunk + 1, workerCount);
    }

    // =========================================================================
    // CHUNK PROCESSING — runs inside a worker thread
    // =========================================================================

    private void processChunk(ExecutionContext ctx, PipelineTable pt,
                               DatabaseConnector targetConnector, FilterChain filterChain,
                               ChunkTask task, long totalRowsAllTables) {

        // STEP 2: FILTER
        List<Map<String, Object>> filtered = filterChain.apply(task.getRecords());
        if (filtered.isEmpty()) return;

        // STEP 3+4: TRANSFORM + MAP + WRITE per target table
        for (TargetTableMapping ttm : pt.getTargetTableMappings()) {
            TargetTableContext ttc = ctx.getTargetTableContexts().get(ttm.getId());
            if (ttc == null) continue;

            List<Map<String, Object>> targetRecords =
                    columnMapperService.mapBatchSimple(filtered, ttc.getColumnMappings());

            // STEP 5: BUFFER (thread-safe — Redis operations are atomic)

            // STEP 6: WRITE
            WriteResult result = targetConnector.writeBatch(
                    ctx.getTargetConfig(), ttc.getTargetTable(),
                    targetRecords, ttc.getWriteMode(), ttc.getPrimaryKeyColumn());

            // Handle failures
            if (result.getFailureCount() > 0) {
                handleWriteFailures(ctx, pt, ttm, result, task.getChunkNumber());
            }
        }

        // Update row count (thread-safe — AtomicLong)
        ctx.incrementRowsProcessed(filtered.size());

        // STEP 9: PUBLISH PROGRESS
        kafkaTemplate.send(KafkaTopics.PIPELINE_PROGRESS, ProgressEvent.builder()
                .pipelineId(ctx.getPipelineId()).executionLogId(ctx.getExecutionLogId())
                .tableName(pt.getSourceTable()).tableIndex(ctx.getCurrentTableIndex())
                .totalTables(ctx.getPipeline().getPipelineTables().size())
                .chunkNumber(task.getChunkNumber())
                .rowsProcessedInChunk(filtered.size())
                .totalRowsProcessed(ctx.getTotalRowsProcessed().get())
                .overallProgress(ctx.computeOverallProgress(totalRowsAllTables))
                .rowsPerSec(ctx.computeRowsPerSec())
                .timestamp(Instant.now()).build());
    }

    // =========================================================================
    // CHECKPOINT ADVANCEMENT — only checkpoints contiguous completed chunks
    // =========================================================================

    private void advanceCheckpoint(ExecutionContext ctx, PipelineTable pt,
                                    ConcurrentSkipListSet<Long> completedChunks,
                                    ConcurrentHashMap<Long, String> chunkPkMap,
                                    AtomicLong highestContiguous) {

        // Walk forward from current highest contiguous checkpoint
        long current = highestContiguous.get();
        while (completedChunks.contains(current + 1)) {
            current++;
        }

        if (current > highestContiguous.get()) {
            highestContiguous.set(current);
            String pk = chunkPkMap.get(current);

            // Save checkpoint at the new contiguous point
            checkpointManager.saveCheckpoint(Checkpoint.builder()
                    .pipelineId(ctx.getPipelineId()).executionLogId(ctx.getExecutionLogId())
                    .tableName(pt.getSourceTable()).currentTableIndex(ctx.getCurrentTableIndex())
                    .lastCommittedChunk(current).lastCommittedPk(pk)
                    .rowsProcessed(ctx.getTotalRowsProcessed().get())
                    .timestamp(Instant.now()).build());

            // Clean up old entries to prevent memory leak
            completedChunks.headSet(current).clear();
            for (long i = highestContiguous.get() - 10; i < current; i++) {
                chunkPkMap.remove(i);
            }
        }
    }

    // =========================================================================
    // ERROR HANDLING
    // =========================================================================

    private void handleWriteFailures(ExecutionContext ctx, PipelineTable pt,
                                      TargetTableMapping ttm, WriteResult result, long chunkNumber) {
        boolean ignoreExceptions = ctx.getPipeline().getIgnoreExceptions();
        boolean logSourceRow = ctx.getPipeline().getLogSourceRow();

        ctx.incrementErrors(result.getFailureCount());

        for (WriteResult.FailedRecord failed : result.getFailedRecords()) {
            kafkaTemplate.send(KafkaTopics.PIPELINE_ERRORS, ErrorEvent.builder()
                    .pipelineId(ctx.getPipelineId()).executionLogId(ctx.getExecutionLogId())
                    .errorType(resolveErrorType(failed.getErrorType()))
                    .sourceTable(pt.getSourceTable()).targetTable(ttm.getTargetTable())
                    .chunkNumber(chunkNumber).errorMessage(failed.getErrorMessage())
                    .sourceRowData(logSourceRow ? serializeRecord(failed.getRecord()) : null)
                    .pipelineStopped(!ignoreExceptions)
                    .timestamp(Instant.now()).build());
        }

        if (!ignoreExceptions) {
            throw new RuntimeException(String.format("Write failed: %d errors on %s → %s (chunk %d)",
                    result.getFailureCount(), pt.getSourceTable(), ttm.getTargetTable(), chunkNumber));
        }
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private String extractPk(Map<String, Object> record, String pkColumn) {
        if (record == null || pkColumn == null) return null;
        Object val = record.get(pkColumn);
        // Case-insensitive fallback
        if (val == null) {
            for (Map.Entry<String, Object> e : record.entrySet()) {
                if (e.getKey().equalsIgnoreCase(pkColumn)) { val = e.getValue(); break; }
            }
        }
        return val != null ? val.toString() : null;
    }

    private ErrorType resolveErrorType(String type) {
        try { return ErrorType.valueOf(type); } catch (Exception e) { return ErrorType.UNKNOWN; }
    }

    private String serializeRecord(Map<String, Object> record) {
        try { return objectMapper.writeValueAsString(record); } catch (Exception e) { return record.toString(); }
    }
}