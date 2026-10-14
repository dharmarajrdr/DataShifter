package com.datashifter.adapter.filesystem.writer;

import com.datashifter.adapter.sdk.AdapterConfig;
import com.datashifter.adapter.sdk.DataRecord;
import com.datashifter.adapter.sdk.RecordOperation;
import com.datashifter.adapter.sdk.WriteMode;
import com.datashifter.adapter.sdk.WriteResult;
import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.adapter.sdk.annotations.DataShifterAdapter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class FileSystemWriterTest {

    @TempDir
    Path tempDir;

    private FileSystemWriter writer;

    @BeforeEach
    void setUp() {
        writer = new FileSystemWriter();
    }

    @AfterEach
    void tearDown() throws Exception {
        if (writer != null) {
            writer.close();
        }
    }

    @Test
    void testAdapterAnnotationMetadata() {
        DataShifterAdapter annotation = FileSystemWriter.class.getAnnotation(DataShifterAdapter.class);
        assertNotNull(annotation);
        assertEquals("filesystem-writer", annotation.id());
        assertEquals("File System Writer", annotation.name());
        assertEquals(AdapterType.WRITER, annotation.type());
        assertEquals(AdapterMode.BOTH, annotation.mode());
        assertEquals("storage", annotation.category());
    }

    @Test
    void testWriteBatchJsonl() throws Exception {
        AdapterConfig config = AdapterConfig.builder()
                .property("outputDirectory", tempDir.toAbsolutePath().toString())
                .property("fileFormat", "jsonl")
                .property("fileNamePrefix", "export_")
                .build();

        writer.init(config);

        List<DataRecord> records = List.of(
                DataRecord.of(Map.of("id", 1, "name", "Alpha")),
                DataRecord.of(Map.of("id", 2, "name", "Beta"))
        );

        WriteResult result = writer.writeBatch(config, "users", records, WriteMode.INSERT_ONLY, "id");
        assertEquals(2, result.getTotalRecords());
        assertEquals(2, result.getSuccessCount());
        assertEquals(0, result.getFailureCount());

        Path exportedFile = tempDir.resolve("export_users.jsonl");
        assertTrue(Files.exists(exportedFile));

        List<String> lines = Files.readAllLines(exportedFile);
        assertEquals(2, lines.size());
        assertTrue(lines.get(0).contains("\"name\":\"Alpha\""));
        assertTrue(lines.get(1).contains("\"name\":\"Beta\""));
    }

    @Test
    void testWriteBatchCsv() throws Exception {
        AdapterConfig config = AdapterConfig.builder()
                .property("outputDirectory", tempDir.toAbsolutePath().toString())
                .property("fileFormat", "csv")
                .property("fileNamePrefix", "")
                .build();

        writer.init(config);

        List<DataRecord> records = List.of(
                DataRecord.of(Map.of("id", 10, "city", "Mumbai, India", "code", "BOM")),
                DataRecord.of(Map.of("id", 20, "city", "London", "code", "LHR"))
        );

        WriteResult result = writer.writeBatch(config, "airports", records, WriteMode.INSERT_ONLY, "id");
        assertEquals(2, result.getSuccessCount());

        Path exportedFile = tempDir.resolve("airports.csv");
        assertTrue(Files.exists(exportedFile));

        List<String> lines = Files.readAllLines(exportedFile);
        assertEquals(3, lines.size()); // header + 2 rows
        assertTrue(lines.get(0).contains("city"));
        assertTrue(lines.get(1).contains("\"Mumbai, India\"")); // properly quoted
    }

    @Test
    void testApplyBatchCdc() throws Exception {
        AdapterConfig config = AdapterConfig.builder()
                .property("outputDirectory", tempDir.toAbsolutePath().toString())
                .property("fileFormat", "jsonl")
                .property("fileNamePrefix", "cdc_")
                .build();

        writer.init(config);

        List<DataRecord> records = List.of(
                DataRecord.builder()
                        .operation(RecordOperation.INSERT)
                        .data(Map.of("id", 100, "status", "ACTIVE"))
                        .build(),
                DataRecord.builder()
                        .operation(RecordOperation.DELETE)
                        .data(Map.of("id", 100))
                        .build()
        );

        WriteResult result = writer.applyBatch(config, "orders", records, "id");
        assertEquals(2, result.getSuccessCount());

        Path exportedFile = tempDir.resolve("cdc_orders.jsonl");
        assertTrue(Files.exists(exportedFile));

        List<String> lines = Files.readAllLines(exportedFile);
        assertEquals(2, lines.size());
        assertTrue(lines.get(0).contains("\"_op\":\"INSERT\""));
        assertTrue(lines.get(1).contains("\"_op\":\"DELETE\""));
    }

    @Test
    void testPartitionByTable() throws Exception {
        AdapterConfig config = AdapterConfig.builder()
                .property("outputDirectory", tempDir.toAbsolutePath().toString())
                .property("partitionBy", "table")
                .property("fileFormat", "json")
                .build();

        writer.init(config);

        List<DataRecord> records = List.of(
                DataRecord.of(Map.of("key", "val"))
        );

        writer.writeBatch(config, "audit_log", records, WriteMode.INSERT_ONLY, null);

        Path tableFolder = tempDir.resolve("audit_log");
        assertTrue(Files.isDirectory(tableFolder));
        assertTrue(Files.exists(tableFolder.resolve("data_audit_log.json")));
    }
}
