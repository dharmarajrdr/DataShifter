package com.datashifter.adapter.filesystem.writer;

import com.datashifter.adapter.sdk.DataRecord;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.io.IOException;
import java.io.StringWriter;
import java.util.*;

/**
 * Formatters for serializing DataRecords to disk in JSONL, JSON, or CSV.
 */
public interface FileRecordFormatter {

    String formatBatch(List<DataRecord> records, boolean includeHeader) throws IOException;

    String getFileExtension();

    static FileRecordFormatter forFormat(String format) {
        if (format == null) {
            return new JsonlFormatter();
        }
        return switch (format.toLowerCase()) {
            case "csv" -> new CsvFormatter();
            case "json" -> new JsonArrayFormatter();
            default -> new JsonlFormatter();
        };
    }

    /**
     * Line-delimited JSON (JSONL).
     */
    class JsonlFormatter implements FileRecordFormatter {
        private final ObjectMapper mapper = createMapper();

        @Override
        public String formatBatch(List<DataRecord> records, boolean includeHeader) throws IOException {
            StringBuilder sb = new StringBuilder();
            for (DataRecord record : records) {
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
                sb.append(mapper.writeValueAsString(payload)).append("\n");
            }
            return sb.toString();
        }

        @Override
        public String getFileExtension() {
            return ".jsonl";
        }
    }

    /**
     * Standard JSON Array format.
     */
    class JsonArrayFormatter implements FileRecordFormatter {
        private final ObjectMapper mapper = createMapper();

        @Override
        public String formatBatch(List<DataRecord> records, boolean includeHeader) throws IOException {
            List<Map<String, Object>> list = new ArrayList<>(records.size());
            for (DataRecord record : records) {
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
                list.add(payload);
            }
            return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(list);
        }

        @Override
        public String getFileExtension() {
            return ".json";
        }
    }

    /**
     * Comma-Separated Values (CSV).
     */
    class CsvFormatter implements FileRecordFormatter {

        @Override
        public String formatBatch(List<DataRecord> records, boolean includeHeader) throws IOException {
            if (records == null || records.isEmpty()) {
                return "";
            }

            Set<String> columnSet = new LinkedHashSet<>();
            for (DataRecord record : records) {
                if (record.getData() != null) {
                    columnSet.addAll(record.getData().keySet());
                }
            }
            List<String> columns = new ArrayList<>(columnSet);

            StringWriter sw = new StringWriter();
            if (includeHeader) {
                for (int i = 0; i < columns.size(); i++) {
                    if (i > 0) sw.write(",");
                    sw.write(escapeCsv(columns.get(i)));
                }
                sw.write("\n");
            }

            for (DataRecord record : records) {
                for (int i = 0; i < columns.size(); i++) {
                    if (i > 0) sw.write(",");
                    Object val = record.getField(columns.get(i));
                    sw.write(escapeCsv(val != null ? val.toString() : ""));
                }
                sw.write("\n");
            }

            return sw.toString();
        }

        @Override
        public String getFileExtension() {
            return ".csv";
        }

        private String escapeCsv(String value) {
            if (value == null) return "";
            if (value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r")) {
                return "\"" + value.replace("\"", "\"\"") + "\"";
            }
            return value;
        }
    }

    private static ObjectMapper createMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }
}
