package com.datashifter.connector.spi.adapters.postgres.cdc;

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
 * Test fixture utility that generates binary and JSON PostgreSQL WAL files
 * for automated unit and integration tests.
 */
public class PostgresWalFixtureGenerator {

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Generates a binary PostgreSQL WAL segment file.
     */
    public void generateBinaryWalFile(File targetFile, int timelineId, long startingLsn, List<TestTransaction> transactions) throws IOException {
        try (FileOutputStream fos = new FileOutputStream(targetFile)) {
            // 1. Write long page header for first 8KB page (40 bytes)
            ByteBuffer pageHeader = ByteBuffer.allocate(PostgresWalConstants.XLOG_LONG_PAGE_HEADER_SIZE);
            pageHeader.putShort(PostgresWalConstants.XLOG_PAGE_MAGIC_15);
            pageHeader.putShort(PostgresWalConstants.XLP_LONG_HEADER);
            pageHeader.putInt(timelineId);
            pageHeader.putLong(startingLsn);
            pageHeader.putInt(0); // rem_len
            pageHeader.putInt(0); // padding
            pageHeader.putLong(0L); // xlp_sysid
            pageHeader.putInt(PostgresWalConstants.WAL_SEGMENT_SIZE);
            pageHeader.putInt(PostgresWalConstants.XLOG_BLCKSZ);
            fos.write(pageHeader.array());

            // 2. Write transactions
            for (TestTransaction tx : transactions) {
                // Write DML records
                for (TestRecord r : tx.records) {
                    writeBinaryRecord(fos, r.rmid, r.opCode, tx.xid, tx.lsn, r.schemaName, r.tableName, r.afterColumns);
                }

                // Write COMMIT or ABORT marker
                if (tx.isAbort) {
                    writeBinaryRecord(fos, PostgresWalConstants.RM_TRANSACTION_ID, PostgresWalConstants.XLOG_XACT_ABORT, tx.xid, tx.lsn, "", "", Map.of());
                } else {
                    writeBinaryRecord(fos, PostgresWalConstants.RM_TRANSACTION_ID, PostgresWalConstants.XLOG_XACT_COMMIT, tx.xid, tx.lsn, "", "", Map.of());
                }
            }
        }
    }

    /**
     * Generates a line-delimited JSON logical decoding stream file.
     */
    public void generateJsonWalFile(File targetFile, List<TestTransaction> transactions) throws IOException {
        try (FileOutputStream fos = new FileOutputStream(targetFile)) {
            for (TestTransaction tx : transactions) {
                // Optional BEGIN
                Map<String, Object> beginMap = new LinkedHashMap<>();
                beginMap.put("action", "B");
                beginMap.put("xid", String.valueOf(tx.xid));
                beginMap.put("lsn", PostgresWalConstants.formatLsn(tx.lsn));
                fos.write((objectMapper.writeValueAsString(beginMap) + "\n").getBytes(StandardCharsets.UTF_8));

                for (TestRecord r : tx.records) {
                    Map<String, Object> jsonMap = new LinkedHashMap<>();
                    jsonMap.put("table", r.schemaName + "." + r.tableName);
                    jsonMap.put("action", r.actionString);
                    jsonMap.put("xid", String.valueOf(tx.xid));
                    jsonMap.put("lsn", PostgresWalConstants.formatLsn(tx.lsn));
                    jsonMap.put("columns", r.afterColumns);
                    if (!r.beforeColumns.isEmpty()) {
                        jsonMap.put("identity", r.beforeColumns);
                    }
                    fos.write((objectMapper.writeValueAsString(jsonMap) + "\n").getBytes(StandardCharsets.UTF_8));
                }

                // COMMIT or ABORT
                Map<String, Object> endMap = new LinkedHashMap<>();
                endMap.put("action", tx.isAbort ? "A" : "C");
                endMap.put("xid", String.valueOf(tx.xid));
                endMap.put("lsn", PostgresWalConstants.formatLsn(tx.lsn));
                fos.write((objectMapper.writeValueAsString(endMap) + "\n").getBytes(StandardCharsets.UTF_8));
            }
        }
    }

