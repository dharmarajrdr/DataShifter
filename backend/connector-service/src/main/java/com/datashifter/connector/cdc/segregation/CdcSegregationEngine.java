package com.datashifter.connector.cdc.segregation;

import com.datashifter.common.cdc.CdcEvent;
import com.datashifter.common.enums.CdcOperationType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * High-performance CDC Segregation Engine.
 * Filters out non-selected tables at the header level, discards unwanted operations,
 * evaluates row-level predicates, and executes column transformations and UDFs.
 */
@Component
@Slf4j
public class CdcSegregationEngine {

    private final CdcTableFilter tableFilter;
    private final CdcOperationFilter operationFilter;
    private final Map<String, CdcTableMappingConfig> tableMappings = new ConcurrentHashMap<>();
    private final CdcSegregationStats stats = new CdcSegregationStats();

    public CdcSegregationEngine() {
        this(CdcTableFilter.allowAll(), CdcOperationFilter.allowAll(), Collections.emptyList());
    }

    public CdcSegregationEngine(CdcTableFilter tableFilter,
                                CdcOperationFilter operationFilter,
                                Collection<CdcTableMappingConfig> mappings) {
        this.tableFilter = tableFilter != null ? tableFilter : CdcTableFilter.allowAll();
        this.operationFilter = operationFilter != null ? operationFilter : CdcOperationFilter.allowAll();

        if (mappings != null) {
            for (CdcTableMappingConfig m : mappings) {
                if (m.getSourceTable() != null) {
                    // Register simple table name
                    tableMappings.put(m.getSourceTable().trim().toUpperCase(Locale.ROOT), m);
                    // Register schema-qualified name if present
                    if (m.getSourceSchema() != null && !m.getSourceSchema().isBlank()) {
                        String full = m.getSourceSchema().trim().toUpperCase(Locale.ROOT) + "." +
                                      m.getSourceTable().trim().toUpperCase(Locale.ROOT);
                        tableMappings.put(full, m);
                    }
                }
            }
        }
    }

    /**
     * Filters and transforms a single incoming raw CDC event.
     *
     * @param rawEvent raw event from log reader
     * @return Optional containing the transformed event, or empty if filtered out
     */
    public Optional<CdcEvent> filterAndTransform(CdcEvent rawEvent) {
        if (rawEvent == null) {
            return Optional.empty();
        }

        stats.incrementReceived();

        // 1. Transaction boundaries pass immediately
        if (rawEvent.getOperationType() == CdcOperationType.COMMIT ||
                rawEvent.getOperationType() == CdcOperationType.BEGIN) {
            stats.incrementPassed();
            return Optional.of(rawEvent);
        }

        // 2. Table segregation filter
        String tableName = rawEvent.getTableName();
        String schemaName = rawEvent.getSchemaName();
        if (!tableFilter.matches(schemaName, tableName)) {
            stats.incrementFilteredTable();
            log.trace("Table filtered: {}.{}", schemaName, tableName);
            return Optional.empty();
        }

        // 3. Operation type filter
        if (!operationFilter.matches(rawEvent.getOperationType())) {
            stats.incrementFilteredOperation();
            log.trace("Operation filtered: {} on {}.{}", rawEvent.getOperationType(), schemaName, tableName);
            return Optional.empty();
        }

        // 4. Resolve table mapping and row filter
        CdcTableMappingConfig mappingConfig = resolveMapping(schemaName, tableName);

        if (mappingConfig != null && mappingConfig.getRowFilter() != null) {
            if (!mappingConfig.getRowFilter().matches(rawEvent)) {
                stats.incrementFilteredRowFilter();
                log.trace("Row predicate filtered on {}.{}", schemaName, tableName);
                return Optional.empty();
            }
        }

        // 5. Column transformations and schema mapping
        CdcEvent transformedEvent = applyMappingAndTransform(rawEvent, mappingConfig);
        stats.incrementTransformed();
        stats.incrementPassed();

        return Optional.of(transformedEvent);
    }

    /**
     * Batch processing for high-throughput micro-batching.
     */
    public List<CdcEvent> processBatch(List<CdcEvent> rawEvents) {
        if (rawEvents == null || rawEvents.isEmpty()) {
            return Collections.emptyList();
        }

        List<CdcEvent> result = new ArrayList<>(rawEvents.size());
        for (CdcEvent event : rawEvents) {
            filterAndTransform(event).ifPresent(result::add);
        }
        return result;
    }

    private CdcTableMappingConfig resolveMapping(String schema, String table) {
        if (table == null) return null;
        String upperTable = table.trim().toUpperCase(Locale.ROOT);
        if (schema != null && !schema.isBlank()) {
            String full = schema.trim().toUpperCase(Locale.ROOT) + "." + upperTable;
            if (tableMappings.containsKey(full)) {
                return tableMappings.get(full);
            }
        }
        return tableMappings.get(upperTable);
    }

    private CdcEvent applyMappingAndTransform(CdcEvent raw, CdcTableMappingConfig mapping) {
        if (mapping == null) {
            return raw;
        }

        Map<String, Object> targetAfter = mapping.transformRow(raw.getAfterData());
        Map<String, Object> targetBefore = mapping.transformRow(raw.getBeforeData());
        Map<String, Object> targetPk = mapping.remapPrimaryKeys(raw.getPrimaryKeyValues());

        String targetTable = mapping.getTargetTable() != null && !mapping.getTargetTable().isBlank()
                ? mapping.getTargetTable() : raw.getTableName();
        String targetSchema = mapping.getTargetSchema() != null && !mapping.getTargetSchema().isBlank()
                ? mapping.getTargetSchema() : raw.getSchemaName();

        return CdcEvent.builder()
                .eventId(raw.getEventId())
                .pipelineId(raw.getPipelineId())
                .sourceDatabaseType(raw.getSourceDatabaseType())
                .operationType(raw.getOperationType())
                .schemaName(targetSchema)
                .tableName(targetTable)
                .position(raw.getPosition())
                .transactionId(raw.getTransactionId())
                .commitTimestamp(raw.getCommitTimestamp())
                .primaryKeyValues(targetPk)
                .beforeData(targetBefore)
                .afterData(targetAfter)
                .build();
    }

    public CdcTableFilter getTableFilter() {
        return tableFilter;
    }

    public CdcOperationFilter getOperationFilter() {
        return operationFilter;
    }

    public CdcSegregationStats getStats() {
        return stats;
    }
}
