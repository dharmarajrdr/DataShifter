package com.datashifter.execution.strategies.writers;

import com.datashifter.common.enums.WriteMode;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.datashifter.connector.spi.interfaces.DatabaseConnector;
import com.datashifter.connector.spi.interfaces.WriteResult;

import java.util.List;
import java.util.Map;

/**
 * Strategy interface for writing records to a target table.
 *
 * Each strategy defines:
 *   - Which WriteMode it handles
 *   - Pre-write validation (e.g., PK must exist for UPDATE_ONLY)
 *   - How to delegate to the connector's writeBatch
 *   - Post-write error classification
 *
 * The actual SQL/mutation generation is in the DatabaseConnector adapters.
 * Strategies control behavior and error semantics.
 */
public interface WriteStrategy {

    /** Which write mode this strategy handles */
    WriteMode getMode();

    /**
     * Write a batch of records to the target table.
     *
     * @param connector      the target DB connector (Oracle, Spanner, etc.)
     * @param config         decrypted target connection config
     * @param targetTable    target table name
     * @param records        transformed + mapped records ready to write
     * @param pkColumn       primary key column name in the target table
     * @return               write result with success/failure counts and failed records
     */
    WriteResult write(DatabaseConnector connector, ConnectionConfig config,
                      String targetTable, List<Map<String, Object>> records,
                      String pkColumn);

    /**
     * Validate that this strategy can execute with the given configuration.
     * Called once during context build, not per chunk.
     *
     * @throws IllegalArgumentException if configuration is invalid for this strategy
     */
    default void validate(String targetTable, String pkColumn, List<String> targetColumns) {
        // default: no validation
    }
}