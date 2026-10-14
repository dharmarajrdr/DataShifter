package com.datashifter.connector.spi.adapters.postgres.cdc;

import com.datashifter.common.enums.CdcOperationType;
import com.datashifter.connector.cdc.segregation.CdcTableFilter;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * High-performance parser for PostgreSQL Write-Ahead Log (WAL) records.
 * Supports both low-level binary WAL parsing and structured JSON/logical decoding parsing.
 */
@Slf4j
public class PostgresWalParser {

    private final ObjectMapper objectMapper;

    public PostgresWalParser() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    /**
     * Inspects a WAL file header to identify format (binary vs JSON) and starting metadata.
     */
    public PostgresWalHeader readHeader(File file) throws IOException {
        try (RandomAccessFile raf = new RandomAccessFile(file, "r");
             FileChannel channel = raf.getChannel()) {

            if (channel.size() < 4) {
                return PostgresWalHeader.builder().binaryFormat(false).headerLength(0).build();
            }

            ByteBuffer buffer = ByteBuffer.allocate(PostgresWalConstants.XLOG_LONG_PAGE_HEADER_SIZE);
            channel.read(buffer);
            buffer.flip();

            short magic = buffer.getShort();
            if (PostgresWalConstants.isWalPageMagic(magic)) {
                short info = buffer.getShort();
                int timelineId = buffer.getInt();
                long pageAddr = buffer.getLong();
                int remLen = buffer.getInt();

                boolean isLong = (info & PostgresWalConstants.XLP_LONG_HEADER) != 0;
                int headerLen = isLong ? PostgresWalConstants.XLOG_LONG_PAGE_HEADER_SIZE : PostgresWalConstants.XLOG_SHORT_PAGE_HEADER_SIZE;

                return PostgresWalHeader.builder()
                        .magic(magic)
                        .info(info)
                        .timelineId(timelineId)
                        .pageAddressLsn(pageAddr)
                        .remLen(remLen)
                        .headerLength(headerLen)
                        .binaryFormat(true)
                        .createdAt(Instant.ofEpochMilli(file.lastModified()))
                        .build();
            }

            // Structured / line-delimited JSON WAL
            return PostgresWalHeader.builder()
                    .binaryFormat(false)
                    .headerLength(0)
                    .createdAt(Instant.ofEpochMilli(file.lastModified()))
                    .build();
        }
    }

