package com.datashifter.adapter.sdk;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Common Service Provider Interface (SPI) for reading data from a source.
 * Adapters implement either chunked batch reading, continuous streaming, or both.
 */
public interface DataReader extends AutoCloseable {

    /**
     * Initialize reader resources, connection pools, or log file decoders.
     *
     * @param config adapter configuration and credentials
     * @throws Exception if initialization fails
     */
    default void init(AdapterConfig config) throws Exception {
        // default no-op
    }

    /**
     * Reads a chunk of records from a table using primary-key based cursor pagination.
     *
     * @param config           adapter configuration
     * @param tableName        source table name
     * @param primaryKeyColumn column name used for pagination ordering
     * @param lastPkValue      last committed primary key value from previous chunk (null for first chunk)
     * @param chunkSize        maximum number of records to return
     * @return list of DataRecords
     * @throws Exception on read failure
     */
    default List<DataRecord> readChunk(AdapterConfig config,
                                       String tableName,
                                       String primaryKeyColumn,
                                       String lastPkValue,
                                       int chunkSize) throws Exception {
        throw new UnsupportedOperationException("Batch readChunk is not supported by this adapter");
    }

    /**
     * Polls for the next batch of streaming events (CDC / event log) up to maxRecords or until timeout expires.
     *
     * @param maxRecords maximum number of records to return
     * @param timeout    maximum wait duration
     * @return list of DataRecords, empty if no events available
     * @throws Exception on unrecoverable polling/parsing errors
     */
    default List<DataRecord> poll(int maxRecords, Duration timeout) throws Exception {
        throw new UnsupportedOperationException("Streaming poll is not supported by this adapter");
    }

    /**
     * Commits the checkpoint in the reader's state tracker.
     *
     * @param checkpoint map of position coordinates (e.g. SCN, LSN, file offset)
     * @throws Exception if checkpoint persistence fails
     */
    default void commitCheckpoint(Map<String, Object> checkpoint) throws Exception {
        // default no-op
    }

    /**
     * Returns the current read position in the stream (e.g. SCN, LSN, offset).
     *
     * @return coordinate map or empty map if not streaming
     */
    default Map<String, Object> getCurrentPosition() {
        return Collections.emptyMap();
    }

    /**
     * Checks if more records/events are available or if the stream is actively tailing.
     *
     * @return true if more records can be consumed
     */
    default boolean hasNext() {
        return true;
    }

    /**
     * Close underlying connections, file handles, or decoders.
     */
    @Override
    default void close() throws Exception {
        // default no-op
    }
}
