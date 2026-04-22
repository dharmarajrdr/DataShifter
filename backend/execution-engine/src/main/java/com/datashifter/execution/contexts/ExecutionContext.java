package com.datashifter.execution.contexts;

import com.datashifter.common.models.*;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.datashifter.execution.strategies.filters.FilterChain;
import com.datashifter.execution.strategies.transformers.TransformerChain;
import lombok.*;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Mutable runtime context for a single pipeline execution.
 * Built once at the start of execute(), carried through the entire table loop.
 */
@Getter
@Setter
@Builder
public class ExecutionContext {

    /* --- Identity --- */
    private String pipelineId;
    private String executionLogId;
    private Pipeline pipeline;

    /* --- Connections (decrypted, ready to use) --- */
    private ConnectionConfig sourceConfig;
    private ConnectionConfig targetConfig;

    /* --- Progress counters --- */
    private final AtomicLong totalRowsProcessed = new AtomicLong(0);
    private final AtomicLong totalErrors = new AtomicLong(0);
    private Instant startedAt;

    /** Total milliseconds spent paused/errored — excluded from throughput calculation */
    private final AtomicLong pausedDurationMs = new AtomicLong(0);
    /** Timestamp when pipeline was last paused (null if running) */
    private volatile Instant pausedAt;

    /* --- Rows/sec tracking for instantaneous rate --- */
    private volatile long lastProgressRows = 0;
    private volatile long lastProgressTime = 0;

    /* --- Current table state (updated as we iterate tables) --- */
    private int currentTableIndex;
    private String currentTableName;
    private long currentChunkNumber;

    /* --- Pre-built chains per PipelineTable (keyed by pipelineTable.id) --- */
    @Builder.Default
    private Map<String, FilterChain> filterChains = new LinkedHashMap<>();

    /* --- Pre-built column mapping configs per TargetTableMapping (keyed by ttm.id) --- */
    @Builder.Default
    private Map<String, TargetTableContext> targetTableContexts = new LinkedHashMap<>();

    /**
     * Holds resolved mapping + transformer chains for a single target table.
     */
    @Getter @Setter @Builder
    public static class TargetTableContext {
        private String targetTable;
        private String writeMode;
        private String primaryKeyColumn;
        private List<ResolvedColumnMapping> columnMappings;

        /** Source columns that exist but are NOT mapped to any target column (M > N ignored cols) */
        @Builder.Default
        private List<String> unmappedSourceColumns = new ArrayList<>();
    }

    /**
     * One source→target column mapping with its transformer chain resolved.
     *
     * Three scenarios:
     *   1. MAPPED:           sourceColumn != null, mapped = true  → normal mapping
     *   2. UNMAPPED TARGET:  sourceColumn == null, mapped = false → target col has no source; uses defaultValue
     *   3. Source-only cols are NOT in this list — tracked in TargetTableContext.unmappedSourceColumns
     */
    @Getter @Setter @Builder
    public static class ResolvedColumnMapping {
        private String sourceColumn;       // null for unmapped target columns and target-only mappings
        private String sourceType;         // e.g., "VARCHAR2", "NUMBER"
        private String targetColumn;
        private String targetType;         // e.g., "INT64", "STRING", "DATE"
        private String defaultValue;       // for unmapped target cols (M < N)
        private boolean nullable;          // whether target column allows null
        private TransformerChain chain;    // null if no transforms

        @Builder.Default
        private boolean mapped = true;     // false for unmapped target columns

        /** True for target-only mappings — have transforms but no source column (e.g., CURRENT_TIMESTAMP) */
        @Builder.Default
        private boolean targetOnly = false;

        public boolean isUnmappedTarget() {
            return (sourceColumn == null || !mapped) && !targetOnly;
        }
    }

    /* --- Convenience --- */

    public long incrementRowsProcessed(long count) {
        return totalRowsProcessed.addAndGet(count);
    }

    public long incrementErrors(long count) {
        return totalErrors.addAndGet(count);
    }

    public boolean isErrorThresholdExceeded() {
        return totalErrors.get() >= pipeline.getMaxErrorThreshold();
    }

    public double computeOverallProgress(long totalRowsAllTables) {
        if (totalRowsAllTables == 0) return 0.0;
        return Math.min(100.0, (totalRowsProcessed.get() * 100.0) / totalRowsAllTables);
    }

    /**
     * Compute instantaneous rows/sec based on last chunk interval.
     * Capped at totalRowsProcessed to avoid displaying rate > total for small datasets.
     */
    public long computeRowsPerSec() {
        long now = Instant.now().toEpochMilli();
        long currentRows = totalRowsProcessed.get();
        long rate;

        if (lastProgressTime > 0) {
            long elapsedSinceLastPublish = Math.max(1, now - lastProgressTime);
            long rowsSinceLastPublish = currentRows - lastProgressRows;
            lastProgressRows = currentRows;
            lastProgressTime = now;
            rate = (rowsSinceLastPublish * 1000) / elapsedSinceLastPublish;
        } else {
            lastProgressRows = currentRows;
            lastProgressTime = now;
            rate = computeAvgRowsPerSec();
        }

        // Cap: rate should never display higher than total rows processed
        return Math.min(rate, currentRows);
    }

    /**
     * Compute average rows/sec across entire execution, excluding paused time.
     * Capped at totalRowsProcessed for small datasets.
     */
    public long computeAvgRowsPerSec() {
        long totalElapsed = Math.max(1, Instant.now().toEpochMilli() - startedAt.toEpochMilli());
        long activeElapsed = Math.max(1, totalElapsed - pausedDurationMs.get());
        long currentRows = totalRowsProcessed.get();
        long rate = (currentRows * 1000) / activeElapsed;
        return Math.min(rate, currentRows);
    }

    /** Call when pipeline is paused */
    public void markPaused() {
        pausedAt = Instant.now();
    }

    /** Call when pipeline resumes — accumulates pause duration */
    public void markResumed() {
        if (pausedAt != null) {
            pausedDurationMs.addAndGet(Instant.now().toEpochMilli() - pausedAt.toEpochMilli());
            pausedAt = null;
        }
    }
}