package com.datashifter.udf.sdk;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public class SimpleRow implements Row {

    private final Map<String, Object> data;

    public SimpleRow() {
        this.data = new HashMap<>();
    }

    public SimpleRow(Map<String, Object> initialData) {
        this(initialData, false);
    }

    public SimpleRow(Map<String, Object> initialData, boolean directWrap) {
        if (directWrap && initialData != null) {
            this.data = initialData;
        } else {
            this.data = new HashMap<>();
            if (initialData != null) {
                this.data.putAll(initialData);
            }
        }
    }

    public static Row wrap(Map<String, Object> map) {
        return new SimpleRow(map, true);
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
