package com.datashifter.udf.sdk;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public class SimpleRow implements Row {

    private final Map<String, Object> data = new HashMap<>();

    public SimpleRow() {
    }

    public SimpleRow(Map<String, Object> initialData) {
        if (initialData != null) {
            this.data.putAll(initialData);
        }
    }

    @Override
    public Object get(String columnName) {
        return data.get(columnName);
    }

    @Override
    public <T> T get(String columnName, Class<T> type) {
        Object val = data.get(columnName);
        if (val == null) return null;
        return type.cast(val);
    }

    @Override
    public void set(String columnName, Object value) {
        data.put(columnName, value);
    }

    @Override
    public boolean has(String columnName) {
        return data.containsKey(columnName);
    }

    @Override
    public void remove(String columnName) {
        data.remove(columnName);
    }

    @Override
    public Set<String> getColumns() {
        return data.keySet();
    }

    @Override
    public Map<String, Object> toMap() {
        return new HashMap<>(data);
    }
}
