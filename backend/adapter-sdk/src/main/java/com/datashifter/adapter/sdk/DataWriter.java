package com.datashifter.adapter.sdk;

import java.util.List;

/**
 * Common Service Provider Interface (SPI) for writing records to a target destination
 * (relational database, message broker, file system, or data warehouse).
 */
public interface DataWriter extends AutoCloseable {

    /**
     * Initialize target writer resources, connection pools, or message producers.
     *
     * @param config adapter configuration and credentials
     * @throws Exception if initialization fails
     */
    default void init(AdapterConfig config) throws Exception {
        // default no-op
    }

    /**
     * Writes a batch of records to the specified target using the chosen WriteMode.
     *
     * @param config           adapter configuration
     * @param targetTable      target table name, file path, or topic
     * @param records          list of transformed DataRecords ready to write
     * @param writeMode        write mode strategy (UPSERT, INSERT_ONLY, etc.)
     * @param primaryKeyColumn primary key column name in the target
     * @return WriteResult summary with success/failure metrics
     * @throws Exception on batch write failure
     */
    default WriteResult writeBatch(AdapterConfig config,
                                   String targetTable,
                                   List<DataRecord> records,
                                   WriteMode writeMode,
                                   String primaryKeyColumn) throws Exception {
        throw new UnsupportedOperationException("Batch writeBatch is not supported by this adapter");
    }

    /**
     * Applies an ordered batch of mutation events (INSERT, UPDATE, DELETE) using idempotent semantics.
     *
     * @param config           adapter configuration
     * @param targetTable      target table name, file path, or topic
     * @param records          ordered CDC mutation records
     * @param primaryKeyColumn primary key column name in the target
     * @return WriteResult summary
     * @throws Exception on mutation write failure
     */
    default WriteResult applyBatch(AdapterConfig config,
                                   String targetTable,
                                   List<DataRecord> records,
                                   String primaryKeyColumn) throws Exception {
        throw new UnsupportedOperationException("Streaming applyBatch is not supported by this adapter");
    }

    /**
     * Flush and close underlying database connections, file streams, or network channels.
     */
    @Override
    default void close() throws Exception {
        // default no-op
    }
}
