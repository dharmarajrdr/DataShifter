package com.datashifter.udf.adapters.services;

import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.common.models.AdapterDefinition;
import com.datashifter.common.repositories.AdapterDefinitionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Seeds built-in GCP adapter definitions (Spanner, BigQuery, BigTable) (<= 100 lines). */
@Component @Order(5) @RequiredArgsConstructor @Slf4j
public class GcpBuiltInAdapterSeeder implements CommandLineRunner {
    private final AdapterDefinitionRepository repository;
    private final ObjectMapper mapper = new ObjectMapper();

    @Override @Transactional
    public void run(String... args) {
        for (AdapterDefinition def : getDefinitions()) {
            repository.findFirstByOrganizationIdIsNullAndAdapterKey(def.getAdapterKey()).ifPresentOrElse(existing -> {
                existing.setName(def.getName()); existing.setDescription(def.getDescription());
                existing.setAdapterType(def.getAdapterType()); existing.setSupportedMode(def.getSupportedMode());
                existing.setCategory(def.getCategory()); existing.setVersion(def.getVersion());
                existing.setClassName(def.getClassName()); existing.setConfigSchema(def.getConfigSchema());
                repository.save(existing);
            }, () -> repository.save(def));
        }
    }

    public List<AdapterDefinition> getDefinitions() {
        return List.of(
            create("spanner-reader", "Spanner Reader", "Batch reader for Cloud Spanner", AdapterType.READER, AdapterMode.BATCH,
                "com.datashifter.adapter.spanner.reader.SpannerReader", List.of(p("projectId", "Project ID", true), p("instanceId", "Instance ID", true), p("databaseId", "Database ID", true), p("table", "Table", true))),
            create("spanner-writer", "Spanner Writer", "Target writer for Cloud Spanner", AdapterType.WRITER, AdapterMode.BOTH,
                "com.datashifter.adapter.spanner.writer.SpannerWriter", List.of(p("projectId", "Project ID", true), p("instanceId", "Instance ID", true), p("databaseId", "Database ID", true), p("targetTable", "Target Table", true))),
            create("bigquery-reader", "BigQuery Reader", "Storage Read API reader for BigQuery", AdapterType.READER, AdapterMode.BATCH,
                "com.datashifter.adapter.bigquery.reader.BigQueryReader", List.of(p("projectId", "Project ID", true), p("datasetId", "Dataset ID", true), p("tableId", "Table ID", true))),
            create("bigquery-writer", "BigQuery Writer", "Storage Write API writer for BigQuery", AdapterType.WRITER, AdapterMode.BOTH,
                "com.datashifter.adapter.bigquery.writer.BigQueryWriter", List.of(p("projectId", "Project ID", true), p("datasetId", "Dataset ID", true), p("tableId", "Target Table", true))),
            create("bigtable-reader", "BigTable Reader", "Wide-column reader for Cloud Bigtable", AdapterType.READER, AdapterMode.BATCH,
                "com.datashifter.adapter.bigtable.reader.BigTableReader", List.of(p("projectId", "Project ID", true), p("instanceId", "Instance ID", true), p("tableId", "Table ID", true))),
            create("bigtable-writer", "BigTable Writer", "Mutation writer for Cloud Bigtable", AdapterType.WRITER, AdapterMode.BOTH,
                "com.datashifter.adapter.bigtable.writer.BigTableWriter", List.of(p("projectId", "Project ID", true), p("instanceId", "Instance ID", true), p("tableId", "Target Table", true), p("columnFamily", "Column Family", true)))
        );
    }

    private AdapterDefinition create(String k, String n, String d, AdapterType t, AdapterMode m, String cls, List<Map<String, Object>> props) {
        String schema = "{}";
        try { schema = mapper.writeValueAsString(Map.of("properties", props)); } catch (Exception ignored) {}
        return AdapterDefinition.builder().organizationId(null).createdByUserId(null).name(n).adapterKey(k).description(d)
                .adapterType(t).supportedMode(m).category("database").version("1.0.0").status("READY").className(cls)
                .artifactName(k + ".jar").storageKey("builtin/" + k + ".jar").configSchema(schema).isOfficial(true).build();
    }

    private Map<String, Object> p(String name, String label, boolean req) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", name); m.put("label", label); m.put("type", "string"); m.put("required", req); m.put("defaultValue", "");
        return m;
    }
}