    /**
     * Parses the next binary WAL record from the given FileChannel.
     */
    public PostgresWalRecord parseNextBinaryRecord(FileChannel channel, String sourceFileName, CdcTableFilter tableFilter) throws IOException {
        long currentPos = channel.position();
        long fileSize = channel.size();

        // 1. Check if we need to advance over an 8KB page boundary header
        int pageOffset = (int) (currentPos % PostgresWalConstants.XLOG_BLCKSZ);
        if (pageOffset == 0) {
            // Start of a new 8KB page
            if (currentPos + PostgresWalConstants.XLOG_SHORT_PAGE_HEADER_SIZE > fileSize) {
                return null; // Incomplete page header
            }
            int headerSize = (currentPos == 0)
                    ? PostgresWalConstants.XLOG_LONG_PAGE_HEADER_SIZE
                    : PostgresWalConstants.XLOG_SHORT_PAGE_HEADER_SIZE;
            channel.position(currentPos + headerSize);
            currentPos = channel.position();
        }

        // Align position to 8-byte boundary (MAXALIGN)
        long alignPadding = (8 - (currentPos % 8)) % 8;
        if (alignPadding > 0) {
            currentPos += alignPadding;
            channel.position(currentPos);
        }

        // Check if enough bytes remain for standard 24-byte record header
        if (currentPos + PostgresWalConstants.XLOG_RECORD_HEADER_SIZE > fileSize) {
            return null;
        }

        ByteBuffer headerBuf = ByteBuffer.allocate(PostgresWalConstants.XLOG_RECORD_HEADER_SIZE);
        channel.read(headerBuf);
        headerBuf.flip();

        int totLen = headerBuf.getInt();
        if (totLen <= 0 || totLen < PostgresWalConstants.XLOG_RECORD_HEADER_SIZE) {
            // Reached zero-padding at end of page or end of written records
            return null;
        }

        int xid = headerBuf.getInt();
        long prevLsn = headerBuf.getLong();
        byte infoByte = headerBuf.get();
        byte rmidByte = headerBuf.get();
        // Skip remaining padding / CRC (6 bytes)
        headerBuf.position(PostgresWalConstants.XLOG_RECORD_HEADER_SIZE);

        int payloadLen = totLen - PostgresWalConstants.XLOG_RECORD_HEADER_SIZE;
        if (currentPos + totLen > fileSize) {
            // Partial record written by background engine, retry on next poll
            channel.position(currentPos);
            return null;
        }

        // Derive LSN from file position
        long segBaseLsn = PostgresWalConstants.walFileNameToLsn(sourceFileName);
        long recordLsn = segBaseLsn + currentPos;
        String lsnFormatted = PostgresWalConstants.formatLsn(recordLsn);

        int rmid = rmidByte & 0xFF;
        int opCode = infoByte & 0xFF;

        // Parse payload
        ByteBuffer payloadBuf = ByteBuffer.allocate(payloadLen);
        channel.read(payloadBuf);
        payloadBuf.flip();

        PostgresWalRecord.PostgresWalRecordBuilder builder = PostgresWalRecord.builder()
                .sourceFile(sourceFileName)
                .fileOffset(currentPos)
                .recordLength(totLen)
                .lsn(recordLsn)
                .lsnFormatted(lsnFormatted)
                .transactionId(String.valueOf(xid))
                .resourceManagerId(rmid)
                .opCode(opCode)
                .timestamp(Instant.now());

        // Handle Resource Managers
        if (rmid == PostgresWalConstants.RM_TRANSACTION_ID) {
            if ((opCode & ~0x10) == PostgresWalConstants.XLOG_XACT_COMMIT) {
                return builder.operationType(CdcOperationType.COMMIT).build();
            } else if ((opCode & ~0x10) == PostgresWalConstants.XLOG_XACT_ABORT) {
                return builder.operationType(CdcOperationType.ROLLBACK).build();
            }
        }

        if (rmid == PostgresWalConstants.RM_HEAP_ID || rmid == PostgresWalConstants.RM_HEAP2_ID) {
            CdcOperationType opType = mapHeapOpCode(rmid, opCode);
            builder.operationType(opType);

            // Read table and column payload if present in custom/mock binary format
            parseBinaryPayload(payloadBuf, builder, tableFilter);
            return builder.build();
        }

        // Fallback for other resource managers (RM_LOGICALMSG_ID, etc.)
        builder.operationType(CdcOperationType.INSERT);
        parseBinaryPayload(payloadBuf, builder, tableFilter);
        return builder.build();
    }

    /**
     * Parses line-delimited JSON logical decoding stream records (e.g. wal2json, test_decoding).
     */
    public PostgresWalRecord parseNextJsonRecord(RandomAccessFile raf, String sourceFileName, CdcTableFilter tableFilter) throws IOException {
        long currentOffset = raf.getFilePointer();
        String line = raf.readLine();

        if (line == null) {
            return null;
        }

        line = line.trim();
        if (line.isEmpty() || line.startsWith("#")) {
            return parseNextJsonRecord(raf, sourceFileName, tableFilter);
        }

        try {
            JsonNode root = objectMapper.readTree(line);

            String action = root.has("action") ? root.get("action").asText() :
                    (root.has("type") ? root.get("type").asText() : "I");

            CdcOperationType opType = mapJsonAction(action);

            String fullTable = root.has("table") ? root.get("table").asText() : "";
            String schema = "public";
            String table = fullTable;
            if (fullTable.contains(".")) {
                String[] parts = fullTable.split("\\.", 2);
                schema = parts[0];
                table = parts[1];
            }

            String xid = root.has("xid") ? root.get("xid").asText() :
                    (root.has("txId") ? root.get("txId").asText() : "");

            long lsn = 0L;
            String lsnStr = "";
            if (root.has("lsn")) {
                lsnStr = root.get("lsn").asText();
                lsn = PostgresWalConstants.parseLsn(lsnStr);
            } else if (root.has("pos")) {
                lsnStr = root.get("pos").asText();
                lsn = PostgresWalConstants.parseLsn(lsnStr);
            }

            boolean isFiltered = (tableFilter != null && !tableFilter.matches(table));

            Map<String, Object> afterMap = new LinkedHashMap<>();
            if (root.has("columns") && root.get("columns").isObject()) {
                Iterator<Map.Entry<String, JsonNode>> fields = root.get("columns").fields();
                while (fields.hasNext()) {
                    var f = fields.next();
                    afterMap.put(f.getKey(), extractValue(f.getValue()));
                }
            }

            Map<String, Object> beforeMap = new LinkedHashMap<>();
            if (root.has("identity") && root.get("identity").isObject()) {
                Iterator<Map.Entry<String, JsonNode>> fields = root.get("identity").fields();
                while (fields.hasNext()) {
                    var f = fields.next();
                    beforeMap.put(f.getKey(), extractValue(f.getValue()));
                }
            }

            return PostgresWalRecord.builder()
                    .sourceFile(sourceFileName)
                    .fileOffset(currentOffset)
                    .recordLength(line.length())
                    .lsn(lsn)
                    .lsnFormatted(lsnStr)
                    .transactionId(xid)
                    .operationType(opType)
                    .schemaName(schema)
                    .tableName(table)
                    .filtered(isFiltered)
                    .afterColumns(afterMap)
                    .beforeColumns(beforeMap)
                    .timestamp(Instant.now())
                    .build();

        } catch (Exception e) {
            log.warn("Failed to parse PostgreSQL JSON record at offset {}: {}", currentOffset, e.getMessage());
            return null;
        }
    }

