package com.datashifter.connector.spi.adapters.oracle.cdc;

import com.datashifter.common.enums.CdcOperationType;
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
 * Low-level binary and structured JSON parser for Oracle GoldenGate trail records.
 * Uses direct ByteBuffer and FileChannel for low-latency, zero-unnecessary-copy parsing.
 */
@Slf4j
public class OracleTrailParser {

    private final ObjectMapper objectMapper;

    public OracleTrailParser() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    /**
     * Inspects the trail file header to determine file format (binary vs JSON) and metadata.
     */
    public OracleTrailHeader readHeader(File file) throws IOException {
        try (RandomAccessFile raf = new RandomAccessFile(file, "r");
             FileChannel channel = raf.getChannel()) {

            if (channel.size() < 4) {
                return OracleTrailHeader.builder().binaryFormat(false).headerLength(0).build();
            }

            ByteBuffer buffer = ByteBuffer.allocate(16);
            channel.read(buffer);
            buffer.flip();

            short magic = buffer.getShort();
            if (magic == OracleTrailConstants.TRAIL_MAGIC_BINARY || magic == 0x0047) {
                // Binary GoldenGate trail file
                short seq = buffer.getShort();
                return OracleTrailHeader.builder()
                        .magic(magic)
                        .sequenceNumber(seq)
                        .createdAt(Instant.ofEpochMilli(file.lastModified()))
                        .binaryFormat(true)
                        .headerLength(16)
                        .build();
            }

            // Otherwise, structured / line-delimited JSON or text trail
            return OracleTrailHeader.builder()
                    .binaryFormat(false)
                    .headerLength(0)
                    .createdAt(Instant.ofEpochMilli(file.lastModified()))
                    .build();
        }
    }

    /**
     * Parses the next binary trail record starting at the current channel position.
     *
     * @param channel open FileChannel
     * @param sourceFileName name of the source file
     * @return parsed OracleTrailRecord, or null if end-of-file / partial record reached
     */
    public OracleTrailRecord parseNextBinaryRecord(FileChannel channel, String sourceFileName) throws IOException {
        long rba = channel.position();
        if (channel.size() - rba < 4) {
            return null; // Not enough bytes for record length header
        }

        ByteBuffer lengthBuffer = ByteBuffer.allocate(4);
        channel.read(lengthBuffer);
        lengthBuffer.flip();
        int recordLength = lengthBuffer.getInt();

        if (recordLength <= 0 || recordLength > 50 * 1024 * 1024) {
            log.warn("Invalid binary trail record length {} at RBA {} in {}. Repositioning.", recordLength, rba, sourceFileName);
            return null;
        }

        if (channel.size() - channel.position() < recordLength) {
            // Partial record (live file being written to by extract process) — rewind to RBA
            channel.position(rba);
            return null;
        }

        ByteBuffer payload = ByteBuffer.allocate(recordLength);
        channel.read(payload);
        payload.flip();

        int opCode = payload.getShort();
        long scn = payload.getLong();
        long timestampMillis = payload.getLong();
        Instant timestamp = Instant.ofEpochMilli(timestampMillis);

        String txId = readString(payload);
        String schemaName = readString(payload);
        String tableName = readString(payload);

        CdcOperationType opType = mapOpCodeToOperationType(opCode);

        // Read After-Image columns
        Map<String, Object> afterColumns = readColumnMap(payload);

        // Read Before-Image columns if present
        Map<String, Object> beforeColumns = readColumnMap(payload);

        // Extract primary key values (if indicated or default to ID/PK columns)
        Map<String, Object> pkValues = new LinkedHashMap<>();
        if (afterColumns.containsKey("ID")) pkValues.put("ID", afterColumns.get("ID"));
        if (afterColumns.containsKey("id")) pkValues.put("id", afterColumns.get("id"));

        return OracleTrailRecord.builder()
                .sourceFile(sourceFileName)
                .rba(rba)
                .recordLength(recordLength + 4)
                .scn(scn)
                .opCode(opCode)
                .operationType(opType)
                .schemaName(schemaName)
                .tableName(tableName)
                .transactionId(txId)
                .timestamp(timestamp)
                .primaryKeyValues(pkValues)
                .afterColumns(afterColumns)
                .beforeColumns(beforeColumns)
                .build();
    }