    private void writeBinaryRecord(FileOutputStream fos, int rmid, int opCode, int xid, long lsn,
                                   String schema, String table, Map<String, Object> columns) throws IOException {
        byte[] schemaBytes = schema.getBytes(StandardCharsets.UTF_8);
        byte[] tableBytes = table.getBytes(StandardCharsets.UTF_8);

        // Serialize columns
        ByteBuffer colBuf = ByteBuffer.allocate(8192);
        colBuf.putShort((short) columns.size());
        for (Map.Entry<String, Object> e : columns.entrySet()) {
            byte[] kBytes = e.getKey().getBytes(StandardCharsets.UTF_8);
            byte[] vBytes = String.valueOf(e.getValue()).getBytes(StandardCharsets.UTF_8);
            colBuf.putShort((short) kBytes.length);
            colBuf.put(kBytes);
            colBuf.putShort((short) vBytes.length);
            colBuf.put(vBytes);
        }
        colBuf.flip();
        byte[] colBytes = new byte[colBuf.remaining()];
        colBuf.get(colBytes);

        int payloadLen = 2 + schemaBytes.length + 2 + tableBytes.length + colBytes.length;
        int totLen = PostgresWalConstants.XLOG_RECORD_HEADER_SIZE + payloadLen;

        // Write 24-byte header
        ByteBuffer header = ByteBuffer.allocate(PostgresWalConstants.XLOG_RECORD_HEADER_SIZE);
        header.putInt(totLen);
        header.putInt(xid);
        header.putLong(lsn);
        header.put((byte) opCode);
        header.put((byte) rmid);
        header.put(new byte[6]); // padding
        fos.write(header.array());

        // Write payload
        ByteBuffer payload = ByteBuffer.allocate(payloadLen);
        payload.putShort((short) schemaBytes.length);
        payload.put(schemaBytes);
        payload.putShort((short) tableBytes.length);
        payload.put(tableBytes);
        payload.put(colBytes);
        fos.write(payload.array());

        // Align to 8-byte boundary
        int padding = ((totLen + 7) & ~7) - totLen;
        if (padding > 0) {
            fos.write(new byte[padding]);
        }
    }

    // =========================================================================
    // DTOs for test builders
    // =========================================================================

    public static class TestTransaction {
        public int xid;
        public long lsn;
        public boolean isAbort;
        public List<TestRecord> records;

        public TestTransaction(int xid, long lsn, List<TestRecord> records) {
            this(xid, lsn, false, records);
        }

        public TestTransaction(int xid, long lsn, boolean isAbort, List<TestRecord> records) {
            this.xid = xid;
            this.lsn = lsn;
            this.isAbort = isAbort;
            this.records = records;
        }
    }

    public static class TestRecord {
        public int rmid;
        public int opCode;
        public String actionString;
        public String schemaName;
        public String tableName;
        public Map<String, Object> beforeColumns = new LinkedHashMap<>();
        public Map<String, Object> afterColumns = new LinkedHashMap<>();

        public static TestRecord insert(String schema, String table, Map<String, Object> cols) {
            TestRecord r = new TestRecord();
            r.rmid = PostgresWalConstants.RM_HEAP_ID;
            r.opCode = PostgresWalConstants.XLOG_HEAP_INSERT;
            r.actionString = "I";
            r.schemaName = schema;
            r.tableName = table;
            r.afterColumns = cols;
            return r;
        }

        public static TestRecord update(String schema, String table, Map<String, Object> before, Map<String, Object> after) {
            TestRecord r = new TestRecord();
            r.rmid = PostgresWalConstants.RM_HEAP_ID;
            r.opCode = PostgresWalConstants.XLOG_HEAP_UPDATE;
            r.actionString = "U";
            r.schemaName = schema;
            r.tableName = table;
            r.beforeColumns = before;
            r.afterColumns = after;
            return r;
        }

        public static TestRecord delete(String schema, String table, Map<String, Object> before) {
            TestRecord r = new TestRecord();
            r.rmid = PostgresWalConstants.RM_HEAP_ID;
            r.opCode = PostgresWalConstants.XLOG_HEAP_DELETE;
            r.actionString = "D";
            r.schemaName = schema;
            r.tableName = table;
            r.beforeColumns = before;
            return r;
        }
    }
}
