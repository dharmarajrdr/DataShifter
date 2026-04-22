package com.datashifter.execution.parallel;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.Map;

/**
 * Represents a single chunk of source records ready for processing.
 *
 * Lifecycle: Reader produces → Queue → Worker consumes → Filter → Transform → Write → Checkpoint
 *
 * The chunkNumber and lastPkValue are critical for:
 *   - Checkpoint ordering (we only checkpoint up to the lowest completed chunk)
 *   - Resume correctness (pick up from lastPkValue of last fully committed chunk)
 */
@Getter
@Builder
public class ChunkTask {

    /** Sequential chunk number assigned by reader */
    private final long chunkNumber;

    /** The raw source records */
    private final List<Map<String, Object>> records;

    /** PK value of the LAST record in this chunk — used for cursor advancement */
    private final String lastPkValue;

    /** PK value of the FIRST record — used for range tracking */
    private final String firstPkValue;

    /** Number of records in this chunk (before filtering) */
    private final int recordCount;

    /** Poison pill sentinel — signals workers to shut down */
    private final boolean poison;

    public static ChunkTask poison() {
        return ChunkTask.builder().poison(true).chunkNumber(-1).build();
    }
}