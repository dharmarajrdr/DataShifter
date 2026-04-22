package com.datashifter.execution.services.implementations;

import com.datashifter.common.dtos.ConnectionDtos.ColumnMetadata;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.ColumnMapping;
import com.datashifter.common.models.TargetTableMapping;
import com.datashifter.connector.spi.interfaces.ConnectionConfig;
import com.datashifter.connector.spi.interfaces.DatabaseConnector;
import com.datashifter.execution.contexts.ExecutionContext.ResolvedColumnMapping;
import com.datashifter.execution.contexts.ExecutionContext.TargetTableContext;
import com.datashifter.execution.strategies.transformers.TransformerFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Resolves column mappings between source and target tables.
 *
 * Responsibilities:
 *   1. Build ResolvedColumnMapping list from user-configured ColumnMapping entities
 *   2. Auto-detect unmapped target columns (M < N) and fill with defaults/null
 *   3. Track unmapped source columns (M > N) for logging
 *   4. Validate non-nullable target columns have a source or default
 *   5. Attach pre-built TransformerChains
 *
 * This runs ONCE during context build — not per chunk.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ColumnMappingResolver {

    private final TransformerFactory transformerFactory;

    /**
     * Resolve a single TargetTableMapping into a TargetTableContext.
     *
     * @param ttm              the user-configured target table mapping with column mappings
     * @param sourceConnector  connector to fetch source table metadata
     * @param targetConnector  connector to fetch target table metadata
     * @param sourceConfig     decrypted source connection config
     * @param targetConfig     decrypted target connection config
     * @param sourceTable      source table name
     * @return                 fully resolved TargetTableContext ready for chunk loop
     */
    public TargetTableContext resolve(TargetTableMapping ttm,
                                      DatabaseConnector sourceConnector,
                                      DatabaseConnector targetConnector,
                                      ConnectionConfig sourceConfig,
                                      ConnectionConfig targetConfig,
                                      String sourceTable) {

        // 1. Fetch metadata from both sides
        List<ColumnMetadata> sourceColumns = sourceConnector.getColumns(sourceConfig, sourceTable);
        List<ColumnMetadata> targetColumns = targetConnector.getColumns(targetConfig, ttm.getTargetTable());
        String pkColumn = targetConnector.getPrimaryKeyColumn(targetConfig, ttm.getTargetTable());

        // Build lookup maps
        Map<String, ColumnMetadata> sourceColMap = sourceColumns.stream()
                .collect(Collectors.toMap(c -> c.getColumnName().toUpperCase(), c -> c));
        Map<String, ColumnMetadata> targetColMap = targetColumns.stream()
                .collect(Collectors.toMap(c -> c.getColumnName().toUpperCase(), c -> c));

        // 2. Process user-configured mappings (sorted by order)
        List<ColumnMapping> userMappings = ttm.getColumnMappings().stream()
                .sorted(Comparator.comparing(ColumnMapping::getMappingOrder))
                .toList();

        Set<String> mappedSourceCols = new HashSet<>();
        Set<String> mappedTargetCols = new HashSet<>();
        List<ResolvedColumnMapping> resolved = new ArrayList<>();

        for (ColumnMapping cm : userMappings) {
            String srcCol = cm.getSourceColumn();
            String tgtCol = cm.getTargetColumn();

            // Target-only mapping (e.g., CURRENT_TIMESTAMP, DEFAULT_IF_NULL with no source)
            boolean isTargetOnly = (srcCol == null || srcCol.isBlank());

            // Resolve types from metadata (fallback to user-provided types)
            ColumnMetadata srcMeta = !isTargetOnly ? sourceColMap.get(srcCol.toUpperCase()) : null;
            ColumnMetadata tgtMeta = targetColMap.get(tgtCol.toUpperCase());

            String srcType = srcMeta != null ? srcMeta.getDataType() : cm.getSourceType();
            String tgtType = tgtMeta != null ? tgtMeta.getDataType() : cm.getTargetType();
            boolean nullable = tgtMeta != null && tgtMeta.isNullable();

            resolved.add(ResolvedColumnMapping.builder()
                    .sourceColumn(isTargetOnly ? null : srcCol)
                    .sourceType(srcType)
                    .targetColumn(tgtCol)
                    .targetType(tgtType)
                    .defaultValue(cm.getDefaultValue())
                    .nullable(nullable)
                    .mapped(!isTargetOnly)
                    .targetOnly(isTargetOnly)
                    .chain(cm.getTransformations().isEmpty()
                            ? null
                            : transformerFactory.buildChain(cm.getTransformations()))
                    .build());

            if (!isTargetOnly) {
                mappedSourceCols.add(srcCol.toUpperCase());
            }
            mappedTargetCols.add(tgtCol.toUpperCase());
        }

        // 3. Detect unmapped target columns — skip them entirely
        // PostgreSQL will use DDL defaults for columns not in the INSERT
        for (ColumnMetadata tgtCol : targetColumns) {
            String colName = tgtCol.getColumnName().toUpperCase();
            if (!mappedTargetCols.contains(colName)) {
                if (tgtCol.getColumnName().equalsIgnoreCase(pkColumn)) {
                    log.info("Skipping auto-generated PK column: {}.{}", ttm.getTargetTable(), pkColumn);
                } else {
                    log.info("Unmapped target column: {}.{} — will use DB default",
                            ttm.getTargetTable(), tgtCol.getColumnName());
                }
            }
        }

        // 4. Detect unmapped source columns (M > N) — just for logging
        List<String> unmappedSourceCols = new ArrayList<>();
        for (ColumnMetadata srcCol : sourceColumns) {
            if (!mappedSourceCols.contains(srcCol.getColumnName().toUpperCase())) {
                unmappedSourceCols.add(srcCol.getColumnName());
            }
        }
        if (!unmappedSourceCols.isEmpty()) {
            log.info("Unmapped source columns (will be ignored): {} → {}",
                    sourceTable, unmappedSourceCols);
        }

        // 5. Validate: non-nullable target columns without source or default
        List<String> problems = new ArrayList<>();
        for (ResolvedColumnMapping rcm : resolved) {
            if (rcm.isUnmappedTarget() && !rcm.isNullable() && rcm.getDefaultValue() == null) {
                // PK columns are typically auto-generated or always mapped — skip PK from this check
                if (rcm.getTargetColumn().equalsIgnoreCase(pkColumn)) continue;
                problems.add(rcm.getTargetColumn());
            }
        }
        if (!problems.isEmpty()) {
            log.warn("Non-nullable target columns with no source or default: {}.{} — these will cause write errors",
                    ttm.getTargetTable(), problems);
        }

        return TargetTableContext.builder()
                .targetTable(ttm.getTargetTable())
                .writeMode(ttm.getWriteMode().name())
                .primaryKeyColumn(pkColumn)
                .columnMappings(resolved)
                .unmappedSourceColumns(unmappedSourceCols)
                .build();
    }

    /**
     * Validate that a resolved context is safe to execute.
     * Call this before starting the chunk loop.
     *
     * @throws DatashifterException if critical mapping issues are found
     */
    public void validate(TargetTableContext ttc) {
        if (ttc.getColumnMappings().isEmpty()) {
            throw new DatashifterException("No column mappings for target table: " + ttc.getTargetTable());
        }

        // Check at least one mapped or target-only column exists
        long activeCount = ttc.getColumnMappings().stream()
                .filter(m -> m.isMapped() || m.isTargetOnly())
                .count();
        if (activeCount == 0) {
            throw new DatashifterException(
                    "All columns are unmapped for target table: " + ttc.getTargetTable() +
                    ". At least one source→target mapping or system value is required.");
        }

        // Check PK column is mapped (required for UPSERT and UPDATE_ONLY — not INSERT_ONLY)
        if (!"INSERT_ONLY".equals(ttc.getWriteMode()) && ttc.getPrimaryKeyColumn() != null) {
            boolean pkMapped = ttc.getColumnMappings().stream()
                    .anyMatch(m -> (m.isMapped() || m.isTargetOnly()) &&
                              m.getTargetColumn().equalsIgnoreCase(ttc.getPrimaryKeyColumn()));
            if (!pkMapped) {
                throw new DatashifterException(String.format(
                        "Write mode %s requires PK column '%s' to be mapped on table '%s'. " +
                        "Either map a source column to '%s', or switch to INSERT_ONLY mode.",
                        ttc.getWriteMode(), ttc.getPrimaryKeyColumn(), ttc.getTargetTable(), ttc.getPrimaryKeyColumn()));
            }
        }
    }
}