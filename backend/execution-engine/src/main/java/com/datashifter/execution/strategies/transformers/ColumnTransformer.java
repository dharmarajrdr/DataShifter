package com.datashifter.execution.strategies.transformers;

import java.util.Map;

/**
 * Single transformation function applied to a column value.
 * Implementations are stateless and reusable.
 */
public interface ColumnTransformer {
    Object transform(Object input, String arguments);

    default Object transform(Object input, String arguments, Map<String, Object> sourceRow) {
        return transform(input, arguments);
    }

    default Object transform(Object input, String arguments, Map<String, Object> sourceRow, String targetColumn) {
        return transform(input, arguments, sourceRow);
    }

    String getFunctionName();
}
