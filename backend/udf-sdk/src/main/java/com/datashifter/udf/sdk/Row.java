package com.datashifter.udf.sdk;

import java.util.Map;
import java.util.Set;

/**
 * Represents a single row (or record) of data in a DataShifter pipeline.
 */
public interface Row {
    /**
     * Retrieves the value of the specified column.
     */
    Object get(String columnName);
    
    /**
     * Retrieves a typed value.
     */
    <T> T get(String columnName, Class<T> type);

    /**
     * Sets or updates the value of the specified column.
     */
    void set(String columnName, Object value);

    /**
     * Checks if the row contains the specified column.
     */
    boolean has(String columnName);

    /**
     * Removes the specified column from the row.
     */
    void remove(String columnName);

    /**
     * Returns a set of all column names in this row.
     */
    Set<String> getColumns();
    
    /**
     * Returns the underlying map representation of the row.
     */
    Map<String, Object> toMap();
}
