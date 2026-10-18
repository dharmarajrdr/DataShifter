package com.datashifter.adapter.oracle.gg;

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

class OracleGgReaderTest {

    @TempDir
    Path tempDir;

    private OracleTrailFixtureGenerator fixtureGenerator;
    private OracleGgReader reader;

    @BeforeEach
    void setUp() {
        fixtureGenerator = new OracleTrailFixtureGenerator();
        reader = new OracleGgReader();
    }

    @AfterEach
    void tearDown() throws Exception {
        if (reader != null) {
            reader.close();
        }
    }

    @Test
    void testAdapterAnnotationMetadata() {
        DataShifterAdapter annotation = OracleGgReader.class.getAnnotation(DataShifterAdapter.class);
        assertNotNull(annotation);
        assertEquals("oracle-gg-reader", annotation.id());
        assertEquals("Oracle GoldenGate CDC Reader", annotation.name());
        assertEquals(AdapterType.READER, annotation.type());
        assertEquals(AdapterMode.CDC, annotation.mode());
        assertEquals("cdc", annotation.category());
    }

    @Test
    void testReadBinaryTrailRecords() throws Exception {
        File trailFile = tempDir.resolve("aa000001").toFile();

        var records = List.of(
                new OracleTrailFixtureGenerator.TestRecord(
                        OracleTrailConstants.OP_INSERT, "SALES", "ORDERS",
                        Map.of("ID", "101", "AMOUNT", "250.50"), Map.of()
                ),
                new OracleTrailFixtureGenerator.TestRecord(
                        OracleTrailConstants.OP_UPDATE, "SALES", "ORDERS",
                        Map.of("ID", "101", "AMOUNT", "300.00"), Map.of("ID", "101", "AMOUNT", "250.50")
                ),
                new OracleTrailFixtureGenerator.TestRecord(
                        OracleTrailConstants.OP_DELETE, "SALES", "ORDERS",
                        Map.of(), Map.of("ID", "101")
                )
        );

        var transactions = List.of(
                new OracleTrailFixtureGenerator.TestTransaction("TX-001", 12345678L, records)
        );

        fixtureGenerator.generateBinaryTrailFile(trailFile, 1, transactions);

        AdapterConfig config = AdapterConfig.builder()
                .property("trailDirectory", tempDir.toAbsolutePath().toString())
                .property("filePattern", "aa*")
                .build();

        reader.init(config);

        List<DataRecord> events = reader.poll(10, Duration.ofMillis(500));
        assertEquals(3, events.size());

        DataRecord insertEvent = events.get(0);
        assertEquals(RecordOperation.INSERT, insertEvent.getOperation());
        assertEquals("ORDERS", insertEvent.getHeader("tableName"));
        assertEquals("SALES", insertEvent.getHeader("schemaName"));
        assertEquals(12345678L, insertEvent.getHeader("scn"));
        assertEquals("101", insertEvent.getData().get("ID"));

        DataRecord updateEvent = events.get(1);
        assertEquals(RecordOperation.UPDATE, updateEvent.getOperation());
        assertEquals("300.00", updateEvent.getData().get("AMOUNT"));
        assertEquals("250.50", updateEvent.getBeforeData().get("AMOUNT"));

        DataRecord deleteEvent = events.get(2);
        assertEquals(RecordOperation.DELETE, deleteEvent.getOperation());

        Map<String, Object> pos = reader.getCurrentPosition();
        assertEquals("aa000001", pos.get("sourceFile"));
        assertEquals(12345678L, pos.get("scn"));
    }

    @Test
    void testReadJsonTrailRecords() throws Exception {
        File trailFile = tempDir.resolve("aa000002").toFile();

        var records = List.of(
                new OracleTrailFixtureGenerator.TestRecord(
                        OracleTrailConstants.OP_INSERT, "HR", "EMPLOYEES",
                        Map.of("ID", "201", "NAME", "Bob"), Map.of()
                )
        );

        var transactions = List.of(
                new OracleTrailFixtureGenerator.TestTransaction("TX-002", 999999L, records)
        );

        fixtureGenerator.generateJsonTrailFile(trailFile, transactions);

        AdapterConfig config = AdapterConfig.builder()
                .property("trailDirectory", tempDir.toAbsolutePath().toString())
                .property("filePattern", "aa*")
                .build();

        reader.init(config);

        List<DataRecord> events = reader.poll(10, Duration.ofMillis(500));
        assertEquals(1, events.size());

        DataRecord event = events.get(0);
        assertEquals(RecordOperation.INSERT, event.getOperation());
        assertEquals("EMPLOYEES", event.getHeader("tableName"));
        assertEquals(999999L, event.getHeader("scn"));
    }
}
