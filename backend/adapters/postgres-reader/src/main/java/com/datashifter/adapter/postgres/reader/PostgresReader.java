package com.datashifter.adapter.postgres.reader;

import com.datashifter.adapter.sdk.AdapterConfig;
import com.datashifter.adapter.sdk.DataReader;
import com.datashifter.adapter.sdk.DataRecord;
import com.datashifter.adapter.sdk.RecordOperation;
import com.datashifter.adapter.sdk.SchemaDiscoverer;
import com.datashifter.adapter.sdk.annotations.AdapterConfigProperty;
import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.adapter.sdk.annotations.DataShifterAdapter;
import com.datashifter.adapter.sdk.metadata.ColumnMetadata;
import com.datashifter.adapter.sdk.metadata.TableMetadata;
import lombok.extern.slf4j.Slf4j;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * High-throughput batch reader adapter for PostgreSQL with primary key pagination.
 */
@DataShifterAdapter(
        id = "postgres-reader",
        name = "PostgreSQL Reader",
        description = "High-throughput batch reader for PostgreSQL with primary key pagination",
        type = AdapterType.READER,
        mode = AdapterMode.BATCH,
        category = "database",
        version = "1.0.0"
)
@AdapterConfigProperty(name = "connectionId", label = "Saved Connection", type = "connection", description = "Reference to a configured database connection")
@AdapterConfigProperty(name = "host", label = "Host", type = "string", description = "PostgreSQL server host or IP", defaultValue = "localhost")
@AdapterConfigProperty(name = "port", label = "Port", type = "number", description = "PostgreSQL listener port", defaultValue = "5432")
@AdapterConfigProperty(name = "databaseName", label = "Database Name", type = "string", description = "Target database name", required = true)
@AdapterConfigProperty(name = "schemaName", label = "Schema", type = "string", description = "Schema name", defaultValue = "public")
@AdapterConfigProperty(name = "username", label = "Username", type = "string", description = "Database user", required = true)
@AdapterConfigProperty(name = "password", label = "Password", type = "password", description = "Database password", required = true)
@AdapterConfigProperty(name = "maxPoolSize", label = "Connection Pool Size", type = "number", defaultValue = "5")
@Slf4j
public class PostgresReader implements DataReader, SchemaDiscoverer {

    private final PostgresConnectionHelper connectionHelper = new PostgresConnectionHelper();
    private boolean initialized = false;

    @Override
    public synchronized void init(AdapterConfig config) throws Exception {
        if (!initialized) {
            connectionHelper.init(config);
            initialized = true;
            log.info("Initialized PostgresReader adapter");
        }
    }

    private Connection acquireConnection(AdapterConfig config) throws Exception {
        if (!initialized) {
            init(config);
        }
        return connectionHelper.getConnection();
    }

    @Override
    public long testConnection(AdapterConfig config) throws Exception {
        long start = System.currentTimeMillis();
        try (Connection conn = acquireConnection(config);
             Statement stmt = conn.createStatement()) {
            stmt.execute("SELECT 1");
        }
        return System.currentTimeMillis() - start;
    }

