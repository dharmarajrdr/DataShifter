package com.datashifter.adapter.sdk;

import java.io.Serializable;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Encapsulates a collection of DataRecords grouped for chunk/batch processing.
 */
public class DataBatch implements Serializable {

    private static final long serialVersionUID = 1L;

    private String tableName;
    private List<DataRecord> records;
    private long batchSequence;
    private Instant timestamp;

    public DataBatch() {
        this.records = new ArrayList<>();
        this.timestamp = Instant.now();
    }

    public DataBatch(String tableName, List<DataRecord> records, long batchSequence) {
        this.tableName = tableName;
        this.records = records != null ? new ArrayList<>(records) : new ArrayList<>();
        this.batchSequence = batchSequence;
        this.timestamp = Instant.now();
    }

    public String getTableName() {
        return tableName;
    }

    public void setTableName(String tableName) {
        this.tableName = tableName;
    }

    public List<DataRecord> getRecords() {
        return Collections.unmodifiableList(records);
    }

    public void setRecords(List<DataRecord> records) {
        this.records = records != null ? new ArrayList<>(records) : new ArrayList<>();
    }

    public void addRecord(DataRecord record) {
        if (this.records == null) {
            this.records = new ArrayList<>();
        }
        this.records.add(record);
    }

    public int size() {
        return records != null ? records.size() : 0;
    }

    public boolean isEmpty() {
        return records == null || records.isEmpty();
    }

    public long getBatchSequence() {
        return batchSequence;
    }

    public void setBatchSequence(long batchSequence) {
        this.batchSequence = batchSequence;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }
}
