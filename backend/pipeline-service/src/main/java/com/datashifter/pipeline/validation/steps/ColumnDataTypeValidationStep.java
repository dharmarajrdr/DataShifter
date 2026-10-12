package com.datashifter.pipeline.validation.steps;

import com.datashifter.common.dtos.ConnectionDtos.ColumnMetadata;
import com.datashifter.common.models.ColumnMapping;
import com.datashifter.common.models.Pipeline;
import com.datashifter.common.models.PipelineTable;
import com.datashifter.common.models.TargetTableMapping;
import com.datashifter.pipeline.validation.PipelineValidationContext;
import com.datashifter.pipeline.validation.PipelineValidationStep;
import com.datashifter.pipeline.validation.datatype.CanonicalDataType;
import com.datashifter.pipeline.validation.datatype.DatabaseTypeDialect;
import com.datashifter.pipeline.validation.datatype.DatabaseTypeDialectFactory;
import com.datashifter.pipeline.validation.datatype.TransformTypeResolver;
import com.datashifter.pipeline.validation.datatype.TransformTypeResolver.TypeResolutionResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Step 2 of Pipeline Validation:
 * Performs compile-time data type compatibility validation between source and target columns.
 *
 * Rules:
 * - Mappings with UDF transformations are skipped (validated at runtime).
 * - Mappings with built-in transformations have their output type evaluated and compared
 *   against the target column's canonical type.
 * - Direct mappings without transformations have their source column's canonical type
 *   compared directly against the target column's canonical type using the respective
 *   database dialects (e.g., Oracle, PostgreSQL).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ColumnDataTypeValidationStep implements PipelineValidationStep {

    private final DatabaseTypeDialectFactory dialectFactory;
    private final TransformTypeResolver transformTypeResolver;

    @Override
    public int getOrder() {
        return 3;
    }

    @Override
    public String getStepName() {
        return "Column Data Type Validation";
    }

    @Override
    public List<String> validate(PipelineValidationContext context) {
        List<String> errors = new ArrayList<>();
        Pipeline pipeline = context.getPipeline();

        if (pipeline.getPipelineTables() == null || pipeline.getPipelineTables().isEmpty()) {
            return errors;
        }

        DatabaseTypeDialect sourceDialect = context.getSourceConnection() != null
                ? dialectFactory.getDialect(context.getSourceConnection().getDbType())
                : null;
        DatabaseTypeDialect targetDialect = context.getTargetConnection() != null
                ? dialectFactory.getDialect(context.getTargetConnection().getDbType())
                : null;

        for (PipelineTable pt : pipeline.getPipelineTables()) {
            String sourceTable = pt.getSourceTable();
            Map<String, ColumnMetadata> sourceColMap = loadSourceColumnMap(context, sourceTable);

            if (pt.getTargetTableMappings() == null) {
                continue;
            }

            for (TargetTableMapping ttm : pt.getTargetTableMappings()) {
                String targetTable = ttm.getTargetTable();
                if (targetTable == null || targetTable.isBlank() || ttm.getColumnMappings() == null) {
                    continue;
                }

                Map<String, ColumnMetadata> targetColMap = loadTargetColumnMap(context, targetTable);

                for (ColumnMapping cm : ttm.getColumnMappings()) {
                    if (cm.getTargetColumn() == null || cm.getTargetColumn().isBlank()) {
                        continue;
                    }

                    // Skip compile-time validation if mapping uses a UDF (runtime validation applies)
                    if (transformTypeResolver.hasUdf(cm)) {
                        continue;
                    }

                    String targetColName = cm.getTargetColumn().trim();
                    ColumnMetadata targetMeta = targetColMap.get(targetColName.toLowerCase());
                    String rawTargetType = (targetMeta != null && targetMeta.getDataType() != null)
                            ? targetMeta.getDataType()
                            : cm.getTargetType();

                    String sourceColName = cm.getSourceColumn() != null ? cm.getSourceColumn().trim() : null;
                    boolean hasSourceCol = sourceColName != null && !sourceColName.isEmpty();

                    String rawSourceType = null;
                    if (hasSourceCol) {
                        ColumnMetadata sourceMeta = sourceColMap.get(sourceColName.toLowerCase());
                        if (sourceMeta != null && sourceMeta.getDataType() != null) {
                            rawSourceType = sourceMeta.getDataType();
                        } else if (cm.getSourceType() != null && !cm.getSourceType().isBlank()) {
                            rawSourceType = cm.getSourceType();
                        }
                    }

                    CanonicalDataType sourceCanonicalType = resolveCanonical(rawSourceType, sourceDialect, targetDialect);
                    CanonicalDataType targetCanonicalType = resolveCanonical(rawTargetType, targetDialect, sourceDialect);

                    // Target-only mapping with static defaultValue and no transforms produces STRING
                    if (!hasSourceCol
                            && (cm.getTransformations() == null || cm.getTransformations().isEmpty())
                            && cm.getDefaultValue() != null) {
                        sourceCanonicalType = CanonicalDataType.STRING;
                    }

                    TypeResolutionResult resolution = transformTypeResolver.resolveEffectiveType(
                            cm, sourceCanonicalType, rawSourceType, targetTable, targetColName);

                    if (resolution.isSkippedForUdf()) {
                        continue;
                    }

                    if (resolution.getTransformError() != null) {
                        errors.add(resolution.getTransformError());
                        continue;
                    }

                    CanonicalDataType effectiveSourceType = resolution.getEffectiveType();
                    if (effectiveSourceType == CanonicalDataType.UNKNOWN || targetCanonicalType == CanonicalDataType.UNKNOWN) {
                        continue;
                    }

                    boolean compatible = transformTypeResolver.isTypeCompatible(
                            effectiveSourceType,
                            rawSourceType,
                            sourceDialect,
                            targetCanonicalType,
                            rawTargetType,
                            targetDialect,
                            resolution.isTransformed()
                    );

                    if (!compatible) {
                        if (resolution.isTransformed()) {
                            errors.add(String.format(
                                    "%s: Data type mismatch on column \"%s\" — transform output type %s is incompatible with target column type %s",
                                    targetTable,
                                    targetColName,
                                    effectiveSourceType,
                                    rawTargetType != null ? rawTargetType : targetCanonicalType));
                        } else {
                            errors.add(String.format(
                                    "%s: Data type mismatch — source column \"%s.%s\" (%s) is incompatible with target column \"%s\" (%s)",
                                    targetTable,
                                    sourceTable,
                                    sourceColName,
                                    rawSourceType != null ? rawSourceType : effectiveSourceType,
                                    targetColName,
                                    rawTargetType != null ? rawTargetType : targetCanonicalType));
                        }
                    }
                }
            }
        }

        return errors;
    }

    private CanonicalDataType resolveCanonical(
            String rawType,
            DatabaseTypeDialect primaryDialect,
            DatabaseTypeDialect secondaryDialect) {
        if (rawType == null || rawType.isBlank()) {
            return CanonicalDataType.UNKNOWN;
        }
        if (primaryDialect != null) {
            CanonicalDataType resolved = primaryDialect.resolveCanonicalType(rawType);
            if (resolved != CanonicalDataType.UNKNOWN) {
                return resolved;
            }
        }
        if (secondaryDialect != null) {
            return secondaryDialect.resolveCanonicalType(rawType);
        }
        return CanonicalDataType.UNKNOWN;
    }

    private Map<String, ColumnMetadata> loadSourceColumnMap(PipelineValidationContext context, String sourceTable) {
        if (sourceTable == null || sourceTable.isBlank()
                || context.getSourceConnector() == null
                || context.getSourceConfig() == null) {
            return Map.of();
        }
        try {
            List<ColumnMetadata> cols = context.getSourceColumnCache().computeIfAbsent(sourceTable, t -> {
                try {
                    return context.getSourceConnector().getColumns(context.getSourceConfig(), t);
                } catch (Exception e) {
                    log.warn("Failed to fetch source columns for table {}: {}", t, e.getMessage());
                    return List.of();
                }
            });
            Map<String, ColumnMetadata> map = new HashMap<>();
            if (cols != null) {
                for (ColumnMetadata c : cols) {
                    if (c.getColumnName() != null) {
                        map.put(c.getColumnName().trim().toLowerCase(), c);
                    }
                }
            }
            return map;
        } catch (Exception e) {
            log.warn("Unable to load source columns for {}: {}", sourceTable, e.getMessage());
            return Map.of();
        }
    }

    private Map<String, ColumnMetadata> loadTargetColumnMap(PipelineValidationContext context, String targetTable) {
        List<ColumnMetadata> cols = context.getTargetColumnCache().get(targetTable);
        if (cols == null && context.getTargetConnector() != null && context.getTargetConfig() != null) {
            try {
                cols = context.getTargetConnector().getColumns(context.getTargetConfig(), targetTable);
                context.getTargetColumnCache().put(targetTable, cols);
            } catch (Exception e) {
                log.warn("Unable to load target columns for {}: {}", targetTable, e.getMessage());
                return Map.of();
            }
        }
        if (cols == null) {
            return Map.of();
        }
        Map<String, ColumnMetadata> map = new HashMap<>();
        for (ColumnMetadata c : cols) {
            if (c.getColumnName() != null) {
                map.put(c.getColumnName().trim().toLowerCase(), c);
            }
        }
        return map;
    }
}

