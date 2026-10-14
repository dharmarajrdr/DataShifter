package com.datashifter.adapter.sdk;

import java.io.Serializable;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Extensible data record envelope exchanged between readers, pipelines, and writers.
 */
public class DataRecord implements Serializable {

    private static final long serialVersionUID = 1L;

    /** Dynamic field values (columnName -> columnValue) */
    private Map<String, Object> data;

    /** Extensible metadata headers (e.g. SCN, LSN, partition, offset, timestamp, topic) */
    private Map<String, Object> headers;

    /** Operation type: READ, INSERT, UPDATE, DELETE */
    private RecordOperation operation;

    /** Pre-image values for CDC UPDATE/DELETE operations (null for batch) */
    private Map<String, Object> beforeData;

    public DataRecord() {
        this.data = new LinkedHashMap<>();
        this.headers = new LinkedHashMap<>();
        this.operation = RecordOperation.READ;
        this.beforeData = null;
    }

    public DataRecord(Map<String, Object> data,
                      Map<String, Object> headers,
                      RecordOperation operation,
                      Map<String, Object> beforeData) {
        this.data = data != null ? new LinkedHashMap<>(data) : new LinkedHashMap<>();
        this.headers = headers != null ? new LinkedHashMap<>(headers) : new LinkedHashMap<>();
        this.operation = operation != null ? operation : RecordOperation.READ;
        this.beforeData = beforeData != null ? new LinkedHashMap<>(beforeData) : null;
    }

    /**
     * Convenience factory for standard batch records.
     */
    public static DataRecord of(Map<String, Object> data) {
        return new DataRecord(data, Collections.emptyMap(), RecordOperation.READ, null);
    }

    /**
     * Convenience factory with operation.
     */
    public static DataRecord of(Map<String, Object> data, RecordOperation operation) {
        return new DataRecord(data, Collections.emptyMap(), operation, null);
    }

    public static Builder builder() {
        return new Builder();
    }

    public Map<String, Object> getData() {
        return data;
    }

    public void setData(Map<String, Object> data) {
        this.data = data != null ? new LinkedHashMap<>(data) : new LinkedHashMap<>();
    }

    public Object getField(String fieldName) {
        return data != null ? data.get(fieldName) : null;
    }

    public void setField(String fieldName, Object value) {
        if (this.data == null) {
            this.data = new LinkedHashMap<>();
        }
        this.data.put(fieldName, value);
    }

    public Map<String, Object> getHeaders() {
        return headers;
    }

    public void setHeaders(Map<String, Object> headers) {
        this.headers = headers != null ? new LinkedHashMap<>(headers) : new LinkedHashMap<>();
    }

    public Object getHeader(String headerName) {
        return headers != null ? headers.get(headerName) : null;
    }

    public void setHeader(String headerName, Object value) {
        if (this.headers == null) {
            this.headers = new LinkedHashMap<>();
        }
        this.headers.put(headerName, value);
    }

    public RecordOperation getOperation() {
        return operation;
    }

    public void setOperation(RecordOperation operation) {
        this.operation = operation != null ? operation : RecordOperation.READ;
    }

    public Map<String, Object> getBeforeData() {
        return beforeData;
    }

    public void setBeforeData(Map<String, Object> beforeData) {
        this.beforeData = beforeData != null ? new LinkedHashMap<>(beforeData) : null;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        DataRecord that = (DataRecord) o;
        return Objects.equals(data, that.data) &&
               Objects.equals(headers, that.headers) &&
               operation == that.operation &&
               Objects.equals(beforeData, that.beforeData);
    }

    @Override
    public int hashCode() {
        return Objects.hash(data, headers, operation, beforeData);
    }

    @Override
    public String toString() {
        return "DataRecord{" +
                "operation=" + operation +
                ", data=" + data +
                ", headers=" + headers +
                (beforeData != null ? ", beforeData=" + beforeData : "") +
                '}';
    }

    public static class Builder {
        private Map<String, Object> data;
        private Map<String, Object> headers;
        private RecordOperation operation = RecordOperation.READ;
        private Map<String, Object> beforeData;

        public Builder data(Map<String, Object> data) {
            this.data = data;
            return this;
        }

        public Builder headers(Map<String, Object> headers) {
            this.headers = headers;
            return this;
        }

        public Builder header(String key, Object value) {
            if (this.headers == null) {
                this.headers = new LinkedHashMap<>();
            }
            this.headers.put(key, value);
            return this;
        }

        public Builder operation(RecordOperation operation) {
            this.operation = operation;
            return this;
        }

        public Builder beforeData(Map<String, Object> beforeData) {
            this.beforeData = beforeData;
            return this;
        }

        public DataRecord build() {
            return new DataRecord(data, headers, operation, beforeData);
        }
    }
}
