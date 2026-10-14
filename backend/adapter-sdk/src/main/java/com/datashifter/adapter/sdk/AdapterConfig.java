package com.datashifter.adapter.sdk;

import java.io.Serializable;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Encapsulates runtime parameters, connection details, and credentials supplied to an adapter.
 */
public class AdapterConfig implements Serializable {

    private static final long serialVersionUID = 1L;

    private final Map<String, Object> properties;

    public AdapterConfig() {
        this.properties = new LinkedHashMap<>();
    }

    public AdapterConfig(Map<String, Object> properties) {
        this.properties = properties != null ? new LinkedHashMap<>(properties) : new LinkedHashMap<>();
    }

    public static AdapterConfig of(Map<String, Object> properties) {
        return new AdapterConfig(properties);
    }

    public static Builder builder() {
        return new Builder();
    }

    public Map<String, Object> getProperties() {
        return Collections.unmodifiableMap(properties);
    }

    public Object get(String key) {
        return properties.get(key);
    }

    public String getString(String key) {
        Object val = properties.get(key);
        return val != null ? val.toString() : null;
    }

    public String getString(String key, String defaultValue) {
        String val = getString(key);
        return val != null ? val : defaultValue;
    }

    public Integer getInteger(String key) {
        Object val = properties.get(key);
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).intValue();
        try {
            return Integer.parseInt(val.toString().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public Integer getInteger(String key, Integer defaultValue) {
        Integer val = getInteger(key);
        return val != null ? val : defaultValue;
    }

    public Long getLong(String key) {
        Object val = properties.get(key);
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).longValue();
        try {
            return Long.parseLong(val.toString().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public Long getLong(String key, Long defaultValue) {
        Long val = getLong(key);
        return val != null ? val : defaultValue;
    }

    public Boolean getBoolean(String key) {
        Object val = properties.get(key);
        if (val == null) return null;
        if (val instanceof Boolean) return (Boolean) val;
        return Boolean.parseBoolean(val.toString().trim());
    }

    public Boolean getBoolean(String key, Boolean defaultValue) {
        Boolean val = getBoolean(key);
        return val != null ? val : defaultValue;
    }

    public boolean containsKey(String key) {
        return properties.containsKey(key);
    }

    public static class Builder {
        private final Map<String, Object> properties = new LinkedHashMap<>();

        public Builder property(String key, Object value) {
            this.properties.put(key, value);
            return this;
        }

        public Builder properties(Map<String, Object> properties) {
            if (properties != null) {
                this.properties.putAll(properties);
            }
            return this;
        }

        public AdapterConfig build() {
            return new AdapterConfig(properties);
        }
    }
}