    /**
     * Parses the next structured JSON record starting at the current channel position.
     */
    public OracleTrailRecord parseNextJsonRecord(RandomAccessFile raf, String sourceFileName) throws IOException {
        long rba = raf.getFilePointer();
        String line = raf.readLine();
        if (line == null) {
            return null;
        }
        line = line.trim();
        if (line.isEmpty()) {
            return null;
        }

        try {
            JsonNode root = objectMapper.readTree(line);
            String fullTable = root.path("table").asText("");
            String schema = "";
            String table = fullTable;
            if (fullTable.contains(".")) {
                String[] parts = fullTable.split("\\.", 2);
                schema = parts[0];
                table = parts[1];
            }

            String opStr = root.path("op_type").asText("I").toUpperCase();
            CdcOperationType opType = mapCharToOperationType(opStr);
            int opCode = mapOpTypeToOpCode(opType);

            long scn = root.path("current_scn").asLong(0L);
            String txId = root.path("transaction_id").asText(null);

            Instant timestamp = Instant.now();
            if (root.has("timestamp")) {
                try {
                    timestamp = Instant.parse(root.get("timestamp").asText());
                } catch (Exception ignored) {}
            }

            Map<String, Object> afterColumns = extractJsonMap(root.path("after"));
            Map<String, Object> beforeColumns = extractJsonMap(root.path("before"));
            Map<String, Object> pkValues = new LinkedHashMap<>();

            if (root.has("primary_keys") && root.get("primary_keys").isArray()) {
                for (JsonNode pkNode : root.get("primary_keys")) {
                    String pkCol = pkNode.asText();
                    if (afterColumns.containsKey(pkCol)) {
                        pkValues.put(pkCol, afterColumns.get(pkCol));
                    } else if (beforeColumns.containsKey(pkCol)) {
                        pkValues.put(pkCol, beforeColumns.get(pkCol));
                    }
                }
            } else if (afterColumns.containsKey("ID")) {
                pkValues.put("ID", afterColumns.get("ID"));
            }

            return OracleTrailRecord.builder()
                    .sourceFile(sourceFileName)
                    .rba(rba)
                    .recordLength(line.getBytes(StandardCharsets.UTF_8).length)
                    .scn(scn)
                    .opCode(opCode)
                    .operationType(opType)
                    .schemaName(schema)
                    .tableName(table)
                    .transactionId(txId)
                    .timestamp(timestamp)
                    .primaryKeyValues(pkValues)
                    .afterColumns(afterColumns)
                    .beforeColumns(beforeColumns)
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse JSON trail record at RBA {} in {}: {}", rba, sourceFileName, e.getMessage());
            return null;
        }
    }

    private String readString(ByteBuffer buffer) {
        if (buffer.remaining() < 2) return "";
        short len = buffer.getShort();
        if (len <= 0 || buffer.remaining() < len) return "";
        byte[] bytes = new byte[len];
        buffer.get(bytes);
        return new String(bytes, StandardCharsets.UTF_8);
    }

    private Map<String, Object> readColumnMap(ByteBuffer buffer) {
        Map<String, Object> map = new LinkedHashMap<>();
        if (buffer.remaining() < 2) return map;
        short colCount = buffer.getShort();
        for (int i = 0; i < colCount && buffer.remaining() >= 3; i++) {
            String colName = readString(buffer);
            byte isNull = buffer.get();
            if (isNull == 1) {
                map.put(colName, null);
            } else {
                int valLen = buffer.getInt();
                if (valLen >= 0 && buffer.remaining() >= valLen) {
                    byte[] valBytes = new byte[valLen];
                    buffer.get(valBytes);
                    map.put(colName, new String(valBytes, StandardCharsets.UTF_8));
                }
            }
        }
        return map;
    }

    private Map<String, Object> extractJsonMap(JsonNode node) {
        Map<String, Object> map = new LinkedHashMap<>();
        if (node != null && node.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                JsonNode v = entry.getValue();
                if (v.isNull()) {
                    map.put(entry.getKey(), null);
                } else if (v.isNumber()) {
                    map.put(entry.getKey(), v.numberValue());
                } else if (v.isBoolean()) {
                    map.put(entry.getKey(), v.booleanValue());
                } else {
                    map.put(entry.getKey(), v.asText());
                }
            }
        }
        return map;
    }

    private CdcOperationType mapOpCodeToOperationType(int opCode) {
        return switch (opCode) {
            case OracleTrailConstants.OP_INSERT -> CdcOperationType.INSERT;
            case OracleTrailConstants.OP_UPDATE -> CdcOperationType.UPDATE;
            case OracleTrailConstants.OP_DELETE -> CdcOperationType.DELETE;
            case OracleTrailConstants.OP_COMMIT -> CdcOperationType.COMMIT;
            case OracleTrailConstants.OP_BEGIN  -> CdcOperationType.BEGIN;
            case OracleTrailConstants.OP_TRUNCATE -> CdcOperationType.TRUNCATE;
            default -> CdcOperationType.UPDATE;
        };
    }

    private int mapOpTypeToOpCode(CdcOperationType type) {
        if (type == null) return OracleTrailConstants.OP_UPDATE;
        return switch (type) {
            case INSERT -> OracleTrailConstants.OP_INSERT;
            case UPDATE -> OracleTrailConstants.OP_UPDATE;
            case DELETE -> OracleTrailConstants.OP_DELETE;
            case COMMIT -> OracleTrailConstants.OP_COMMIT;
            case BEGIN  -> OracleTrailConstants.OP_BEGIN;
            case TRUNCATE -> OracleTrailConstants.OP_TRUNCATE;
            default -> OracleTrailConstants.OP_UPDATE;
        };
    }

    private CdcOperationType mapCharToOperationType(String opStr) {
        if (opStr == null || opStr.isBlank()) return CdcOperationType.INSERT;
        return switch (opStr.charAt(0)) {
            case 'I', 'i' -> CdcOperationType.INSERT;
            case 'U', 'u' -> CdcOperationType.UPDATE;
            case 'D', 'd' -> CdcOperationType.DELETE;
            case 'C', 'c' -> CdcOperationType.COMMIT;
            case 'B', 'b' -> CdcOperationType.BEGIN;
            case 'T', 't' -> CdcOperationType.TRUNCATE;
            default -> CdcOperationType.INSERT;
        };
    }
}