    private CdcOperationType mapHeapOpCode(int rmid, int opCode) {
        if (rmid == PostgresWalConstants.RM_HEAP2_ID) {
            if ((opCode & 0xF0) == PostgresWalConstants.XLOG_HEAP2_MULTI_INSERT) {
                return CdcOperationType.INSERT;
            }
        }
        int masked = opCode & 0xF0;
        switch (masked) {
            case PostgresWalConstants.XLOG_HEAP_INSERT:
                return CdcOperationType.INSERT;
            case PostgresWalConstants.XLOG_HEAP_DELETE:
                return CdcOperationType.DELETE;
            case PostgresWalConstants.XLOG_HEAP_UPDATE:
                return CdcOperationType.UPDATE;
            case PostgresWalConstants.XLOG_HEAP_TRUNCATE:
                return CdcOperationType.TRUNCATE;
            default:
                return CdcOperationType.INSERT;
        }
    }

    private CdcOperationType mapJsonAction(String action) {
        if (action == null) return CdcOperationType.INSERT;
        switch (action.toUpperCase()) {
            case "I":
            case "INSERT":
                return CdcOperationType.INSERT;
            case "U":
            case "UPDATE":
                return CdcOperationType.UPDATE;
            case "D":
            case "DELETE":
                return CdcOperationType.DELETE;
            case "T":
            case "TRUNCATE":
                return CdcOperationType.TRUNCATE;
            case "C":
            case "COMMIT":
                return CdcOperationType.COMMIT;
            case "A":
            case "ABORT":
            case "ROLLBACK":
                return CdcOperationType.ROLLBACK;
            case "B":
            case "BEGIN":
                return CdcOperationType.BEGIN;
            default:
                return CdcOperationType.INSERT;
        }
    }

    private void parseBinaryPayload(ByteBuffer buf, PostgresWalRecord.PostgresWalRecordBuilder builder, CdcTableFilter filter) {
        if (buf.remaining() < 2) return;

        try {
            short schemaLen = buf.getShort();
            if (schemaLen > 0 && buf.remaining() >= schemaLen) {
                byte[] sBytes = new byte[schemaLen];
                buf.get(sBytes);
                builder.schemaName(new String(sBytes, StandardCharsets.UTF_8));
            }

            if (buf.remaining() < 2) return;
            short tableLen = buf.getShort();
            if (tableLen > 0 && buf.remaining() >= tableLen) {
                byte[] tBytes = new byte[tableLen];
                buf.get(tBytes);
                String tableName = new String(tBytes, StandardCharsets.UTF_8);
                builder.tableName(tableName);

                if (filter != null && !filter.matches(tableName)) {
                    builder.filtered(true);
                    return;
                }
            }

            // Columns count
            if (buf.remaining() < 2) return;
            short colCount = buf.getShort();
            Map<String, Object> afterCols = new LinkedHashMap<>();
            for (int i = 0; i < colCount && buf.remaining() >= 4; i++) {
                short kLen = buf.getShort();
                byte[] kBytes = new byte[kLen];
                buf.get(kBytes);
                String colName = new String(kBytes, StandardCharsets.UTF_8);

                short vLen = buf.getShort();
                byte[] vBytes = new byte[vLen];
                buf.get(vBytes);
                String valStr = new String(vBytes, StandardCharsets.UTF_8);
                afterCols.put(colName, valStr);
            }
            builder.afterColumns(afterCols);

        } catch (Exception ignored) {}
    }

    private Object extractValue(JsonNode node) {
        if (node == null || node.isNull()) return null;
        if (node.isNumber()) return node.numberValue();
        if (node.isBoolean()) return node.booleanValue();
        return node.asText();
    }
}
