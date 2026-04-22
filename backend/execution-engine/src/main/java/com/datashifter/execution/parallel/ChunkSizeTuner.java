package com.datashifter.execution.parallel;

import com.datashifter.common.dtos.ConnectionDtos.ColumnMetadata;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.datashifter.connector.spi.interfaces.DatabaseConnector;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Auto-tunes chunk size per table based on table characteristics.
 *
 * Strategy:
 *   1. Estimate average row size from column metadata (type + maxLength)
 *   2. Compute chunk size that fits within the target memory budget
 *   3. Clamp between min and max bounds
 *   4. Adjust based on row count (tiny tables get smaller chunks, huge tables get larger)
 *   5. Optionally sample actual rows for more accurate sizing
 *
 * The tuned value overrides pipeline.chunkSize for that specific table.
 * If tuning is disabled or fails, falls back to the pipeline's configured chunkSize.
 *
 * Configuration:
 *   datashifter.tuning.enabled=true
 *   datashifter.tuning.target-chunk-memory-mb=50
 *   datashifter.tuning.min-chunk-size=1000
 *   datashifter.tuning.max-chunk-size=100000
 *   datashifter.tuning.sample-rows=10
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChunkSizeTuner {

    private final TuningConfig tuningConfig;

    /**
     * Compute optimal chunk size for a specific table.
     *
     * @param connector       source DB connector
     * @param config          source connection config
     * @param tableName       table to analyze
     * @param defaultChunkSize pipeline's configured default
     * @return                tuning result with recommended chunk size and reasoning
     */
    public TuningResult tune(DatabaseConnector connector, ConnectionConfig config,
                              String tableName, int defaultChunkSize) {

        if (!tuningConfig.isEnabled()) {
            return TuningResult.builder()
                    .tableName(tableName).recommendedChunkSize(defaultChunkSize)
                    .reason("Auto-tuning disabled").tuned(false).build();
        }

        try {
            // Step 1: Get table metadata
            List<ColumnMetadata> columns = connector.getColumns(config, tableName);
            long rowCount = connector.getEstimatedRowCount(config, tableName);

            // Step 2: Estimate average row size (bytes)
            long estimatedRowBytes = estimateRowSize(columns);

            // Step 3: Optionally sample actual rows for better estimate
            if (tuningConfig.getSampleRows() > 0 && rowCount > 0) {
                long sampledSize = sampleActualRowSize(connector, config, tableName, columns);
                if (sampledSize > 0) {
                    // Blend: 70% sampled + 30% estimated (sampled is more accurate but may not be representative)
                    estimatedRowBytes = (sampledSize * 7 + estimatedRowBytes * 3) / 10;
                }
            }

            // Step 4: Compute chunk size from memory budget
            long targetMemoryBytes = tuningConfig.getTargetChunkMemoryMb() * 1024L * 1024L;
            int computedChunkSize = (int) Math.max(1, targetMemoryBytes / Math.max(1, estimatedRowBytes));

            // Step 5: Apply row count heuristics
            computedChunkSize = applyRowCountHeuristics(computedChunkSize, rowCount);

            // Step 6: Clamp
            int finalChunkSize = clamp(computedChunkSize,
                    tuningConfig.getMinChunkSize(), tuningConfig.getMaxChunkSize());

            String reason = String.format(
                    "rowCount=%d, cols=%d, estRowSize=%dB, memBudget=%dMB → computed=%d → clamped=%d",
                    rowCount, columns.size(), estimatedRowBytes,
                    tuningConfig.getTargetChunkMemoryMb(), computedChunkSize, finalChunkSize);

            log.info("Chunk tuning for {}: {} (default was {})", tableName, reason, defaultChunkSize);

            return TuningResult.builder()
                    .tableName(tableName).recommendedChunkSize(finalChunkSize)
                    .estimatedRowBytes(estimatedRowBytes).rowCount(rowCount)
                    .columnCount(columns.size()).reason(reason).tuned(true).build();

        } catch (Exception e) {
            log.warn("Chunk tuning failed for {}: {} — using default {}", tableName, e.getMessage(), defaultChunkSize);
            return TuningResult.builder()
                    .tableName(tableName).recommendedChunkSize(defaultChunkSize)
                    .reason("Tuning failed: " + e.getMessage()).tuned(false).build();
        }
    }

    // =========================================================================
    // ROW SIZE ESTIMATION — from column metadata
    // =========================================================================

    /**
     * Estimate average row size from column types and max lengths.
     * Conservative: uses average fill ratio, not max.
     */
    private long estimateRowSize(List<ColumnMetadata> columns) {
        long totalBytes = 0;

        for (ColumnMetadata col : columns) {
            totalBytes += estimateColumnSize(col);
        }

        // Add 20% overhead for Java object wrappers, Map entries, etc.
        return (long) (totalBytes * 1.2);
    }

    private long estimateColumnSize(ColumnMetadata col) {
        String type = col.getDataType() != null ? col.getDataType().toUpperCase() : "STRING";

        // Fixed-size types
        if (type.contains("INT") || type.contains("NUMBER") || type.contains("NUMERIC")) return 8;
        if (type.contains("FLOAT") || type.contains("DOUBLE") || type.contains("REAL")) return 8;
        if (type.contains("BOOL")) return 1;
        if (type.contains("DATE") || type.contains("TIMESTAMP")) return 24;

        // Variable-size types — use maxLength or heuristic average
        if (type.contains("VARCHAR") || type.contains("STRING") || type.contains("TEXT")
                || type.contains("CHAR") || type.contains("CLOB") || type.contains("NVARCHAR")) {
            if (col.getMaxLength() != null && col.getMaxLength() > 0) {
                // Assume average fill is 40% of max length
                return (long) (col.getMaxLength() * 0.4);
            }
            // No max length — assume medium text (200 bytes average)
            if (type.contains("CLOB") || type.contains("TEXT")) return 2000;
            return 200;
        }

        if (type.contains("BLOB") || type.contains("BYTES") || type.contains("BINARY")) return 1000;
        if (type.contains("JSON")) return 500;

        // Unknown type — conservative default
        return 100;
    }

    // =========================================================================
    // SAMPLING — read a few actual rows to measure real size
    // =========================================================================

    private long sampleActualRowSize(DatabaseConnector connector, ConnectionConfig config,
                                      String tableName, List<ColumnMetadata> columns) {
        try {
            String pkColumn = connector.getPrimaryKeyColumn(config, tableName);
            if (pkColumn == null) return 0;

            List<Map<String, Object>> sampleRows = connector.readChunk(
                    config, tableName, pkColumn, null, tuningConfig.getSampleRows());

            if (sampleRows.isEmpty()) return 0;

            long totalBytes = 0;
            for (Map<String, Object> row : sampleRows) {
                for (Object value : row.values()) {
                    totalBytes += estimateValueSize(value);
                }
            }

            return totalBytes / sampleRows.size();
        } catch (Exception e) {
            log.debug("Row sampling failed for {}: {}", tableName, e.getMessage());
            return 0;
        }
    }

    private long estimateValueSize(Object value) {
        if (value == null) return 0;
        if (value instanceof String s) return s.length() * 2L; // Java chars are 2 bytes
        if (value instanceof byte[] b) return b.length;
        if (value instanceof Number) return 8;
        if (value instanceof Boolean) return 1;
        return value.toString().length() * 2L;
    }

    // =========================================================================
    // ROW COUNT HEURISTICS
    // =========================================================================

    private int applyRowCountHeuristics(int computed, long rowCount) {
        if (rowCount <= 0) return computed; // unknown row count — use computed

        // Tiny tables (< 5K rows): no point in large chunks
        if (rowCount < 5_000) return Math.min(computed, (int) rowCount);

        // Small tables (5K-100K): moderate chunks
        if (rowCount < 100_000) return Math.min(computed, 5_000);

        // Medium tables (100K-10M): computed value is fine
        if (rowCount < 10_000_000) return computed;

        // Large tables (10M-100M): bump up for throughput
        if (rowCount < 100_000_000) return Math.max(computed, 20_000);

        // Huge tables (100M+): maximize chunk size
        return Math.max(computed, 50_000);
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    // =========================================================================
    // RESULT DTO
    // =========================================================================

    @Getter @Builder
    public static class TuningResult {
        private final String tableName;
        private final int recommendedChunkSize;
        private final long estimatedRowBytes;
        private final long rowCount;
        private final int columnCount;
        private final String reason;
        private final boolean tuned;
    }

    // =========================================================================
    // CONFIGURATION
    // =========================================================================

    @Configuration
    @ConfigurationProperties(prefix = "datashifter.tuning")
    @Getter
    @lombok.Setter
    public static class TuningConfig {

        /** Master switch for auto-tuning */
        private boolean enabled = false;

        /** Target memory per chunk in MB. Default 50MB. */
        private int targetChunkMemoryMb = 50;

        /** Minimum chunk size (won't go below this) */
        private int minChunkSize = 1000;

        /** Maximum chunk size (won't go above this) */
        private int maxChunkSize = 100000;

        /** Number of sample rows to read for actual size estimation (0 = skip sampling) */
        private int sampleRows = 10;
    }
}