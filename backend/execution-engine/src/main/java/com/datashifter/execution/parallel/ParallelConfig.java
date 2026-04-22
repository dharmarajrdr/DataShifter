package com.datashifter.execution.parallel;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Parallel processing configuration.
 *
 * In application.properties:
 *   datashifter.parallel.enabled=true
 *   datashifter.parallel.default-workers=4
 *   datashifter.parallel.max-workers=16
 *   datashifter.parallel.queue-capacity=8
 *   datashifter.parallel.read-ahead=2
 *
 * Per-pipeline override: Pipeline.parallelWorkers (0 = use default, null = use default)
 */
@Configuration
@ConfigurationProperties(prefix = "datashifter.parallel")
@Getter
@Setter
public class ParallelConfig {

    /** Master switch — false = all pipelines run sequential (Phase 1 behavior) */
    private boolean enabled = false;

    /** Default number of worker threads per pipeline (if pipeline doesn't override) */
    private int defaultWorkers = 4;

    /** Maximum worker threads allowed per pipeline */
    private int maxWorkers = 16;

    /**
     * Bounded queue capacity between reader and workers.
     * Controls memory: queueCapacity * chunkSize * avgRowSize = max memory.
     * E.g., 8 * 10000 * 500 bytes = ~40MB buffer.
     */
    private int queueCapacity = 8;

    /**
     * How many chunks the reader can read ahead of the slowest worker.
     * Larger = less reader idle time, but more memory.
     * This is effectively the same as queueCapacity — kept as alias for clarity.
     */
    private int readAhead = 2;

    /** Resolve effective worker count for a pipeline */
    public int resolveWorkerCount(Integer pipelineOverride) {
        if (!enabled) return 1; // sequential
        if (pipelineOverride != null && pipelineOverride > 0) {
            return Math.min(pipelineOverride, maxWorkers);
        }
        return defaultWorkers;
    }
}