    @Override
    public List<String> listTables(AdapterConfig config) throws Exception {
        List<String> tables = new ArrayList<>();
        String schema = config.getString("schemaName", "public");
        String sql = "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name";

        try (Connection conn = acquireConnection(config);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, schema);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    tables.add(rs.getString("table_name"));
                }
            }
        }
        return tables;
    }

    @Override
    public TableMetadata getTableMetadata(AdapterConfig config, String tableName) throws Exception {
        return TableMetadata.builder()
                .tableName(tableName)
                .schemaName(config.getString("schemaName", "public"))
                .columns(getColumns(config, tableName))
                .primaryKeyColumn(getPrimaryKeyColumn(config, tableName))
                .estimatedRowCount(getEstimatedRowCount(config, tableName))
                .build();
    }

    @Override
    public List<ColumnMetadata> getColumns(AdapterConfig config, String tableName) throws Exception {
        List<ColumnMetadata> columns = new ArrayList<>();
        String schema = config.getString("schemaName", "public");

        String sql = """
            SELECT c.column_name, c.data_type, c.is_nullable, c.character_maximum_length, c.numeric_precision, c.numeric_scale,
                   CASE WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0 END as is_pk
            FROM information_schema.columns c
            LEFT JOIN (
                SELECT kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = ? AND tc.table_name = ?
            ) pk ON c.column_name = pk.column_name
            WHERE c.table_schema = ? AND c.table_name = ?
            ORDER BY c.ordinal_position
            """;

        try (Connection conn = acquireConnection(config);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, schema);
            ps.setString(2, tableName);
            ps.setString(3, schema);
            ps.setString(4, tableName);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    columns.add(ColumnMetadata.builder()
                            .columnName(rs.getString("column_name"))
                            .dataType(rs.getString("data_type").toUpperCase())
                            .nullable("YES".equalsIgnoreCase(rs.getString("is_nullable")))
                            .primaryKey(rs.getInt("is_pk") == 1)
                            .maxLength(rs.getObject("character_maximum_length") != null ? rs.getInt("character_maximum_length") : null)
                            .precision(rs.getObject("numeric_precision") != null ? rs.getInt("numeric_precision") : null)
                            .scale(rs.getObject("numeric_scale") != null ? rs.getInt("numeric_scale") : null)
                            .build());
                }
            }
        }
        return columns;
    }

    @Override
    public String getPrimaryKeyColumn(AdapterConfig config, String tableName) throws Exception {
        String schema = config.getString("schemaName", "public");

        String sql = """
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = ? AND tc.table_name = ?
            ORDER BY kcu.ordinal_position LIMIT 1
            """;

        try (Connection conn = acquireConnection(config);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, schema);
            ps.setString(2, tableName);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getString("column_name");
                }
            }
        }
        return null;
    }

    public long getEstimatedRowCount(AdapterConfig config, String tableName) throws Exception {
        String schema = config.getString("schemaName", "public");
        String sql = """
            SELECT reltuples::bigint AS estimate FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = ? AND c.relname = ?
            """;

        try (Connection conn = acquireConnection(config);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, schema);
            ps.setString(2, tableName);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    long est = rs.getLong("estimate");
                    return Math.max(0L, est);
                }
            }
        }
        return 0L;
    }

    @Override
    public List<DataRecord> readChunk(AdapterConfig config,
                                      String tableName,
                                      String primaryKeyColumn,
                                      String lastPkValue,
                                      int chunkSize) throws Exception {
        List<DataRecord> records = new ArrayList<>(chunkSize);
        String schema = config.getString("schemaName", "public");
        String qualifiedTable = "\"" + schema + "\".\"" + tableName + "\"";
        String sql;

        if (lastPkValue != null && primaryKeyColumn != null) {
            sql = String.format("SELECT * FROM %s WHERE \"%s\" > ? ORDER BY \"%s\" LIMIT ?",
                    qualifiedTable, primaryKeyColumn, primaryKeyColumn);
        } else if (primaryKeyColumn != null) {
            sql = String.format("SELECT * FROM %s ORDER BY \"%s\" LIMIT ?",
                    qualifiedTable, primaryKeyColumn);
        } else {
            sql = String.format("SELECT * FROM %s LIMIT ?", qualifiedTable);
        }

        try (Connection conn = acquireConnection(config);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setFetchSize(Math.min(chunkSize, 5000));
            int paramIdx = 1;
            if (lastPkValue != null && primaryKeyColumn != null) {
                try {
                    ps.setLong(paramIdx++, Long.parseLong(lastPkValue));
                } catch (NumberFormatException e) {
                    ps.setString(paramIdx++, lastPkValue);
                }
            }
            ps.setInt(paramIdx, chunkSize);

            try (ResultSet rs = ps.executeQuery()) {
                ResultSetMetaData meta = rs.getMetaData();
                int colCount = meta.getColumnCount();
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<>(colCount);
                    for (int i = 1; i <= colCount; i++) {
                        row.put(meta.getColumnName(i), rs.getObject(i));
                    }
                    records.add(DataRecord.of(row, RecordOperation.READ));
                }
            }
        }
        return records;
    }

    @Override
    public void close() throws Exception {
        connectionHelper.close();
    }
}
