package com.datashifter.connector.spi.adapters.spanner;

import com.datashifter.common.dtos.ConnectionDtos.*;
import com.datashifter.common.enums.DatabaseType;
import com.datashifter.common.exceptions.ConnectionException;
import com.datashifter.connector.spi.interfaces.*;
import com.google.cloud.spanner.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Google Cloud Spanner DatabaseConnector implementation.
 *
 * ConnectionConfig mapping:
 *   host         = "projects/{project}/instances/{instance}"
 *   databaseName = Spanner database name
 *   password     = service account JSON key (decrypted) or blank for ADC
 *
 * Reads use parameterized GoogleSQL queries.
 * Writes use Spanner Mutations (InsertOrUpdate, Insert, Update).
 * Metadata comes from INFORMATION_SCHEMA views.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SpannerConnector implements DatabaseConnector {

    private final SpannerClientProvider clientProvider;

    @Override
    public DatabaseType getSupportedType() {
        return DatabaseType.SPANNER;
    }

    // =========================================================================
    // CONNECTION TEST
    // =========================================================================

    @Override
    public long testConnection(ConnectionConfig config) {
        long start = System.currentTimeMillis();
        try {
            DatabaseClient client = clientProvider.getClient(config);
            try (ResultSet rs = client.singleUse().executeQuery(Statement.of("SELECT 1"))) {
                rs.next(); // consume the result
            }
        } catch (Exception e) {
            throw new ConnectionException("Spanner connection failed: " + e.getMessage(), e);
        }
        return System.currentTimeMillis() - start;
    }

    // =========================================================================
    // METADATA
    // =========================================================================

    @Override
    public List<String> listTables(ConnectionConfig config) {
        List<String> tables = new ArrayList<>();
        String sql = "SELECT table_name FROM information_schema.tables " +
                     "WHERE table_schema = '' AND table_type = 'BASE TABLE' " +
                     "ORDER BY table_name";
        try {
            DatabaseClient client = clientProvider.getClient(config);
            try (ResultSet rs = client.singleUse().executeQuery(Statement.of(sql))) {
                while (rs.next()) {
                    tables.add(rs.getString("table_name"));
                }
            }
        } catch (Exception e) {
            throw new ConnectionException("Failed to list Spanner tables: " + e.getMessage(), e);
        }
        return tables;
    }

    @Override
    public TableMetadata getTableMetadata(ConnectionConfig config, String tableName) {
        return TableMetadata.builder()
                .tableName(tableName)
                .columns(getColumns(config, tableName))
                .foreignKeys(getForeignKeys(config, tableName))
                .estimatedRowCount(getEstimatedRowCount(config, tableName))
                .build();
    }

    @Override
    public List<ColumnMetadata> getColumns(ConnectionConfig config, String tableName) {
        List<ColumnMetadata> columns = new ArrayList<>();
        String sql = "SELECT c.column_name, c.spanner_type, c.is_nullable, c.ordinal_position " +
                     "FROM information_schema.columns c " +
                     "WHERE c.table_schema = '' AND c.table_name = @table " +
                     "ORDER BY c.ordinal_position";
        Set<String> pkColumns = getPrimaryKeyColumns(config, tableName);
        try {
            DatabaseClient client = clientProvider.getClient(config);
            try (ResultSet rs = client.singleUse().executeQuery(
                    Statement.newBuilder(sql).bind("table").to(tableName).build())) {
                while (rs.next()) {
                    String colName = rs.getString("column_name");
                    String spannerType = rs.getString("spanner_type");
                    columns.add(ColumnMetadata.builder()
                            .columnName(colName)
                            .dataType(spannerType)
                            .nullable("YES".equals(rs.getString("is_nullable")))
                            .primaryKey(pkColumns.contains(colName))
                            .maxLength(parseMaxLength(spannerType))
                            .build());
                }
            }
        } catch (Exception e) {
            throw new ConnectionException("Failed to get Spanner columns: " + e.getMessage(), e);
        }
        return columns;
    }

    @Override
    public List<ForeignKeyMetadata> getForeignKeys(ConnectionConfig config, String tableName) {
        List<ForeignKeyMetadata> fks = new ArrayList<>();
        String sql = """
            SELECT rc.constraint_name,
                   kcu.column_name,
                   ccu.table_name AS referenced_table,
                   ccu.column_name AS referenced_column
            FROM information_schema.referential_constraints rc
            JOIN information_schema.key_column_usage kcu
              ON rc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
              ON rc.unique_constraint_name = ccu.constraint_name
            WHERE kcu.table_name = @table AND kcu.table_schema = ''
            """;
        try {
            DatabaseClient client = clientProvider.getClient(config);
            try (ResultSet rs = client.singleUse().executeQuery(
                    Statement.newBuilder(sql).bind("table").to(tableName).build())) {
                while (rs.next()) {
                    fks.add(ForeignKeyMetadata.builder()
                            .constraintName(rs.getString("constraint_name"))
                            .columnName(rs.getString("column_name"))
                            .referencedTable(rs.getString("referenced_table"))
                            .referencedColumn(rs.getString("referenced_column"))
                            .build());
                }
            }
        } catch (Exception e) {
            throw new ConnectionException("Failed to get Spanner FKs: " + e.getMessage(), e);
        }
        return fks;
    }

    @Override
    public long getEstimatedRowCount(ConnectionConfig config, String tableName) {
        // Spanner doesn't have statistics like Oracle's num_rows.
        // Use COUNT(*) with a TABLESAMPLE if available, or full COUNT for accuracy.
        String sql = "SELECT COUNT(*) AS cnt FROM " + sanitize(tableName);
        try {
            DatabaseClient client = clientProvider.getClient(config);
            try (ResultSet rs = client.singleUse().executeQuery(Statement.of(sql))) {
                if (rs.next()) return rs.getLong("cnt");
            }
        } catch (Exception e) {
            log.warn("Failed to get row count for {}: {}", tableName, e.getMessage());
        }
        return 0;
    }

    @Override
    public String getPrimaryKeyColumn(ConnectionConfig config, String tableName) {
        Set<String> pks = getPrimaryKeyColumns(config, tableName);
        return pks.isEmpty() ? null : pks.iterator().next();
    }

    // =========================================================================
    // READ
    // =========================================================================

    @Override
    public List<Map<String, Object>> readChunk(ConnectionConfig config, String tableName,
                                                String pkColumn, String lastPkValue, int chunkSize) {
        List<Map<String, Object>> records = new ArrayList<>();
        String sql;
        Statement statement;

        if (lastPkValue == null) {
            sql = "SELECT * FROM " + sanitize(tableName) +
                  " ORDER BY " + sanitize(pkColumn) + " LIMIT @limit";
            statement = Statement.newBuilder(sql).bind("limit").to(chunkSize).build();
        } else {
            sql = "SELECT * FROM " + sanitize(tableName) +
                  " WHERE " + sanitize(pkColumn) + " > @lastPk" +
                  " ORDER BY " + sanitize(pkColumn) + " LIMIT @limit";
            statement = Statement.newBuilder(sql)
                    .bind("lastPk").to(lastPkValue)
                    .bind("limit").to(chunkSize)
                    .build();
        }

        try {
            DatabaseClient client = clientProvider.getClient(config);
            try (ResultSet rs = client.singleUse().executeQuery(statement)) {
                List<Type.StructField> fields = rs.getType().getStructFields();
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (Type.StructField field : fields) {
                        row.put(field.getName(), extractValue(rs, field));
                    }
                    records.add(row);
                }
            }
        } catch (Exception e) {
            throw new ConnectionException("Failed to read chunk from Spanner: " + e.getMessage(), e);
        }
        return records;
    }

    // =========================================================================
    // WRITE
    // =========================================================================

    @Override
    public WriteResult writeBatch(ConnectionConfig config, String tableName,
                                   List<Map<String, Object>> records, String writeMode,
                                   String pkColumn) {
        if (records.isEmpty()) {
            return WriteResult.builder().totalRecords(0).successCount(0).failureCount(0).build();
        }

        DatabaseClient client = clientProvider.getClient(config);
        int success = 0;
        List<WriteResult.FailedRecord> failures = new ArrayList<>();

        // Build mutations in batches (Spanner limit: ~20,000 mutations per commit)
        List<Mutation> mutations = new ArrayList<>();
        Set<String> columns = records.get(0).keySet();

        for (Map<String, Object> record : records) {
            try {
                Mutation mutation = buildMutation(tableName, columns, record, writeMode, pkColumn);
                mutations.add(mutation);
                success++;
            } catch (Exception e) {
                failures.add(WriteResult.FailedRecord.builder()
                        .record(record)
                        .errorMessage(e.getMessage())
                        .errorType("MUTATION_BUILD_ERROR")
                        .build());
            }
        }

        // Commit all mutations in a single transaction
        if (!mutations.isEmpty()) {
            try {
                client.write(mutations);
            } catch (SpannerException e) {
                // Entire batch failed — classify all as failures
                log.error("Spanner batch write failed: {}", e.getMessage());

                // Try row-by-row fallback to identify which records failed
                return writeRowByRow(client, tableName, columns, records, writeMode, pkColumn);
            }
        }

        return WriteResult.builder()
                .totalRecords(records.size())
                .successCount(success)
                .failureCount(failures.size())
                .failedRecords(failures)
                .build();
    }

    // =========================================================================
    // PRIVATE — Mutation builders
    // =========================================================================

    private Mutation buildMutation(String tableName, Set<String> columns,
                                    Map<String, Object> record, String writeMode, String pkColumn) {
        return switch (writeMode) {
            case "INSERT_ONLY" -> buildInsertMutation(tableName, columns, record);
            case "UPSERT"      -> buildUpsertMutation(tableName, columns, record);
            case "UPDATE_ONLY" -> buildUpdateMutation(tableName, columns, record);
            default -> throw new ConnectionException("Unknown write mode: " + writeMode);
        };
    }

    private Mutation buildInsertMutation(String tableName, Set<String> columns, Map<String, Object> record) {
        Mutation.WriteBuilder builder = Mutation.newInsertBuilder(tableName);
        for (String col : columns) {
            setMutationValue(builder, col, record.get(col));
        }
        return builder.build();
    }

    private Mutation buildUpsertMutation(String tableName, Set<String> columns, Map<String, Object> record) {
        Mutation.WriteBuilder builder = Mutation.newInsertOrUpdateBuilder(tableName);
        for (String col : columns) {
            setMutationValue(builder, col, record.get(col));
        }
        return builder.build();
    }

    private Mutation buildUpdateMutation(String tableName, Set<String> columns, Map<String, Object> record) {
        Mutation.WriteBuilder builder = Mutation.newUpdateBuilder(tableName);
        for (String col : columns) {
            setMutationValue(builder, col, record.get(col));
        }
        return builder.build();
    }

    private void setMutationValue(Mutation.WriteBuilder builder, String column, Object value) {
        if (value == null) {
            // Spanner requires typed nulls — default to string null
            builder.set(column).to((String) null);
        } else if (value instanceof String s) {
            builder.set(column).to(s);
        } else if (value instanceof Long l) {
            builder.set(column).to(l);
        } else if (value instanceof Integer i) {
            builder.set(column).to((long) i);
        } else if (value instanceof Double d) {
            builder.set(column).to(d);
        } else if (value instanceof Float f) {
            builder.set(column).to((double) f);
        } else if (value instanceof Boolean b) {
            builder.set(column).to(b);
        } else if (value instanceof java.util.Date d) {
            builder.set(column).to(com.google.cloud.Timestamp.of(d));
        } else if (value instanceof java.math.BigDecimal bd) {
            builder.set(column).to(bd.doubleValue());
        } else {
            // Fallback: convert to string
            builder.set(column).to(value.toString());
        }
    }

    /**
     * Row-by-row fallback when batch commit fails.
     * Identifies exactly which rows failed.
     */
    private WriteResult writeRowByRow(DatabaseClient client, String tableName,
                                       Set<String> columns, List<Map<String, Object>> records,
                                       String writeMode, String pkColumn) {
        int success = 0;
        List<WriteResult.FailedRecord> failures = new ArrayList<>();

        for (Map<String, Object> record : records) {
            try {
                Mutation mutation = buildMutation(tableName, columns, record, writeMode, pkColumn);
                client.write(List.of(mutation));
                success++;
            } catch (Exception e) {
                String errorType = classifySpannerError(e);
                failures.add(WriteResult.FailedRecord.builder()
                        .record(record)
                        .errorMessage(e.getMessage())
                        .errorType(errorType)
                        .build());
            }
        }

        return WriteResult.builder()
                .totalRecords(records.size())
                .successCount(success)
                .failureCount(failures.size())
                .failedRecords(failures)
                .build();
    }

    // =========================================================================
    // PRIVATE — helpers
    // =========================================================================

    private Set<String> getPrimaryKeyColumns(ConnectionConfig config, String tableName) {
        Set<String> pks = new LinkedHashSet<>();
        String sql = "SELECT column_name FROM information_schema.index_columns " +
                     "WHERE table_schema = '' AND table_name = @table " +
                     "AND index_type = 'PRIMARY_KEY' ORDER BY ordinal_position";
        try {
            DatabaseClient client = clientProvider.getClient(config);
            try (ResultSet rs = client.singleUse().executeQuery(
                    Statement.newBuilder(sql).bind("table").to(tableName).build())) {
                while (rs.next()) {
                    pks.add(rs.getString("column_name"));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to get PK columns for {}: {}", tableName, e.getMessage());
        }
        return pks;
    }

    private Object extractValue(ResultSet rs, Type.StructField field) {
        if (rs.isNull(field.getName())) return null;
        return switch (field.getType().getCode()) {
            case BOOL   -> rs.getBoolean(field.getName());
            case INT64  -> rs.getLong(field.getName());
            case FLOAT64 -> rs.getDouble(field.getName());
            case STRING -> rs.getString(field.getName());
            case BYTES  -> rs.getBytes(field.getName()).toByteArray();
            case TIMESTAMP -> rs.getTimestamp(field.getName()).toString();
            case DATE   -> rs.getDate(field.getName()).toString();
            case NUMERIC -> rs.getBigDecimal(field.getName());
            case JSON   -> rs.getJson(field.getName());
            default     -> rs.getString(field.getName());
        };
    }

    private String classifySpannerError(Exception e) {
        String msg = e.getMessage() != null ? e.getMessage().toUpperCase() : "";
        if (msg.contains("ALREADY_EXISTS") || msg.contains("UNIQUE")) return "PK_DUPLICATE";
        if (msg.contains("NOT_FOUND")) return "NOT_FOUND";
        if (msg.contains("FAILED_PRECONDITION")) return "NULL_CONSTRAINT";
        if (msg.contains("DEADLINE_EXCEEDED") || msg.contains("UNAVAILABLE")) return "WRITE_TIMEOUT";
        return "UNKNOWN";
    }

    private Integer parseMaxLength(String spannerType) {
        // Parse "STRING(255)" → 255, "STRING(MAX)" → null
        if (spannerType == null) return null;
        int start = spannerType.indexOf('(');
        int end = spannerType.indexOf(')');
        if (start > 0 && end > start) {
            String len = spannerType.substring(start + 1, end);
            if ("MAX".equals(len)) return null;
            try { return Integer.parseInt(len); } catch (NumberFormatException e) { return null; }
        }
        return null;
    }

    /** Basic SQL identifier sanitization — prevents injection in table/column names */
    private String sanitize(String identifier) {
        if (identifier == null) throw new ConnectionException("Null identifier");
        // Spanner uses backtick quoting for identifiers
        return "`" + identifier.replace("`", "") + "`";
    }
}