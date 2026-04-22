package com.datashifter.execution.services.implementations;

import com.datashifter.common.enums.*;
import com.datashifter.common.events.KafkaTopics;
import com.datashifter.common.events.PipelineEvents.*;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.exceptions.ResourceNotFoundException;
import com.datashifter.common.models.*;
import com.datashifter.common.utils.EncryptionUtil;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.datashifter.connector.spi.interfaces.DatabaseConnector;
import com.datashifter.connector.spi.interfaces.WriteResult;
import com.datashifter.execution.checkpoint.CheckpointManager;
import com.datashifter.execution.checkpoint.CheckpointManager.Checkpoint;
import com.datashifter.execution.consumers.CommandRegistry;
import com.datashifter.execution.contexts.ExecutionContext;
import com.datashifter.execution.contexts.ExecutionContext.ResolvedColumnMapping;
import com.datashifter.execution.contexts.ExecutionContext.TargetTableContext;
import com.datashifter.execution.repositories.ExecutionConnectionRepository;
import com.datashifter.execution.repositories.ExecutionPipelineRepository;
import com.datashifter.execution.services.interfaces.ExecutionService;
import com.datashifter.execution.strategies.filters.FilterChain;
import com.datashifter.execution.strategies.filters.RowFilter;
import com.datashifter.execution.services.implementations.ColumnMappingResolver;
import com.datashifter.execution.strategies.transformers.TransformerFactory;
import com.datashifter.connector.factories.ConnectorFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import com.datashifter.execution.strategies.writers.WriteStrategyExecutor;
import com.datashifter.execution.parallel.ParallelChunkProcessor;
import com.datashifter.execution.parallel.ParallelConfig;
import com.datashifter.execution.parallel.ChunkSizeTuner;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.annotation.Lazy;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExecutionServiceImpl implements ExecutionService {

    private final ExecutionPipelineRepository pipelineRepo;
    private final ExecutionConnectionRepository connectionRepo;
    private final ConnectorFactory connectorFactory;
    private final TransformerFactory transformerFactory;
    private final CheckpointManager checkpointManager;
    private final ColumnMapperService columnMapperService;
    private final WriteStrategyExecutor writeStrategyExecutor;
    private final ColumnMappingResolver columnMappingResolver;
    private final CommandRegistry commandRegistry;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final ChunkSizeTuner chunkSizeTuner;
    private final ParallelChunkProcessor parallelChunkProcessor;
    private final ParallelConfig parallelConfig;

    @Override
    @Transactional
    public void execute(String pipelineId, String executionLogId) {
        log.info("=== Starting pipeline execution: {} ===", pipelineId);

        // 1. Load full pipeline graph
        Pipeline pipeline = pipelineRepo.findByIdWithFullGraph(pipelineId)
                .orElseThrow(() -> new ResourceNotFoundException("Pipeline", pipelineId));

        // 2. Build execution context
        ExecutionContext ctx = buildContext(pipeline, executionLogId);

        // 3. Publish RUNNING status
        publishStatus(ctx, PipelineStatus.VALIDATED, PipelineStatus.RUNNING, "Execution started");

        try {
            // 4. Table loop — sequential, user-defined order
            executeTableLoop(ctx);

            // 5. If we reached here without pause/stop — completed
            log.info("=== Pipeline completed: {} | Rows: {} | Errors: {} ===", pipelineId, ctx.getTotalRowsProcessed().get(), ctx.getTotalErrors().get());
            pipeline.setStatus(PipelineStatus.COMPLETED);
            pipelineRepo.save(pipeline);

            // Publish final progress with 100% and average throughput
            long avgRate = ctx.computeAvgRowsPerSec();
            long totalElapsedMs = Instant.now().toEpochMilli() - ctx.getStartedAt().toEpochMilli();
            long activeElapsedMs = totalElapsedMs - ctx.getPausedDurationMs().get();
            long activeElapsedSecs = Math.max(1, activeElapsedMs / 1000);
            String completedIn = "Completed in " + formatEta(activeElapsedSecs);

            kafkaTemplate.send(KafkaTopics.PIPELINE_PROGRESS, ProgressEvent.builder()
                    .pipelineId(ctx.getPipelineId())
                    .executionLogId(ctx.getExecutionLogId())
                    .totalRowsProcessed(ctx.getTotalRowsProcessed().get())
                    .overallProgress(100.0)
                    .rowsPerSec(avgRate)
                    .avgRowsPerSec(avgRate)
                    .eta(completedIn)
                    .timestamp(Instant.now())
                    .build());

            publishStatus(ctx, PipelineStatus.RUNNING, PipelineStatus.COMPLETED, "All tables migrated");

        } catch (PipelinePausedException e) {
            log.info("Pipeline paused: {} at table {} chunk {}", pipelineId, ctx.getCurrentTableName(), ctx.getCurrentChunkNumber());
            pipeline.setStatus(PipelineStatus.PAUSED);
            pipelineRepo.save(pipeline);
            publishStatus(ctx, PipelineStatus.RUNNING, PipelineStatus.PAUSED, e.getMessage());

        } catch (PipelineStoppedException e) {
            log.info("Pipeline stopped by user: {}", pipelineId);
            pipeline.setStatus(PipelineStatus.ERRORED);
            pipelineRepo.save(pipeline);
            publishStatus(ctx, PipelineStatus.RUNNING, PipelineStatus.ERRORED, "Stopped by user");

        } catch (Exception e) {
            log.error("Pipeline failed: {} — {}", pipelineId, e.getMessage(), e);
            pipeline.setStatus(PipelineStatus.ERRORED);
            pipelineRepo.save(pipeline);
            publishStatus(ctx, PipelineStatus.RUNNING, PipelineStatus.ERRORED, e.getMessage());
        }
    }

    // =========================================================================
    // TABLE LOOP
    // =========================================================================

    private void executeTableLoop(ExecutionContext ctx) {

        // Restore progress counters from checkpoints (resume scenario)
        long previousRows = checkpointManager.getTotalRowsFromCheckpoints(ctx.getPipelineId());
        if (previousRows > 0) {
            ctx.getTotalRowsProcessed().set(previousRows);
            ctx.markResumed(); // Account for paused duration in throughput calculation
            log.info("Resumed with {} previously processed rows", previousRows);
        }

        List<PipelineTable> tables = ctx.getPipeline().getPipelineTables().stream().toList();
        long totalRowsAllTables = estimateTotalRows(ctx, tables);

        for (int i = 0; i < tables.size(); i++) {
            PipelineTable pt = tables.get(i);
            ctx.setCurrentTableIndex(i);
            ctx.setCurrentTableName(pt.getSourceTable());

            // Check if this table was already completed (resume scenario)
            Checkpoint cp = checkpointManager.loadCheckpoint(ctx.getPipelineId(), pt.getSourceTable());
            if (cp != null && cp.getLastCommittedChunk() == -1) {
                log.info("Table {} already completed, skipping", pt.getSourceTable());
                continue;
            }

            log.info("--- Processing table {}/{}: {} ---", i + 1, tables.size(), pt.getSourceTable());

            // Execute chunk loop for this table
            executeChunkLoop(ctx, pt, cp, totalRowsAllTables);

            // Mark table as completed in checkpoint (chunk = -1 sentinel)
            checkpointManager.forceCheckpoint(Checkpoint.builder()
                    .pipelineId(ctx.getPipelineId())
                    .tableName(pt.getSourceTable())
                    .currentTableIndex(i)
                    .lastCommittedChunk(-1)  // sentinel: table done
                    .rowsProcessed(ctx.getTotalRowsProcessed().get())
                    .timestamp(Instant.now())
                    .build());
        }
    }

    // =========================================================================
    // CHUNK LOOP — the inner heart
    // =========================================================================

    private void executeChunkLoop(ExecutionContext ctx, PipelineTable pt,
                                  Checkpoint resumeCheckpoint, long totalRowsAllTables) {

        DatabaseConnector sourceConnector = connectorFactory.getConnector(ctx.getSourceConfig().getDbType());
        DatabaseConnector targetConnector = connectorFactory.getConnector(ctx.getTargetConfig().getDbType());

        int workerCount = parallelConfig.resolveWorkerCount(ctx.getPipeline().getParallelWorkers());

        if (workerCount > 1) {
            // Parallel path
            parallelChunkProcessor.process(ctx, pt, sourceConnector, targetConnector, resumeCheckpoint, totalRowsAllTables, workerCount);
            return;
        }

        String pkColumn = sourceConnector.getPrimaryKeyColumn(ctx.getSourceConfig(), pt.getSourceTable());

        // int chunkSize = ctx.getPipeline().getChunkSize();
        ChunkSizeTuner.TuningResult tuning = chunkSizeTuner.tune(sourceConnector, ctx.getSourceConfig(), pt.getSourceTable(), ctx.getPipeline().getChunkSize());
        int chunkSize = tuning.getRecommendedChunkSize();

        // Resume: pick up from last committed PK
        String lastPkValue = (resumeCheckpoint != null) ? resumeCheckpoint.getLastCommittedPk() : null;
        long chunkNumber = (resumeCheckpoint != null) ? resumeCheckpoint.getLastCommittedChunk() + 1 : 0;

        // Get pre-built filter chain for this table
        FilterChain filterChain = ctx.getFilterChains().getOrDefault(pt.getId(), new FilterChain(List.of()));

        // Pre-compute estimated row count once (not per chunk — was being called every iteration before)
        long totalRowsInTable = sourceConnector.getEstimatedRowCount(ctx.getSourceConfig(), pt.getSourceTable());

        // ===================================================================
        // READ-AHEAD PIPELINE: while writing chunk N, read chunk N+1 async
        // This overlaps I/O so the CPU never sits idle waiting for the DB.
        // ===================================================================
        java.util.concurrent.CompletableFuture<List<Map<String, Object>>> readAheadFuture = null;

        while (true) {
            // --- Check for pause/stop commands ---
            if (commandRegistry.isPauseRequested(ctx.getPipelineId())) {
                saveCurrentCheckpoint(ctx, pt.getSourceTable(), chunkNumber - 1, lastPkValue);
                commandRegistry.clearCommand(ctx.getPipelineId());
                ctx.markPaused();
                throw new PipelinePausedException("Paused after chunk " + (chunkNumber - 1));
            }
            if (commandRegistry.isStopRequested(ctx.getPipelineId())) {
                saveCurrentCheckpoint(ctx, pt.getSourceTable(), chunkNumber - 1, lastPkValue);
                commandRegistry.clearCommand(ctx.getPipelineId());
                throw new PipelineStoppedException("Stopped by user");
            }

            ctx.setCurrentChunkNumber(chunkNumber);
            long t0 = System.currentTimeMillis();

            // --- STEP 1: READ chunk (or await read-ahead from previous iteration) ---
            List<Map<String, Object>> sourceRecords;
            if (readAheadFuture != null) {
                try {
                    sourceRecords = readAheadFuture.get();
                } catch (Exception e) {
                    Throwable cause = e.getCause() != null ? e.getCause() : e;
                    throw new com.datashifter.common.exceptions.DatashifterException(
                            "Read-ahead failed on " + pt.getSourceTable() + ": " + cause.getMessage());
                }
                readAheadFuture = null;
            } else {
                sourceRecords = sourceConnector.readChunk(
                        ctx.getSourceConfig(), pt.getSourceTable(), pkColumn, lastPkValue, chunkSize);
            }

            long t1 = System.currentTimeMillis();
            if (sourceRecords.isEmpty()) {
                log.info("Table {} — no more records. Total chunks: {}", pt.getSourceTable(), chunkNumber);
                break;
            }

            // --- STEP 1b: KICK OFF READ-AHEAD for next chunk ---
            // While we transform + write this chunk, the next read happens in parallel
            String currentLastPk = extractLastPk(sourceRecords, pkColumn);
            final String readAheadPk = currentLastPk;
            final DatabaseConnector srcConn = sourceConnector;
            readAheadFuture = java.util.concurrent.CompletableFuture.supplyAsync(() ->
                    srcConn.readChunk(ctx.getSourceConfig(), pt.getSourceTable(), pkColumn, readAheadPk, chunkSize)
            );

            // --- STEP 2: FILTER rows ---
            List<Map<String, Object>> filteredRecords = filterChain.apply(sourceRecords);
            long t2 = System.currentTimeMillis();

            if (filteredRecords.isEmpty()) {
                lastPkValue = currentLastPk;
                chunkNumber++;
                continue;
            }

            // --- STEP 3 + 4: TRANSFORM + MAP + WRITE to each target table ---
            List<Map<String, Object>> lastTargetRecords = List.of();

            for (TargetTableMapping ttm : pt.getTargetTableMappings()) {
                TargetTableContext ttc = ctx.getTargetTableContexts().get(ttm.getId());
                if (ttc == null) {
                    log.warn("No target context for TTM {}, skipping", ttm.getId());
                    continue;
                }

                long tw0 = System.currentTimeMillis();
                ColumnMapperService.BatchMappingResult mappingResult =
                        columnMapperService.mapBatch(filteredRecords, ttc.getColumnMappings());
                List<Map<String, Object>> targetRecords = mappingResult.getTargetRecords();
                long tw1 = System.currentTimeMillis();

                // WRITE to target
                WriteResult result = writeStrategyExecutor.write(targetConnector, ctx.getTargetConfig(), ttc, targetRecords);
                long tw2 = System.currentTimeMillis();

                handleWriteResult(ctx, pt, ttm, result, chunkNumber);
                lastTargetRecords = targetRecords;

                if (chunkNumber < 10) {
                    log.info("PERF-DETAIL chunk={}: map={}ms write={}ms",
                            chunkNumber, tw1 - tw0, tw2 - tw1);
                }
            }
            long t3 = System.currentTimeMillis();

            // --- STEP 7: UPDATE CURSOR ---
            lastPkValue = currentLastPk;
            long rowsInChunk = filteredRecords.size();
            ctx.incrementRowsProcessed(rowsInChunk);

            // --- STEP 8: SAVE CHECKPOINT ---
            saveCurrentCheckpoint(ctx, pt.getSourceTable(), chunkNumber, lastPkValue);
            long t4 = System.currentTimeMillis();

            // --- STEP 9: PUBLISH PROGRESS ---
            publishProgress(ctx, pt, chunkNumber, rowsInChunk, totalRowsInTable, totalRowsAllTables, lastTargetRecords);
            long t5 = System.currentTimeMillis();

            // Timing diagnostics for first 10 chunks
            if (chunkNumber < 10) {
                log.info("PERF chunk={} rows={}: read={}ms filter={}ms transform+write={}ms checkpoint={}ms publish={}ms TOTAL={}ms",
                        chunkNumber, rowsInChunk, t1 - t0, t2 - t1, t3 - t2, t4 - t3, t5 - t4, t5 - t0);
            }

            chunkNumber++;
        }
    }

    // =========================================================================
    // WRITE RESULT HANDLING
    // =========================================================================

    private void handleWriteResult(ExecutionContext ctx, PipelineTable pt,
                                   TargetTableMapping ttm, WriteResult result, long chunkNumber) {
        if (result.getFailureCount() == 0) return;

        long errorCount = ctx.incrementErrors(result.getFailureCount());
        boolean ignoreExceptions = ctx.getPipeline().getIgnoreExceptions();
        boolean logSourceRow = ctx.getPipeline().getLogSourceRow();

        for (WriteResult.FailedRecord failed : result.getFailedRecords()) {
            // Build enriched error message with context
            String rawError = failed.getErrorMessage();
            String enrichedMessage = enrichErrorMessage(rawError, failed.getRecord(), pt.getSourceTable(), ttm.getTargetTable());

            log.error("WRITE ERROR: pipeline={}, table={} → {}, chunk={}, error={}", ctx.getPipelineId(), pt.getSourceTable(), ttm.getTargetTable(), chunkNumber, enrichedMessage);

            // Publish error event to monitor-service
            ErrorEvent event = ErrorEvent.builder()
                    .pipelineId(ctx.getPipelineId())
                    .executionLogId(ctx.getExecutionLogId())
                    .errorType(resolveErrorType(failed.getErrorType()))
                    .sourceTable(pt.getSourceTable())
                    .targetTable(ttm.getTargetTable())
                    .chunkNumber(chunkNumber)
                    .errorMessage(enrichedMessage)
                    .sourceRowData(logSourceRow ? serializeRecord(failed.getRecord()) : null)
                    .pipelineStopped(!ignoreExceptions)
                    .timestamp(Instant.now())
                    .build();
            kafkaTemplate.send(KafkaTopics.PIPELINE_ERRORS, event);
        }

        // If not ignoring exceptions — stop the pipeline
        if (!ignoreExceptions) {
            String firstError = result.getFailedRecords().isEmpty() ? "Unknown error"
                    : enrichErrorMessage(result.getFailedRecords().get(0).getErrorMessage(),
                    result.getFailedRecords().get(0).getRecord(), pt.getSourceTable(), ttm.getTargetTable());
            throw new DatashifterException(String.format(
                    "Write failed: %d errors on %s → %s at chunk %d. First error: %s. Pipeline stopped (ignoreExceptions=false).",
                    result.getFailureCount(), pt.getSourceTable(), ttm.getTargetTable(), chunkNumber, firstError));
        }

        // If ignoring but threshold exceeded — stop
        if (ctx.isErrorThresholdExceeded()) {
            throw new DatashifterException(String.format(
                    "Error threshold exceeded: %d errors (max: %d). Pipeline stopped.",
                    errorCount, ctx.getPipeline().getMaxErrorThreshold()));
        }
    }

    /**
     * Enrich a raw DB error message with human-readable context.
     */
    private String enrichErrorMessage(String rawError, Map<String, Object> record, String sourceTable, String targetTable) {
        if (rawError == null) return "Unknown write error";

        StringBuilder msg = new StringBuilder();

        // Column index out of range — mismatch between mapped columns and INSERT SQL
        if (rawError.contains("column index is out of range")) {
            int recordCols = record != null ? record.size() : 0;
            msg.append(String.format("Column count mismatch: target record has %d columns but INSERT expects fewer. ", recordCols));
            msg.append("Check if auto-generated PK (e.g., SERIAL id) is mapped — it should be excluded for INSERT_ONLY, or use UPSERT mode. ");
            if (record != null) msg.append("Columns in record: ").append(record.keySet());
            return msg.toString();
        }

        // Type mismatch
        if (rawError.contains("is of type") && rawError.contains("but expression is of type")) {
            msg.append("Type mismatch: ").append(rawError);
            msg.append(" — Add a transform (TO_DATE, TO_NUMBER, TO_STRING) to convert the source value before writing.");
            return msg.toString();
        }

        // NOT NULL violation
        if (rawError.contains("violates not-null constraint")) {
            msg.append("NOT NULL violation: ").append(rawError);
            msg.append(" — Either map a source column to this target column, add a system value (STATIC_VALUE/CURRENT_TIMESTAMP), or use DEFAULT_IF_NULL transform.");
            return msg.toString();
        }

        // Unique constraint violation
        if (rawError.contains("duplicate key") || rawError.contains("unique constraint")) {
            msg.append("Duplicate key: ").append(rawError);
            msg.append(" — The target table already has a row with this key. Use UPSERT write mode to handle duplicates, or TRUNCATE the target table before re-running.");
            return msg.toString();
        }

        // Foreign key violation
        if (rawError.contains("foreign key constraint")) {
            msg.append("Foreign key violation: ").append(rawError);
            msg.append(" — The referenced row doesn't exist in the parent table. Check table execution order and ensure parent tables are migrated first.");
            return msg.toString();
        }

        // Check constraint violation
        if (rawError.contains("check constraint")) {
            msg.append("Check constraint violation: ").append(rawError);
            msg.append(" — The value doesn't meet the table's CHECK constraint. Review the transform logic or source data.");
            return msg.toString();
        }

        // Transaction aborted (cascading from a previous error)
        if (rawError.contains("current transaction is aborted")) {
            return "Cascading error: a previous row in this batch failed, causing the entire batch to abort. Enable 'Ignore Exceptions' in pipeline settings to skip bad rows.";
        }

        // Default — return raw error
        return rawError;
    }

    // =========================================================================
    // CONTEXT BUILDER
    // =========================================================================

    private ExecutionContext buildContext(Pipeline pipeline, String executionLogId) {
        Connection sourceConn = connectionRepo.findById(pipeline.getSourceConnectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Source connection", pipeline.getSourceConnectionId()));
        Connection targetConn = connectionRepo.findById(pipeline.getTargetConnectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Target connection", pipeline.getTargetConnectionId()));

        ExecutionContext ctx = ExecutionContext.builder()
                .pipelineId(pipeline.getId())
                .executionLogId(executionLogId)
                .pipeline(pipeline)
                .sourceConfig(toConnectionConfig(sourceConn, pipeline.getSourcePoolSize()))
                .targetConfig(toConnectionConfig(targetConn, pipeline.getTargetPoolSize()))
                .startedAt(Instant.now())
                .build();

        int srcPool = pipeline.getSourcePoolSize() != null ? pipeline.getSourcePoolSize() : 10;
        int tgtPool = pipeline.getTargetPoolSize() != null ? pipeline.getTargetPoolSize() : 10;
        log.info("Connection pools: Source DB = {} connections, Target DB = {} connections", srcPool, tgtPool);

        // Pre-build filter chains and target table contexts
        DatabaseConnector sourceConnector = connectorFactory.getConnector(ctx.getSourceConfig().getDbType());
        DatabaseConnector targetConnector = connectorFactory.getConnector(ctx.getTargetConfig().getDbType());

        for (PipelineTable pt : pipeline.getPipelineTables()) {
            // Build filter chain
            List<RowFilter> filters = pt.getFilters().stream()
                    .sorted(Comparator.comparing(Filter::getFilterOrder))
                    .map(f -> FilterChain.createFilter(f.getColumnName(), f.getOperator(), f.getValue()))
                    .collect(Collectors.toList());
            ctx.getFilterChains().put(pt.getId(), new FilterChain(filters));

            // Build target table contexts via ColumnMappingResolver
            for (TargetTableMapping ttm : pt.getTargetTableMappings()) {
                TargetTableContext ttc = columnMappingResolver.resolve(
                        ttm, sourceConnector, targetConnector,
                        ctx.getSourceConfig(), ctx.getTargetConfig(), pt.getSourceTable());
                columnMappingResolver.validate(ttc);
                writeStrategyExecutor.validateStrategy(ttc);
                ctx.getTargetTableContexts().put(ttm.getId(), ttc);
            }
        }

        log.info("Context built: {} tables, {} target mappings, {} filter chains",
                pipeline.getPipelineTables().size(),
                ctx.getTargetTableContexts().size(),
                ctx.getFilterChains().size());
        return ctx;
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private void saveCurrentCheckpoint(ExecutionContext ctx, String tableName,
                                       long chunkNumber, String lastPkValue) {
        checkpointManager.forceCheckpoint(Checkpoint.builder()
                .pipelineId(ctx.getPipelineId())
                .tableName(tableName)
                .currentTableIndex(ctx.getCurrentTableIndex())
                .lastCommittedChunk(chunkNumber)
                .lastCommittedPk(lastPkValue)
                .rowsProcessed(ctx.getTotalRowsProcessed().get())
                .timestamp(Instant.now())
                .build());
    }

    private void publishProgress(ExecutionContext ctx, PipelineTable pt, long chunkNumber, long rowsInChunk, long totalRowsInTable, long totalRowsAllTables, List<Map<String, Object>> targetRecords) {

        // Only include inflight records if preview is enabled
        boolean previewEnabled = ctx.getPipeline().getPreviewInflightRecords() != null
                && ctx.getPipeline().getPreviewInflightRecords();
        List<Map<String, Object>> inflight = List.of();
        if (previewEnabled && targetRecords != null && !targetRecords.isEmpty()) {
            inflight = targetRecords.subList(Math.max(0, targetRecords.size() - 100), targetRecords.size());
        }

        long rowsProcessed = ctx.getTotalRowsProcessed().get();
        long rowsPerSec = ctx.computeRowsPerSec();
        long avgRowsPerSec = ctx.computeAvgRowsPerSec();

        // Calculate ETA from average throughput (more stable than instantaneous)
        String eta = "—";
        if (avgRowsPerSec > 0 && totalRowsAllTables > rowsProcessed) {
            long remainingRows = totalRowsAllTables - rowsProcessed;
            long remainingSecs = remainingRows / avgRowsPerSec;
            eta = formatEta(remainingSecs);
        }

        ProgressEvent event = ProgressEvent.builder()
                .pipelineId(ctx.getPipelineId())
                .executionLogId(ctx.getExecutionLogId())
                .tableName(pt.getSourceTable())
                .tableIndex(ctx.getCurrentTableIndex())
                .totalTables(ctx.getPipeline().getPipelineTables().size())
                .chunkNumber(chunkNumber)
                .rowsProcessedInChunk(rowsInChunk)
                .totalRowsProcessed(rowsProcessed)
                .totalRowsInTable(totalRowsInTable)
                .overallProgress(ctx.computeOverallProgress(totalRowsAllTables))
                .rowsPerSec(rowsPerSec)
                .avgRowsPerSec(avgRowsPerSec)
                .eta(eta)
                .timestamp(Instant.now())
                .inflightRecords(inflight)
                .build();
        kafkaTemplate.send(KafkaTopics.PIPELINE_PROGRESS, event);
    }

    private String formatEta(long totalSeconds) {
        if (totalSeconds < 60) return totalSeconds + "sec";
        long hours = totalSeconds / 3600;
        long minutes = (totalSeconds % 3600) / 60;
        long secs = totalSeconds % 60;
        if (hours > 0) return String.format("%dhr %dmin %dsec", hours, minutes, secs);
        return String.format("%dmin %dsec", minutes, secs);
    }

    private void publishStatus(ExecutionContext ctx, PipelineStatus from,
                               PipelineStatus to, String reason) {
        kafkaTemplate.send(KafkaTopics.PIPELINE_STATUS, StatusChangeEvent.builder()
                .pipelineId(ctx.getPipelineId())
                .executionLogId(ctx.getExecutionLogId())
                .previousStatus(from)
                .newStatus(to)
                .reason(reason)
                .timestamp(Instant.now())
                .build());
    }

    private long estimateTotalRows(ExecutionContext ctx, List<PipelineTable> tables) {
        DatabaseConnector sourceConnector = connectorFactory.getConnector(ctx.getSourceConfig().getDbType());
        long total = 0;
        for (PipelineTable pt : tables) {
            total += sourceConnector.getEstimatedRowCount(ctx.getSourceConfig(), pt.getSourceTable());
        }
        return total;
    }

    private String extractLastPk(List<Map<String, Object>> records, String pkColumn) {
        if (records.isEmpty() || pkColumn == null) return null;
        Object lastVal = records.get(records.size() - 1).get(pkColumn);
        return lastVal != null ? lastVal.toString() : null;
    }

    private ConnectionConfig toConnectionConfig(Connection conn, Integer poolSize) {
        return ConnectionConfig.builder()
                .connectionId(conn.getId())
                .dbType(conn.getDbType())
                .host(conn.getHost())
                .port(conn.getPort())
                .databaseName(conn.getDatabaseName())
                .schemaName(conn.getSchemaName())
                .username(conn.getUsername())
                .password(EncryptionUtil.decrypt(conn.getEncryptedPassword()))
                .maxPoolSize(poolSize != null ? poolSize : 10)
                .build();
    }

    private ErrorType resolveErrorType(String errorType) {
        try {
            return ErrorType.valueOf(errorType);
        } catch (Exception e) {
            return ErrorType.UNKNOWN;
        }
    }

    private String serializeRecord(Map<String, Object> record) {
        try {
            return objectMapper.writeValueAsString(record);
        } catch (Exception e) {
            return record.toString();
        }
    }

    // =========================================================================
    // INTERNAL SIGNAL EXCEPTIONS (flow control, not real errors)
    // =========================================================================

    private static class PipelinePausedException extends RuntimeException {
        PipelinePausedException(String msg) { super(msg); }
    }

    private static class PipelineStoppedException extends RuntimeException {
        PipelineStoppedException(String msg) { super(msg); }
    }
}