package com.datashifter.udf.adapters.services;

import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.common.models.AdapterDefinition;
import com.datashifter.common.repositories.AdapterDefinitionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Seeds and maintains the standard built-in official adapters in the adapter repository.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BuiltInAdapterSeeder implements CommandLineRunner {

    private final AdapterDefinitionRepository repository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional
    public void run(String... args) {
        seedBuiltInAdapters();
    }

    public synchronized void seedBuiltInAdapters() {
        log.info("Checking and seeding built-in official adapters...");
        List<AdapterDefinition> builtIns = getBuiltInDefinitions();

        for (AdapterDefinition def : builtIns) {
            repository.findFirstByOrganizationIdIsNullAndAdapterKey(def.getAdapterKey()).ifPresentOrElse(existing -> {
                if (Boolean.TRUE.equals(existing.getIsOfficial())) {
                    existing.setName(def.getName());
                    existing.setDescription(def.getDescription());
                    existing.setAdapterType(def.getAdapterType());
                    existing.setSupportedMode(def.getSupportedMode());
                    existing.setCategory(def.getCategory());
                    existing.setVersion(def.getVersion());
                    existing.setClassName(def.getClassName());
                    existing.setConfigSchema(def.getConfigSchema());
                    repository.save(existing);
                    log.debug("Updated built-in adapter: {}", def.getAdapterKey());
                }
            }, () -> {
                repository.save(def);
                log.info("Registered built-in adapter: {}", def.getAdapterKey());
            });
        }
    }

    public List<AdapterDefinition> getBuiltInDefinitions() {
        List<AdapterDefinition> list = new ArrayList<>();

        // 1. Oracle Reader
        list.add(createDefinition(
                "oracle-reader", "Oracle Database Reader",
                "High-performance batch reader for Oracle database tables and views",
                AdapterType.READER, AdapterMode.BATCH, "database", "1.0.0",
                "com.datashifter.adapter.oracle.reader.OracleReader",
                List.of(
                        prop("connectionId", "Connection", "connection", "Configured Oracle database connection identifier", true, ""),
                        prop("schema", "Database Schema", "string", "Oracle schema owner", false, ""),
                        prop("table", "Table Name", "string", "Target table to read from", true, ""),
                        prop("fetchSize", "Fetch Size", "number", "JDBC cursor fetch size", false, "5000"),
                        prop("splitColumn", "Split Column", "string", "Numeric/date column used for parallel partitioning", false, ""),
                        prop("splitParallelism", "Split Parallelism", "number", "Number of parallel partitioned query workers", false, "4"),
                        prop("whereClause", "Filter Condition", "string", "Optional SQL WHERE filter predicate", false, "")
                )
        ));

        // 2. Oracle Writer
        list.add(createDefinition(
                "oracle-writer", "Oracle Database Writer",
                "High-performance target writer for Oracle database tables supporting bulk upsert and batch inserts",
                AdapterType.WRITER, AdapterMode.BOTH, "database", "1.0.0",
                "com.datashifter.adapter.oracle.writer.OracleWriter",
                List.of(
                        prop("connectionId", "Connection", "connection", "Configured Oracle database connection identifier", true, ""),
                        prop("targetTable", "Target Table", "string", "Destination Oracle table", true, ""),
                        prop("writeMode", "Write Mode", "string", "Write strategy: UPSERT, INSERT_ONLY, OVERWRITE", false, "UPSERT"),
                        prop("primaryKeyColumn", "Primary Key Column", "string", "Primary key column for MERGE upsert statements", false, "id"),
                        prop("batchSize", "Batch Size", "number", "JDBC batch execution chunk size", false, "1000"),
                        prop("truncateBeforeLoad", "Truncate Before Load", "boolean", "Truncate target table before initial load", false, "false")
                )
        ));

        // 3. PostgreSQL Reader
        list.add(createDefinition(
                "postgres-reader", "PostgreSQL Database Reader",
                "High-performance batch reader for PostgreSQL database tables and views",
                AdapterType.READER, AdapterMode.BATCH, "database", "1.0.0",
                "com.datashifter.adapter.postgres.reader.PostgresReader",
                List.of(
                        prop("connectionId", "Connection", "connection", "Configured PostgreSQL connection identifier", true, ""),
                        prop("schema", "Database Schema", "string", "PostgreSQL schema name", false, "public"),
                        prop("table", "Table Name", "string", "Source table name", true, ""),
                        prop("fetchSize", "Fetch Size", "number", "JDBC statement fetch size", false, "5000"),
                        prop("splitColumn", "Split Column", "string", "Numeric or timestamp column for parallel splitting", false, ""),
                        prop("splitParallelism", "Split Parallelism", "number", "Number of parallel chunk workers", false, "4"),
                        prop("whereClause", "Filter Predicate", "string", "Optional WHERE filter expression", false, "")
                )
        ));

        // 4. PostgreSQL Writer
        list.add(createDefinition(
                "postgres-writer", "PostgreSQL Database Writer",
                "High-performance target writer for PostgreSQL database tables supporting bulk upsert and batch inserts",
                AdapterType.WRITER, AdapterMode.BOTH, "database", "1.0.0",
                "com.datashifter.adapter.postgres.writer.PostgresWriter",
                List.of(
                        prop("connectionId", "Connection", "connection", "Configured PostgreSQL connection identifier", true, ""),
                        prop("targetTable", "Target Table", "string", "Destination table name", true, ""),
                        prop("writeMode", "Write Mode", "string", "Write strategy: UPSERT, INSERT_ONLY, OVERWRITE", false, "UPSERT"),
                        prop("primaryKeyColumn", "Primary Key Column", "string", "Conflict target primary key column name", false, "id"),
                        prop("batchSize", "Batch Size", "number", "Batch chunk size", false, "1000"),
                        prop("truncateBeforeLoad", "Truncate Table", "boolean", "Truncate table prior to initial ingestion", false, "false")
                )
        ));

        // 5. Oracle GoldenGate CDC Reader
        list.add(createDefinition(
                "oracle-gg-reader", "Oracle GoldenGate CDC Reader",
                "Change Data Capture (CDC) streaming reader consuming Oracle GoldenGate trail files",
                AdapterType.READER, AdapterMode.CDC, "streaming", "1.0.0",
                "com.datashifter.adapter.oracle.gg.OracleGoldenGateReader",
                List.of(
                        prop("trailFilePath", "Trail Directory", "directory", "Directory containing GoldenGate trail files", true, ""),
                        prop("filePattern", "File Pattern", "string", "Regex or prefix pattern for trail sequence files", false, ".*"),
                        prop("pollIntervalMs", "Poll Interval (ms)", "number", "Sleep interval between directory scans", false, "500"),
                        prop("maxBatchSize", "Max Batch Size", "number", "Maximum mutation events returned per poll", false, "1000"),
                        prop("startFromScn", "Start From SCN", "string", "Initial System Change Number (SCN) offset", false, "0")
                )
        ));

        // 6. PostgreSQL WAL CDC Reader
        list.add(createDefinition(
                "postgres-wal-reader", "PostgreSQL WAL CDC Reader",
                "Change Data Capture (CDC) streaming reader streaming PostgreSQL write-ahead logs via logical replication",
                AdapterType.READER, AdapterMode.CDC, "streaming", "1.0.0",
                "com.datashifter.adapter.postgres.wal.PostgresWalReader",
                List.of(
                        prop("walDirectory", "WAL Directory", "directory", "Directory containing PostgreSQL WAL files", true, "/var/lib/postgresql/data/pg_wal"),
                        prop("filePattern", "File Pattern", "string", "Regex or prefix pattern for WAL segment files", false, "000000010000.*"),
                        prop("startingLsn", "Starting LSN", "string", "Initial Log Sequence Number (LSN) position", false, ""),
                        prop("slotName", "Replication Slot", "string", "PostgreSQL logical replication slot name", false, "datashifter_cdc_slot"),
                        prop("flushIntervalMs", "Flush Interval (ms)", "number", "Interval between replication stream flushes", false, "200"),
                        prop("maxBatchSize", "Max Batch Size", "number", "Max events buffered per micro-batch", false, "500")
                )
        ));

        // 7. File System Writer
        list.add(createDefinition(
                "filesystem-writer", "File System Writer",
                "High-performance target writer for local and mounted filesystems (JSON, CSV, JSONL)",
                AdapterType.WRITER, AdapterMode.BOTH, "storage", "1.0.0",
                "com.datashifter.adapter.filesystem.writer.FileSystemWriter",
                List.of(
                        prop("outputDirectory", "Output Directory", "string", "Base directory path for output files", true, "./output"),
                        prop("fileFormat", "File Format", "string", "File format: jsonl, json, or csv", false, "jsonl"),
                        prop("fileNamePrefix", "File Name Prefix", "string", "Prefix prepended to generated files", false, "data_"),
                        prop("partitionBy", "Partition Strategy", "string", "Partition layout: none, date, or table", false, "none"),
                        prop("append", "Append Mode", "boolean", "Append to existing file if present", false, "true")
                )
        ));

        // 8. Apache Kafka Writer
        list.add(createDefinition(
                "kafka-writer", "Apache Kafka Writer",
                "High-throughput streaming and batch target writer for Apache Kafka topics",
                AdapterType.WRITER, AdapterMode.BOTH, "messaging", "1.0.0",
                "com.datashifter.adapter.kafka.writer.KafkaWriter",
                List.of(
                        prop("bootstrapServers", "Bootstrap Servers", "string", "Kafka broker bootstrap servers", true, "localhost:9092"),
                        prop("topic", "Default Topic", "string", "Destination Kafka topic", false, "datashifter-records"),
                        prop("keyField", "Message Key Field", "string", "Record field to use as Kafka message key", false, ""),
                        prop("acks", "Acks", "string", "Producer acknowledgement mode", false, "all"),
                        prop("compressionType", "Compression Type", "string", "Compression codec: none, gzip, snappy, lz4, zstd", false, "none"),
                        prop("retries", "Retries", "number", "Producer retry count", false, "3"),
                        prop("batchSize", "Batch Size", "number", "Producer buffer batch size in bytes", false, "16384"),
                        prop("lingerMs", "Linger (ms)", "number", "Producer batch linger ms", false, "5")
                )
        ));

        return list;
    }

    private AdapterDefinition createDefinition(
            String id, String name, String description,
            AdapterType type, AdapterMode mode, String category, String version,
            String className, List<Map<String, Object>> properties) {

        String schemaJson = "{}";
        try {
            Map<String, Object> schema = new LinkedHashMap<>();
            schema.put("properties", properties);
            schemaJson = objectMapper.writeValueAsString(schema);
        } catch (Exception e) {
            log.warn("Could not serialize built-in schema for {}: {}", id, e.getMessage());
        }

        return AdapterDefinition.builder()
                .organizationId(null)
                .createdByUserId(null)
                .name(name)
                .adapterKey(id)
                .description(description)
                .adapterType(type)
                .supportedMode(mode)
                .category(category)
                .version(version)
                .status("READY")
                .className(className)
                .artifactName(id + "-" + version + ".jar")
                .storageKey("builtin/" + id + ".jar")
                .configSchema(schemaJson)
                .isOfficial(true)
                .build();
    }

    private Map<String, Object> prop(String name, String label, String type, String desc, boolean req, String def) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("name", name);
        map.put("label", label);
        map.put("type", type);
        map.put("description", desc);
        map.put("required", req);
        map.put("defaultValue", def);
        return map;
    }
}
