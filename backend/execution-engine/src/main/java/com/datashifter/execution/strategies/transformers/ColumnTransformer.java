package com.datashifter.execution.strategies.transformers;

/**
 * Single transformation function applied to a column value.
 * Implementations are stateless and reusable.
 */
public interface ColumnTransformer {
    Object transform(Object input, String arguments);
    String getFunctionName();
}
