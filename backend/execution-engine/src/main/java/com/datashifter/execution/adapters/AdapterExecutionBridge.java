package com.datashifter.execution.adapters;

import com.datashifter.adapter.sdk.AdapterConfig;
import com.datashifter.adapter.sdk.DataRecord;
import com.datashifter.adapter.sdk.DataWriter;
import com.datashifter.adapter.sdk.RecordOperation;
import com.datashifter.adapter.sdk.WriteMode;
import com.datashifter.adapter.sdk.WriteResult;
import com.datashifter.common.cdc.CdcEvent;
import com.datashifter.common.enums.CdcOperationType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Bridges engine row representations and Change Data Capture events with the
 * modular DataShifter Adapter SPI (DataRecord, DataWriter, DataReader).
 */
@Component
@Slf4j
public class AdapterExecutionBridge {

    /**
     * Converts an engine row map to a standard DataRecord.
     */
    public DataRecord toDataRecord(Map<String, Object> row, RecordOperation operation, String tableName) {
        if (row == null) {
            return null;
        }
        Map<String, Object> headers = new LinkedHashMap<>();
        if (tableName != null && !tableName.isBlank()) {
            headers.put("tableName", tableName);
        }

        return DataRecord.builder()
                .data(row)
                .operation(operation != null ? operation : RecordOperation.READ)
                .headers(headers)
                .build();
    }

    /**
     * Converts a batch of engine row maps to DataRecords.
     */
    public List<DataRecord> toDataRecords(List<Map<String, Object>> rows, RecordOperation operation, String tableName) {
        if (rows == null || rows.isEmpty()) {
            return Collections.emptyList();
        }
        List<DataRecord> records = new ArrayList<>(rows.size());
        for (Map<String, Object> row : rows) {
            records.add(toDataRecord(row, operation, tableName));
        }
        return records;
    }

    /**
     * Extracts raw data map from a DataRecord.
     */
    public Map<String, Object> fromDataRecord(DataRecord record) {
        if (record == null) {
            return Collections.emptyMap();
        }
        return record.getData() != null ? record.getData() : Collections.emptyMap();
    }

    /**
     * Converts a stream of DataRecords to raw data maps.
     */
    public List<Map<String, Object>> fromDataRecords(List<DataRecord> records) {
        if (records == null || records.isEmpty()) {
            return Collections.emptyList();
        }
        List<Map<String, Object>> list = new ArrayList<>(records.size());
        for (DataRecord r : records) {
            list.add(fromDataRecord(r));
        }
        return list;
    }

    /**
     * Converts a streaming Change Data Capture (CDC) event to an adapter DataRecord.
     */
    public DataRecord cdcEventToDataRecord(CdcEvent event) {
        if (event == null) {
            return null;
        }

        RecordOperation op = mapCdcOperation(event.getOperationType());
        Map<String, Object> data = (op == RecordOperation.DELETE)
                ? (event.getAfterData() != null && !event.getAfterData().isEmpty()
                        ? event.getAfterData()
                        : (event.getPrimaryKeyValues() != null && !event.getPrimaryKeyValues().isEmpty()
                                ? event.getPrimaryKeyValues()
                                : event.getBeforeData()))
                : event.getAfterData();

        Map<String, Object> headers = new LinkedHashMap<>();
        if (event.getFullTableName() != null) headers.put("tableName", event.getFullTableName());
        if (event.getTransactionId() != null) headers.put("transactionId", event.getTransactionId());
        if (event.getCommitTimestamp() != null) headers.put("commitTimestamp", event.getCommitTimestamp().toString());
        if (event.getPosition() != null) headers.put("position", event.getPosition().getToken() != null ? event.getPosition().getToken() : event.getPosition().toString());
        if (event.getMetadata() != null) headers.putAll(event.getMetadata());

        return DataRecord.builder()
                .operation(op)
                .data(data != null ? data : Collections.emptyMap())
                .beforeData(event.getBeforeData())
                .headers(headers)
                .build();
    }

    /**
     * Writes a batch of engine rows using an adapter DataWriter.
     */
    public WriteResult writeBatch(DataWriter writer,
                                  AdapterConfig config,
                                  String targetTable,
                                  List<Map<String, Object>> rows,
                                  WriteMode writeMode,
                                  String primaryKeyColumn) throws Exception {
        if (rows == null || rows.isEmpty()) {
            return WriteResult.empty();
        }
        List<DataRecord> records = toDataRecords(rows, RecordOperation.INSERT, targetTable);
        return writer.writeBatch(config, targetTable, records, writeMode, primaryKeyColumn);
    }

    /**
     * Applies an ordered batch of Change Data Capture events through an adapter DataWriter.
     */
    public WriteResult applyCdcEvents(DataWriter writer,
                                     AdapterConfig config,
                                     String targetTable,
                                     List<CdcEvent> events,
                                     String primaryKeyColumn) throws Exception {
        if (events == null || events.isEmpty()) {
            return WriteResult.empty();
        }
        List<DataRecord> records = new ArrayList<>(events.size());
        for (CdcEvent event : events) {
            DataRecord r = cdcEventToDataRecord(event);
            if (r != null) {
                records.add(r);
            }
        }
        return writer.applyBatch(config, targetTable, records, primaryKeyColumn);
    }

    private RecordOperation mapCdcOperation(CdcOperationType op) {
        if (op == null) return RecordOperation.READ;
        return switch (op) {
            case INSERT -> RecordOperation.INSERT;
            case UPDATE -> RecordOperation.UPDATE;
            case DELETE -> RecordOperation.DELETE;
            default -> RecordOperation.READ;
        };
    }
}
