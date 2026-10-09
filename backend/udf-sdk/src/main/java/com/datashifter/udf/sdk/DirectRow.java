package com.datashifter.udf.sdk;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * High-performance, zero-copy, mutable row wrapper designed for hot-path pipeline execution.
 * Avoids map allocations by directly delegating to an underlying source record.
 */
public class DirectRow implements Row {

    private Map<String, Object> delegate;
    private String defaultTargetCol;
    private Object defaultInputValue;

    public DirectRow() {
        this.delegate = Collections.emptyMap();
    }

    public DirectRow(Map<String, Object> delegate) {
        this.delegate = delegate != null ? delegate : Collections.emptyMap();
    }

    /**
     * Resets this wrapper for the current record without any memory allocation.
     */
    public DirectRow reset(Map<String, Object> sourceRecord, String targetColumn, Object inputValue) {
        this.delegate = sourceRecord != null ? sourceRecord : Collections.emptyMap();
        this.defaultTargetCol = targetColumn;
        this.defaultInputValue = inputValue;
        return this;
    }

    @Override
    public Object get(String columnName) {
        if (columnName != null && columnName.equals(defaultTargetCol) && !delegate.containsKey(columnName)) {
            return defaultInputValue;
        }
        return delegate.get(columnName);
    }

    @Override
    public <T> T get(String columnName, Class<T> type) {
        Object val = get(columnName);
        if (val == null) return null;
        return type.cast(val);
    }

    @Override
    public void set(String columnName, Object value) {
        if (delegate.isEmpty() && !(delegate instanceof HashMap)) {
            delegate = new HashMap<>();
        }
        delegate.put(columnName, value);
        if (columnName != null && columnName.equals(defaultTargetCol)) {
            defaultInputValue = value;
        }
    }

    @Override
    public boolean has(String columnName) {
        if (columnName != null && columnName.equals(defaultTargetCol) && defaultInputValue != null) {
            return true;
        }
        return delegate.containsKey(columnName);
    }

    @Override
    public void remove(String columnName) {
        delegate.remove(columnName);
        if (columnName != null && columnName.equals(defaultTargetCol)) {
            defaultInputValue = null;
        }
    }

    @Override
    public Set<String> getColumns() {
        return delegate.keySet();
    }

    @Override
    public Map<String, Object> toMap() {
        return delegate;
    }
}
