package com.datashifter.connector.spi.interfaces;

import com.datashifter.common.dtos.ConnectionDtos.ColumnMetadata;
import com.datashifter.common.dtos.ConnectionDtos.ForeignKeyMetadata;
import com.datashifter.common.dtos.ConnectionDtos.TableMetadata;
import com.datashifter.common.enums.DatabaseType;

import java.util.List;
import java.util.Map;

/**
 * Service Provider Interface for database connectors.
 *
 * To add a new database:
 * 1. Create a new class implementing this interface (e.g., PostgresConnector)
 * 2. Annotate with @Component
 * 3. Return the correct DatabaseType from getSupportedType()
 * 4. The ConnectorFactory will auto-discover it via Spring context
 *
 * No changes needed in existing code — fully pluggable.
 */
public interface DatabaseConnector {

    /** Which database type this connector handles */
    DatabaseType getSupportedType();

    /** Test connectivity and return latency in ms. Throws ConnectionException on failure. */
    long testConnection(ConnectionConfig config);

    /** List all table names in the configured schema/database */
    List<String> listTables(ConnectionConfig config);

    /** Get full metadata for a specific table */
    TableMetadata getTableMetadata(ConnectionConfig config, String tableName);

    /** Get column metadata for a table */
    List<ColumnMetadata> getColumns(ConnectionConfig config, String tableName);

    /** Get foreign key relationships for a table */
    List<ForeignKeyMetadata> getForeignKeys(ConnectionConfig config, String tableName);

    /** Get estimated row count for a table */
    long getEstimatedRowCount(ConnectionConfig config, String tableName);

    /** Read a chunk of records from a table using PK-based cursor pagination */
    List<Map<String, Object>> readChunk(ConnectionConfig config, String tableName,
                                         String primaryKeyColumn, String lastPkValue,
                                         int chunkSize);

    /** Write a batch of records to a target table using the specified write mode */
    WriteResult writeBatch(ConnectionConfig config, String tableName,
                           List<Map<String, Object>> records, String writeMode,
                           String primaryKeyColumn);

    /** Get the primary key column name for a table */
    String getPrimaryKeyColumn(ConnectionConfig config, String tableName);
}
