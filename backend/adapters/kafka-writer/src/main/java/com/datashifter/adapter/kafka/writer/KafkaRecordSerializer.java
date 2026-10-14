package com.datashifter.adapter.kafka.writer;

import com.datashifter.adapter.sdk.DataRecord;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.internals.RecordHeader;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Serializes DataRecords into Kafka ProducerRecords with JSON payloads and headers.
 */
public class KafkaRecordSerializer {

    private final ObjectMapper objectMapper;

    public KafkaRecordSerializer() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    public ProducerRecord<String, byte[]> serialize(String topic, DataRecord record, String keyField, String fallbackPk) throws IOException {
        String key = extractKey(record, keyField, fallbackPk);

        Map<String, Object> payload = new LinkedHashMap<>();
        if (record.getOperation() != null) {
            payload.put("_op", record.getOperation().name());
        }
        if (record.getData() != null) {
            payload.putAll(record.getData());
        }
        if (record.getBeforeData() != null && !record.getBeforeData().isEmpty()) {
            payload.put("_before", record.getBeforeData());
        }

        byte[] valueBytes = objectMapper.writeValueAsBytes(payload);

        ProducerRecord<String, byte[]> producerRecord = new ProducerRecord<>(topic, key, valueBytes);

        if (record.getHeaders() != null) {
            for (Map.Entry<String, Object> entry : record.getHeaders().entrySet()) {
                if (entry.getValue() != null) {
                    byte[] headerBytes = entry.getValue().toString().getBytes(StandardCharsets.UTF_8);
                    producerRecord.headers().add(new RecordHeader(entry.getKey(), headerBytes));
                }
            }
        }

        if (record.getOperation() != null) {
            producerRecord.headers().add(new RecordHeader("operation", record.getOperation().name().getBytes(StandardCharsets.UTF_8)));
        }

        return producerRecord;
    }

    private String extractKey(DataRecord record, String keyField, String fallbackPk) {
        if (keyField != null && !keyField.isBlank()) {
            Object val = record.getField(keyField);
            if (val != null) return val.toString();
        }

        if (fallbackPk != null && !fallbackPk.isBlank()) {
            Object val = record.getField(fallbackPk);
            if (val != null) return val.toString();
        }

        if (record.getField("id") != null) {
            return record.getField("id").toString();
        }
        if (record.getField("ID") != null) {
            return record.getField("ID").toString();
        }

        return null;
    }
}
