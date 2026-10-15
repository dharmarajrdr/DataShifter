package com.datashifter.pipeline.validation.steps;

import com.datashifter.common.dtos.ConnectionDtos.ColumnMetadata;
import com.datashifter.common.enums.WriteMode;
import com.datashifter.common.models.ColumnMapping;
import com.datashifter.common.models.Pipeline;
import com.datashifter.common.models.PipelineTable;
import com.datashifter.common.models.TargetTableMapping;
import com.datashifter.pipeline.validation.PipelineValidationContext;
import com.datashifter.pipeline.validation.PipelineValidationStep;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Step 1 of Pipeline Validation:
 * Validates that source and target tables are configured and all required
 * target columns (NOT NULL columns and primary keys for UPSERT/UPDATE_ONLY) are mapped.
 */
@Component
@Slf4j
public class ColumnMappingValidationStep implements PipelineValidationStep {

    @Override
    public int getOrder() {
        return 1;
    }

    @Override
    public String getStepName() {
        return "Column Mapping Validation";
    }

    @Override
    public List<String> validate(PipelineValidationContext context) {
        List<String> errors = new ArrayList<>();
        Pipeline pipeline = context.getPipeline();

        if (pipeline.getPipelineTables() == null || pipeline.getPipelineTables().isEmpty()) {
            errors.add("Pipeline has no tables configured");
            return errors;
        }

        boolean isTargetAdapter = pipeline.getTargetAdapterId() != null;
        if (!isTargetAdapter && (context.getTargetConnection() == null || context.getTargetConnector() == null)) {
            errors.add("Target connection not found: " + pipeline.getTargetConnectionId());
            return errors;
        }

        for (PipelineTable pt : pipeline.getPipelineTables()) {
            if (pt.getTargetTableMappings() == null || pt.getTargetTableMappings().isEmpty()) {
                errors.add(String.format("Source table '%s' has no target table mapped", pt.getSourceTable()));
                continue;
            }

            for (TargetTableMapping ttm : pt.getTargetTableMappings()) {
                String targetTable = ttm.getTargetTable();
                if (targetTable == null || targetTable.isBlank()) {
                    errors.add(String.format("Source table '%s' has an empty target table name", pt.getSourceTable()));
                    continue;
                }

                if (isTargetAdapter) {
                    if (ttm.getColumnMappings() != null && !ttm.getColumnMappings().isEmpty()) {
                        boolean anyMapped = ttm.getColumnMappings().stream()
                                .anyMatch(cm -> cm.getTargetColumn() != null && !cm.getTargetColumn().isBlank());
                        if (!anyMapped) {
                            errors.add(String.format("%s: At least one column must be mapped", targetTable));
                        }
                    }
                    continue;
                }

                List<ColumnMetadata> targetCols;
                try {
                    targetCols = context.getTargetColumnCache().computeIfAbsent(targetTable, t -> {
                        try {
                            return context.getTargetConnector().getColumns(context.getTargetConfig(), t);
                        } catch (Exception e) {
                            throw new RuntimeException(e);
                        }
                    });
                } catch (Exception e) {
                    log.warn("Failed to fetch target columns for table {}: {}", targetTable, e.getMessage());
                    errors.add(String.format("Unable to fetch schema for target table '%s'", targetTable));
                    continue;
                }

                if (targetCols == null || targetCols.isEmpty()) {
                    errors.add(String.format("Target table '%s' has no columns or does not exist", targetTable));
                    continue;
                }

                Set<String> mappedTargetCols = new HashSet<>();
                if (ttm.getColumnMappings() != null) {
                    for (ColumnMapping cm : ttm.getColumnMappings()) {
                        if (cm.getTargetColumn() != null && !cm.getTargetColumn().isBlank()) {
                            mappedTargetCols.add(cm.getTargetColumn().trim().toLowerCase());
                        }
                    }
                }

                if (mappedTargetCols.isEmpty()) {
                    errors.add(String.format("%s: At least one column must be mapped", targetTable));
                }

                for (ColumnMetadata col : targetCols) {
                    boolean isMapped = mappedTargetCols.contains(col.getColumnName().toLowerCase());
                    if (!col.isNullable() && !isMapped) {
                        errors.add(String.format("%s: \"%s\" is %s — needs mapping",
                                targetTable,
                                col.getColumnName(),
                                col.isPrimaryKey() ? "PK" : "NOT NULL"));
                    } else if (col.isPrimaryKey() && !isMapped
                            && (ttm.getWriteMode() == WriteMode.UPSERT
                            || ttm.getWriteMode() == WriteMode.UPDATE_ONLY)) {
                        errors.add(String.format("%s: Primary key \"%s\" must be mapped for %s write mode",
                                targetTable,
                                col.getColumnName(),
                                ttm.getWriteMode()));
                    }
                }
            }
        }

        return errors;
    }
}

