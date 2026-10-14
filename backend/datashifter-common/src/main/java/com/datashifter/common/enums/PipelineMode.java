package com.datashifter.common.enums;

/**
 * Execution mode for a pipeline.
 * BATCH: One-time or scheduled full table snapshot migration.
 * CDC: Continuous real-time Change Data Capture replication from log streams.
 * HYBRID: Automatic snapshot migration immediately followed by continuous CDC replication.
 */
public enum PipelineMode {
    BATCH,
    CDC,
    HYBRID
}
