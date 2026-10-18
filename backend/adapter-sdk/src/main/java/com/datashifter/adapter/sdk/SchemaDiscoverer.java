package com.datashifter.adapter.sdk;

import com.datashifter.adapter.sdk.metadata.ColumnMetadata;
import com.datashifter.adapter.sdk.metadata.TableMetadata;

import java.util.List;

/**
 * Capability interface implemented by adapters that support schema discovery,
 * catalog inspection, and connection testing.
 */
public interface SchemaDiscoverer {

    /**
     * Test connectivity with the provided configuration and return roundtrip latency in milliseconds.
     *
     * @param config adapter configuration / credentials
     * @return latency in milliseconds
     * @throws Exception if connection cannot be established
     */
    long testConnection(AdapterConfig config) throws Exception;

    /**
     * List all accessible table or collection names in the configured schema / source.
     *
     * @param config adapter configuration
     * @return list of table names
     * @throws Exception if catalog query fails
     */
    List<String> listTables(AdapterConfig config) throws Exception;

    /**
     * Retrieve complete table metadata including column definitions and row count estimation.
     *
     * @param config adapter configuration
     * @param tableName table name
     * @return TableMetadata
     * @throws Exception if inspection fails
     */
    TableMetadata getTableMetadata(AdapterConfig config, String tableName) throws Exception;

    /**
     * Retrieve column metadata list for the specified table.
     *
     * @param config adapter configuration
     * @param tableName table name
     * @return list of column metadata
     * @throws Exception if inspection fails
     */
    List<ColumnMetadata> getColumns(AdapterConfig config, String tableName) throws Exception;

    /**
     * Retrieve primary key column name for the specified table.
     *
     * @param config adapter configuration
     * @param tableName table name
     * @return primary key column name, or null if no primary key exists
     * @throws Exception if inspection fails
     */
    String getPrimaryKeyColumn(AdapterConfig config, String tableName) throws Exception;
}
