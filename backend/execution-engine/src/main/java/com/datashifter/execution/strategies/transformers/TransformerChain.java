package com.datashifter.execution.strategies.transformers;

import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.Map;

@RequiredArgsConstructor
public class TransformerChain {

    private final List<TransformerStep> steps;

    /**
     * Apply the chain without row context (backward compatible).
     */
    public Object apply(Object input) {
        Object result = input;
        for (TransformerStep step : steps) {
            result = step.transformer().transform(result, step.arguments());
        }
        return result;
    }

    /**
     * Apply the chain with full source row context.
     * This enables CONCAT_COLUMNS to resolve column references from the source row.
     *
     * For CONCAT_COLUMNS, the args format is "separator|col1,col2".
     * This method resolves col1,col2 to actual values from the source row
     * before passing to the transformer.
     */
    public Object applyWithContext(Object input, Map<String, Object> sourceRow) {
        Object result = input;
        for (TransformerStep step : steps) {
            String args = step.arguments();

            // Special handling for CONCAT_COLUMNS — resolve column references
            if ("CONCAT_COLUMNS".equals(step.transformer().getFunctionName()) && args != null && sourceRow != null) {
                args = resolveColumnReferences(args, sourceRow);
            }

            result = step.transformer().transform(result, args);
        }
        return result;
    }

    /**
     * Resolves column name references in args to actual values from the source row.
     *
     * Input:  "separator|col1,col2"
     * Output: "separator|value1,value2"
     *
     * Example: " |last_name" with sourceRow={first_name="John", last_name="Doe"}
     *   → " |Doe"
     */
    private String resolveColumnReferences(String args, Map<String, Object> sourceRow) {
        String[] parts = args.split("\\|", 2);
        if (parts.length < 2) return args;

        String separator = parts[0];
        String[] colRefs = parts[1].split(",");
        StringBuilder resolved = new StringBuilder(separator).append("|");

        for (int i = 0; i < colRefs.length; i++) {
            String colName = colRefs[i].trim();
            // Try exact match first, then case-insensitive
            Object val = sourceRow.get(colName);
            if (val == null) {
                for (Map.Entry<String, Object> entry : sourceRow.entrySet()) {
                    if (entry.getKey().equalsIgnoreCase(colName)) {
                        val = entry.getValue();
                        break;
                    }
                }
            }
            if (i > 0) resolved.append(",");
            resolved.append(val != null ? val.toString() : "");
        }

        return resolved.toString();
    }

    public record TransformerStep(ColumnTransformer transformer, String arguments) {}
}