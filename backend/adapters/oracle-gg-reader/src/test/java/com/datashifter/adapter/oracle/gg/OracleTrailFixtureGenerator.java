package com.datashifter.adapter.oracle.gg;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Test fixture utility that generates binary and JSON GoldenGate trail files.
 */
public class OracleTrailFixtureGenerator {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public void generateBinaryTrailFile(File targetFile, int sequenceNumber, List<TestTransaction> transactions) throws IOException {
        try (FileOutputStream fos = new FileOutputStream(targetFile)) {
            ByteBuffer header = ByteBuffer.allocate(16);
            header.putShort(OracleTrailConstants.TRAIL_MAGIC_BINARY);
            header.putShort((short) sequenceNumber);
            header.putLong(System.currentTimeMillis());
            header.putInt(0);
            fos.write(header.array());

            for (TestTransaction tx : transactions) {
                writeBinaryRecord(fos, OracleTrailConstants.OP_BEGIN, tx.scn, tx.txId, "", "", Map.of(), Map.of());
                for (TestRecord r : tx.records) {
                    writeBinaryRecord(fos, r.opCode, tx.scn, tx.txId, r.schemaName, r.tableName, r.afterColumns, r.beforeColumns);
                }
                writeBinaryRecord(fos, OracleTrailConstants.OP_COMMIT, tx.scn, tx.txId, "", "", Map.of(), Map.of());
            }
        }
    }

    public void generateJsonTrailFile(File targetFile, List<TestTransaction> transactions) throws IOException {
        try (FileOutputStream fos = new FileOutputStream(targetFile)) {
            for (TestTransaction tx : transactions) {
                for (TestRecord r : tx.records) {
                    Map<String, Object> jsonMap = new LinkedHashMap<>();
                    jsonMap.put("table", r.schemaName + "." + r.tableName);
                    jsonMap.put("op_type", r.opCode == 3 ? "I" : (r.opCode == 5 ? "U" : "D"));
                    jsonMap.put("current_scn", tx.scn);
                    jsonMap.put("transaction_id", tx.txId);
                    jsonMap.put("timestamp", Instant.now().toString());
                    jsonMap.put("primary_keys", List.of("ID"));
                    jsonMap.put("after", r.afterColumns);
                    jsonMap.put("before", r.beforeColumns);

                    String line = objectMapper.writeValueAsString(jsonMap) + "\n";
                    fos.write(line.getBytes(StandardCharsets.UTF_8));
                }

                if (tx.txId != null && !tx.txId.isBlank()) {
                    Map<String, Object> commitMap = new LinkedHashMap<>();
                    commitMap.put("op_type", "C");
                    commitMap.put("current_scn", tx.scn);
                    commitMap.put("transaction_id", tx.txId);
                    commitMap.put("timestamp", Instant.now().toString());
                    String commitLine = objectMapper.writeValueAsString(commitMap) + "\n";
                    fos.write(commitLine.getBytes(StandardCharsets.UTF_8));
                }
            }
        }
    }

    private void writeBinaryRecord(FileOutputStream fos, int opCode, long scn, String txId,
                                   String schema, String table,
                                   Map<String, Object> after, Map<String, Object> before) throws IOException {
        ByteBuffer payload = ByteBuffer.allocate(64 * 1024);

        payload.putShort((short) opCode);
        payload.putLong(scn);
        payload.putLong(System.currentTimeMillis());

        writeString(payload, txId != null ? txId : "");
        writeString(payload, schema != null ? schema : "");
        writeString(payload, table != null ? table : "");

        writeColumnMap(payload, after);
        writeColumnMap(payload, before);

        int recordLength = payload.position();

        ByteBuffer lengthBuf = ByteBuffer.allocate(4);
        lengthBuf.putInt(recordLength);

        fos.write(lengthBuf.array());
        fos.write(payload.array(), 0, recordLength);
    }

    private void writeString(ByteBuffer buf, String s) {
        byte[] bytes = s.getBytes(StandardCharsets.UTF_8);
        buf.putShort((short) bytes.length);
        buf.put(bytes);
    }

    private void writeColumnMap(ByteBuffer buf, Map<String, Object> map) {
        if (map == null || map.isEmpty()) {
            buf.putShort((short) 0);
            return;
        }

        buf.putShort((short) map.size());
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            writeString(buf, entry.getKey());
            if (entry.getValue() == null) {
                buf.put((byte) 1);
            } else {
                buf.put((byte) 0);
                byte[] valBytes = entry.getValue().toString().getBytes(StandardCharsets.UTF_8);
                buf.putInt(valBytes.length);
                buf.put(valBytes);
            }
        }
    }

    public static class TestTransaction {
        public String txId;
        public long scn;
        public List<TestRecord> records;

        public TestTransaction(String txId, long scn, List<TestRecord> records) {
            this.txId = txId;
            this.scn = scn;
            this.records = records;
        }
    }

    public static class TestRecord {
        public int opCode;
        public String schemaName;
        public String tableName;
        public Map<String, Object> afterColumns;
        public Map<String, Object> beforeColumns;

        public TestRecord(int opCode, String schemaName, String tableName,
                          Map<String, Object> afterColumns, Map<String, Object> beforeColumns) {
            this.opCode = opCode;
            this.schemaName = schemaName;
            this.tableName = tableName;
            this.afterColumns = afterColumns;
            this.beforeColumns = beforeColumns;
        }
    }
}
