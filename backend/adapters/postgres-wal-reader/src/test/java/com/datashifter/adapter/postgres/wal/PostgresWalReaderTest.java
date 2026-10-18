package com.datashifter.adapter.postgres.wal;

import com.datashifter.adapter.sdk.AdapterConfig;
import com.datashifter.adapter.sdk.DataRecord;
import com.datashifter.adapter.sdk.RecordOperation;
import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.adapter.sdk.annotations.DataShifterAdapter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class PostgresWalReaderTest {

    @TempDir
    Path tempDir;

    private PostgresWalFixtureGenerator fixtureGenerator;
    private PostgresWalReader reader;

    @BeforeEach
    void setUp() {
        fixtureGenerator = new PostgresWalFixtureGenerator();
        reader = new PostgresWalReader();
    }

    @AfterEach
    void tearDown() throws Exception {
        if (reader != null) {
            reader.close();
        }
    }

    @Test
    void testAdapterAnnotationMetadata() {
        DataShifterAdapter annotation = PostgresWalReader.class.getAnnotation(DataShifterAdapter.class);
        assertNotNull(annotation);
        assertEquals("postgres-wal-reader", annotation.id());
        assertEquals("PostgreSQL WAL CDC Reader", annotation.name());
        assertEquals(AdapterType.READER, annotation.type());
        assertEquals(AdapterMode.CDC, annotation.mode());
        assertEquals("cdc", annotation.category());
    }

    @Test
    void testReadBinaryWalRecords() throws Exception {
        String fileName = "000000010000000000000001";
        File walFile = tempDir.resolve(fileName).toFile();
        long baseLsn = PostgresWalConstants.walFileNameToLsn(fileName);

        var records = List.of(
                PostgresWalFixtureGenerator.TestRecord.insert("public", "orders", Map.of("id", "501", "total", "100.0")),
                PostgresWalFixtureGenerator.TestRecord.update("public", "orders", Map.of("id", "501", "total", "100.0"), Map.of("id", "501", "total", "150.0")),
                PostgresWalFixtureGenerator.TestRecord.delete("public", "orders", Map.of("id", "501"))
        );

        var transactions = List.of(
                new PostgresWalFixtureGenerator.TestTransaction(5001, baseLsn + 1024, records)
        );

        fixtureGenerator.generateBinaryWalFile(walFile, 1, baseLsn, transactions);

        AdapterConfig config = AdapterConfig.builder()
                .property("walDirectory", tempDir.toAbsolutePath().toString())
                .property("filePattern", "^[0-9A-Fa-f]{24}$")
                .build();

        reader.init(config);

        List<DataRecord> events = reader.poll(10, Duration.ofMillis(500));
        assertEquals(3, events.size());

        DataRecord insertEvent = events.get(0);
        assertEquals(RecordOperation.INSERT, insertEvent.getOperation());
        assertEquals("orders", insertEvent.getHeader("tableName"));
        assertEquals("public", insertEvent.getHeader("schemaName"));
        assertEquals("501", insertEvent.getData().get("id"));

        DataRecord updateEvent = events.get(1);
        assertEquals(RecordOperation.UPDATE, updateEvent.getOperation());
        assertEquals("150.0", updateEvent.getData().get("total"));

        DataRecord deleteEvent = events.get(2);
        assertEquals(RecordOperation.DELETE, deleteEvent.getOperation());

        Map<String, Object> pos = reader.getCurrentPosition();
        assertEquals(fileName, pos.get("sourceFile"));
        assertNotNull(pos.get("lsnFormatted"));
    }

    @Test
    void testAbortedTransactionDiscarded() throws Exception {
        String fileName = "000000010000000000000002";
        File walFile = tempDir.resolve(fileName).toFile();
        long baseLsn = PostgresWalConstants.walFileNameToLsn(fileName);

        var records = List.of(
                PostgresWalFixtureGenerator.TestRecord.insert("public", "orders", Map.of("id", "999"))
        );

        var transactions = List.of(
                new PostgresWalFixtureGenerator.TestTransaction(5002, baseLsn + 2048, true, records)
        );

        fixtureGenerator.generateBinaryWalFile(walFile, 1, baseLsn, transactions);

        AdapterConfig config = AdapterConfig.builder()
                .property("walDirectory", tempDir.toAbsolutePath().toString())
                .property("filePattern", "^[0-9A-Fa-f]{24}$")
                .build();

        reader.init(config);

        List<DataRecord> events = reader.poll(10, Duration.ofMillis(300));
        assertTrue(events.isEmpty());
    }

    @Test
    void testReadJsonWalRecords() throws Exception {
        String fileName = "000000010000000000000003.json";
        File walFile = tempDir.resolve(fileName).toFile();

        var records = List.of(
                PostgresWalFixtureGenerator.TestRecord.insert("public", "customers", Map.of("id", "10", "name", "Charlie")),
                PostgresWalFixtureGenerator.TestRecord.update("public", "customers", Map.of("id", "10", "name", "Charlie"), Map.of("id", "10", "name", "Charles"))
        );

        var transactions = List.of(
                new PostgresWalFixtureGenerator.TestTransaction(7001, 1000000L, records)
        );

        fixtureGenerator.generateJsonWalFile(walFile, transactions);

        AdapterConfig config = AdapterConfig.builder()
                .property("walDirectory", tempDir.toAbsolutePath().toString())
                .property("filePattern", ".*")
                .build();

        reader.init(config);

        List<DataRecord> events = reader.poll(10, Duration.ofMillis(500));
        assertEquals(2, events.size());

        DataRecord insertEvent = events.get(0);
        assertEquals(RecordOperation.INSERT, insertEvent.getOperation());
        assertEquals("customers", insertEvent.getHeader("tableName"));
        assertEquals("Charlie", insertEvent.getData().get("name"));

        DataRecord updateEvent = events.get(1);
        assertEquals(RecordOperation.UPDATE, updateEvent.getOperation());
        assertEquals("Charles", updateEvent.getData().get("name"));
        assertEquals("Charlie", updateEvent.getBeforeData().get("name"));
    }
}
