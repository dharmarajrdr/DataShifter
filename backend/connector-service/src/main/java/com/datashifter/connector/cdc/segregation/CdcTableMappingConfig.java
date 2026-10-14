package com.datashifter.connector.cdc.segregation;

import lombok.*;

import java.util.*;

/**
 * Encapsulates table-specific segregation and transformation configuration:
 * target table name, row filter predicate, target primary key, and column mappings.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CdcTableMappingConfig {

    private String sourceSchema;
    private String sourceTable;

    private String targetSchema;
    private String targetTable;

    private String targetPrimaryKeyColumn;

    @Builder.Default
    private CdcRowFilter rowFilter = CdcRowFilter.allowAll();

    @Builder.Default
    private List<CdcColumnTransformation> columnMappings = new ArrayList<>();

    /**
     * Transforms a row data map (afterData or beforeData) from source schema to target schema.
     */
    public Map<String, Object> transformRow(Map<String, Object> sourceRow) {
        if (sourceRow == null) return null;
        if (columnMappings == null || columnMappings.isEmpty()) {
            return new LinkedHashMap<>(sourceRow);
        }

        Map<String, Object> targetRow = new LinkedHashMap<>();
        for (CdcColumnTransformation mapping : columnMappings) {
            String targetCol = mapping.getTargetColumn();
            String sourceCol = mapping.getSourceColumn();

            Object sourceVal = null;
            if (sourceCol != null) {
                // Find matching column value (case-insensitive)
                sourceVal = sourceRow.get(sourceCol);
                if (sourceVal == null) {
                    for (Map.Entry<String, Object> entry : sourceRow.entrySet()) {
                        if (entry.getKey().equalsIgnoreCase(sourceCol)) {
                            sourceVal = entry.getValue();
                            break;
                        }
                    }
                }
            }

            Object transformedVal = mapping.apply(sourceVal, sourceRow);
            targetRow.put(targetCol, transformedVal);
        }

        return targetRow;
    }

    /**
     * Remaps primary key values from source column names to target column names.
     */
    public Map<String, Object> remapPrimaryKeys(Map<String, Object> sourcePk) {
        if (sourcePk == null || sourcePk.isEmpty()) return Collections.emptyMap();
        if (columnMappings == null || columnMappings.isEmpty()) {
            return new LinkedHashMap<>(sourcePk);
        }

        Map<String, Object> remapped = new LinkedHashMap<>();
        for (Map.Entry<String, Object> pkEntry : sourcePk.entrySet()) {
            String sourcePkCol = pkEntry.getKey();
            Object pkVal = pkEntry.getValue();

            // Find if there is an explicit target column mapping for this PK
            String targetPkCol = sourcePkCol;
            for (CdcColumnTransformation m : columnMappings) {
                if (m.getSourceColumn() != null && m.getSourceColumn().equalsIgnoreCase(sourcePkCol)) {
                    targetPkCol = m.getTargetColumn();
                    break;
                }
            }
            remapped.put(targetPkCol, pkVal);
        }

        // If a specific targetPrimaryKeyColumn is set and remapped has 1 entry, rename it
        if (targetPrimaryKeyColumn != null && !targetPrimaryKeyColumn.isBlank() && remapped.size() == 1) {
            Object singleVal = remapped.values().iterator().next();
            Map<String, Object> singlePk = new LinkedHashMap<>();
            singlePk.put(targetPrimaryKeyColumn, singleVal);
            return singlePk;
        }

        return remapped;
    }

    public String getEffectiveTargetTable() {
        if (targetTable != null && !targetTable.isBlank()) {
            return (targetSchema != null && !targetSchema.isBlank()) ? (targetSchema + "." + targetTable) : targetTable;
        }
        return (sourceSchema != null && !sourceSchema.isBlank()) ? (sourceSchema + "." + sourceTable) : sourceTable;
    }
}
