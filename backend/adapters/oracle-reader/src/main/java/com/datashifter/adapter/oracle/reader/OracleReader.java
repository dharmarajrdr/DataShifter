package com.datashifter.adapter.oracle.reader;

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
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * High-performance batch reader adapter for Oracle Database.
 */
@DataShifterAdapter(
        id = "oracle-reader",
        name = "Oracle Reader",
        description = "High-performance batch reader for Oracle Database with primary key pagination",
        type = AdapterType.READER,
        mode = AdapterMode.BATCH,
        category = "database",
        version = "1.0.0"
)
@AdapterConfigProperty(name = "connectionId", label = "Saved Connection", type = "connection", description = "Reference to a configured database connection")
@AdapterConfigProperty(name = "host", label = "Host", type = "string", description = "Oracle server host or IP", defaultValue = "localhost")
@AdapterConfigProperty(name = "port", label = "Port", type = "number", description = "Oracle listener port", defaultValue = "1521")
@AdapterConfigProperty(name = "databaseName", label = "Service Name / SID", type = "string", description = "Database Service Name (e.g. ORCLPDB1) or SID", required = true)
@AdapterConfigProperty(name = "schemaName", label = "Schema", type = "string", description = "Schema or user owning the tables", required = true)
@AdapterConfigProperty(name = "username", label = "Username", type = "string", description = "Database user", required = true)
@AdapterConfigProperty(name = "password", label = "Password", type = "password", description = "Database password", required = true)
@AdapterConfigProperty(name = "maxPoolSize", label = "Connection Pool Size", type = "number", defaultValue = "5")
@Slf4j
public class OracleReader implements DataReader, SchemaDiscoverer {

    private final OracleConnectionHelper connectionHelper = new OracleConnectionHelper();
    private boolean initialized = false;

    @Override
    public synchronized void init(AdapterConfig config) throws Exception {
        if (!initialized) {
            connectionHelper.init(config);
            initialized = true;
            log.info("Initialized OracleReader adapter");
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
            stmt.execute("SELECT 1 FROM DUAL");
        }
        return System.currentTimeMillis() - start;
    }

    @Override
    public List<String> listTables(AdapterConfig config) throws Exception {
        List<String> tables = new ArrayList<>();
        String schema = config.getString("schemaName", "").toUpperCase();
        String sql = "SELECT table_name FROM all_tables WHERE owner = ? ORDER BY table_name";

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
                .schemaName(config.getString("schemaName"))
                .columns(getColumns(config, tableName))
                .primaryKeyColumn(getPrimaryKeyColumn(config, tableName))
                .estimatedRowCount(getEstimatedRowCount(config, tableName))
                .build();
    }

    @Override
    public List<ColumnMetadata> getColumns(AdapterConfig config, String tableName) throws Exception {
        List<ColumnMetadata> columns = new ArrayList<>();
        String schema = config.getString("schemaName", "").toUpperCase();
        String table = tableName.toUpperCase();

        String sql = """
            SELECT c.column_name, c.data_type, c.nullable, c.data_length, c.data_precision, c.data_scale,
                   CASE WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0 END as is_pk
            FROM all_tab_columns c
            LEFT JOIN (
                SELECT cols.column_name FROM all_constraints cons
                JOIN all_cons_columns cols ON cons.constraint_name = cols.constraint_name
                AND cons.owner = cols.owner
                WHERE cons.constraint_type = 'P' AND cons.owner = ? AND cons.table_name = ?
            ) pk ON c.column_name = pk.column_name
            WHERE c.owner = ? AND c.table_name = ?
            ORDER BY c.column_id
            """;

        try (Connection conn = acquireConnection(config);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, schema); ps.setString(2, table);
            ps.setString(3, schema); ps.setString(4, table);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    columns.add(ColumnMetadata.builder()
                            .columnName(rs.getString("column_name"))
                            .dataType(rs.getString("data_type"))
                            .nullable("Y".equalsIgnoreCase(rs.getString("nullable")))
                            .primaryKey(rs.getInt("is_pk") == 1)
                            .maxLength(rs.getObject("data_length") != null ? rs.getInt("data_length") : null)
                            .precision(rs.getObject("data_precision") != null ? rs.getInt("data_precision") : null)
                            .scale(rs.getObject("data_scale") != null ? rs.getInt("data_scale") : null)
                            .build());
                }
            }
        }
        return columns;
    }

    @Override
    public String getPrimaryKeyColumn(AdapterConfig config, String tableName) throws Exception {
        String schema = config.getString("schemaName", "").toUpperCase();
        String table = tableName.toUpperCase();

        String sql = """
            SELECT cols.column_name FROM all_constraints cons
            JOIN all_cons_columns cols ON cons.constraint_name = cols.constraint_name AND cons.owner = cols.owner
            WHERE cons.constraint_type = 'P' AND cons.owner = ? AND cons.table_name = ?
            ORDER BY cols.position FETCH FIRST 1 ROW ONLY
            """;

        try (Connection conn = acquireConnection(config);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, schema);
            ps.setString(2, table);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getString("column_name");
                }
            }
        }
        return null;
    }

    public long getEstimatedRowCount(AdapterConfig config, String tableName) throws Exception {
        String schema = config.getString("schemaName", "").toUpperCase();
        String table = tableName.toUpperCase();
        String sql = "SELECT num_rows FROM all_tables WHERE owner = ? AND table_name = ?";

        try (Connection conn = acquireConnection(config);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, schema);
            ps.setString(2, table);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getLong("num_rows");
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
        String schema = config.getString("schemaName", "");
        String sql = lastPkValue == null
                ? String.format("SELECT * FROM %s.%s ORDER BY %s FETCH FIRST %d ROWS ONLY",
                    schema, tableName, primaryKeyColumn, chunkSize)
                : String.format("SELECT * FROM %s.%s WHERE %s > ? ORDER BY %s FETCH FIRST %d ROWS ONLY",
                    schema, tableName, primaryKeyColumn, primaryKeyColumn, chunkSize);

        try (Connection conn = acquireConnection(config);
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setFetchSize(Math.min(chunkSize, 5000));
            if (lastPkValue != null) {
                try {
                    ps.setLong(1, Long.parseLong(lastPkValue));
                } catch (NumberFormatException e) {
                    ps.setString(1, lastPkValue);
                }
            }

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
