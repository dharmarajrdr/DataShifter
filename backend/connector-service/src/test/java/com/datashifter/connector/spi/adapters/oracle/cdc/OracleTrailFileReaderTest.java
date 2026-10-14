package com.datashifter.connector.spi.adapters.oracle.cdc;

import com.datashifter.common.cdc.*;
import com.datashifter.common.enums.CdcOperationType;
import com.datashifter.common.enums.DatabaseType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class OracleTrailFileReaderTest {

    @TempDir
    Path tempDir;

    private OracleTrailFixtureGenerator fixtureGenerator;
    private OracleTrailFileReader reader;

    @BeforeEach
    void setUp() {
        fixtureGenerator = new OracleTrailFixtureGenerator();
        reader = new OracleTrailFileReader();
    }

    @AfterEach
    void tearDown() throws Exception {
        if (reader != null) {
            reader.close();
        }
    }

    @Test
    void testReadBinaryTrailFile() throws Exception {
        File trailFile = tempDir.resolve("aa000001").toFile();

        var records = List.of(
                new OracleTrailFixtureGenerator.TestRecord(
                        OracleTrailConstants.OP_INSERT, "SHIFTER", "CUSTOMERS",
                        Map.of("ID", 101, "NAME", "Alice", "CITY", "Boston"), Map.of()
                ),
                new OracleTrailFixtureGenerator.TestRecord(
                        OracleTrailConstants.OP_UPDATE, "SHIFTER", "CUSTOMERS",
                        Map.of("ID", 101, "CITY", "New York"), Map.of("ID", 101, "CITY", "Boston")
                ),
                new OracleTrailFixtureGenerator.TestRecord(
                        OracleTrailConstants.OP_DELETE, "SHIFTER", "CUSTOMERS",
                        Map.of(), Map.of("ID", 101)
                )
        );

        var transactions = List.of(
                new OracleTrailFixtureGenerator.TestTransaction("TX-001", 50010L, records)
        );

        fixtureGenerator.generateBinaryTrailFile(trailFile, 1, transactions);

        CdcReaderConfig config = CdcReaderConfig.builder()
                .pipelineId("pipe-test-1")
                .databaseType(DatabaseType.ORACLE)
                .directoryPath(tempDir.toString())
                .filePattern("aa*")
                .batchSize(100)
                .build();

        reader.open(config);
        List<CdcEvent> events = reader.poll(10, Duration.ofMillis(500));

        assertEquals(3, events.size(), "Should have read 3 DML events from the committed transaction");

        // Event 1: INSERT
        CdcEvent insertEvent = events.get(0);
        assertEquals(CdcOperationType.INSERT, insertEvent.getOperationType());
        assertEquals("SHIFTER", insertEvent.getSchemaName());
        assertEquals("CUSTOMERS", insertEvent.getTableName());
        assertEquals("TX-001", insertEvent.getTransactionId());
        assertEquals(50010L, insertEvent.getPosition().getScn());
        assertEquals("Alice", insertEvent.getAfterData().get("NAME"));

        // Event 2: UPDATE
        CdcEvent updateEvent = events.get(1);
        assertEquals(CdcOperationType.UPDATE, updateEvent.getOperationType());
        assertEquals("New York", updateEvent.getAfterData().get("CITY"));
        assertEquals("Boston", updateEvent.getBeforeData().get("CITY"));

        // Event 3: DELETE
        CdcEvent deleteEvent = events.get(2);
        assertEquals(CdcOperationType.DELETE, deleteEvent.getOperationType());
        assertEquals(50010L, deleteEvent.getPosition().getScn());
    }

    @Test
    void testReadJsonTrailFile() throws Exception {
        File jsonTrail = tempDir.resolve("aa000001.json").toFile();

        var records = List.of(
                new OracleTrailFixtureGenerator.TestRecord(
                        OracleTrailConstants.OP_INSERT, "HR", "EMPLOYEES",
                        Map.of("ID", 500, "FIRST_NAME", "Bob"), Map.of()
                )
        );

        var transactions = List.of(
                new OracleTrailFixtureGenerator.TestTransaction("TX-JSON-1", 75000L, records)
        );

        fixtureGenerator.generateJsonTrailFile(jsonTrail, transactions);

        CdcReaderConfig config = CdcReaderConfig.builder()
                .pipelineId("pipe-json")
                .databaseType(DatabaseType.ORACLE)
                .directoryPath(tempDir.toString())
                .filePattern("*.json")
                .batchSize(50)
                .build();

        reader.open(config);
        List<CdcEvent> events = reader.poll(10, Duration.ofMillis(500));

        assertEquals(1, events.size());
        CdcEvent event = events.get(0);
        assertEquals("EMPLOYEES", event.getTableName());
        assertEquals("Bob", event.getAfterData().get("FIRST_NAME"));
        assertEquals(75000L, event.getPosition().getScn());
    }

    @Test
    void testTrailFileRollover() throws Exception {
        // File 1: aa000001
        File file1 = tempDir.resolve("aa000001").toFile();
        var tx1 = List.of(new OracleTrailFixtureGenerator.TestTransaction(
                "TX-1", 1000L,
                List.of(new OracleTrailFixtureGenerator.TestRecord(
                        OracleTrailConstants.OP_INSERT, "APP", "ITEMS", Map.of("ID", 1), Map.of()))
        ));
        fixtureGenerator.generateBinaryTrailFile(file1, 1, tx1);

        // File 2: aa000002
        File file2 = tempDir.resolve("aa000002").toFile();
        var tx2 = List.of(new OracleTrailFixtureGenerator.TestTransaction(
                "TX-2", 2000L,
                List.of(new OracleTrailFixtureGenerator.TestRecord(
                        OracleTrailConstants.OP_INSERT, "APP", "ITEMS", Map.of("ID", 2), Map.of()))
        ));
        fixtureGenerator.generateBinaryTrailFile(file2, 2, tx2);

        CdcReaderConfig config = CdcReaderConfig.builder()
                .pipelineId("pipe-rollover")
                .databaseType(DatabaseType.ORACLE)
                .directoryPath(tempDir.toString())
                .filePattern("aa*")
                .batchSize(100)
                .build();

        reader.open(config);

        // Read all events across the 2 files
        List<CdcEvent> events = reader.poll(10, Duration.ofMillis(500));

        assertEquals(2, events.size(), "Should have read events across both trail files upon rollover");
        assertEquals(1000L, events.get(0).getPosition().getScn());
        assertEquals(2000L, events.get(1).getPosition().getScn());
        assertEquals("aa000002", events.get(1).getPosition().getSourceFile());
    }

    @Test
    void testStartingPositionOffsetSeek() throws Exception {
        File trailFile = tempDir.resolve("aa000001").toFile();

        var records = List.of(
                new OracleTrailFixtureGenerator.TestRecord(
                        OracleTrailConstants.OP_INSERT, "SHIFTER", "USERS", Map.of("ID", 1), Map.of()
                ),
                new OracleTrailFixtureGenerator.TestRecord(
                        OracleTrailConstants.OP_INSERT, "SHIFTER", "USERS", Map.of("ID", 2), Map.of()
                )
        );

        var tx = List.of(new OracleTrailFixtureGenerator.TestTransaction("TX-OFFSET", 3000L, records));
        fixtureGenerator.generateBinaryTrailFile(trailFile, 1, tx);

        // Read first event and commit checkpoint
        CdcReaderConfig config = CdcReaderConfig.builder()
                .pipelineId("pipe-seek")
                .databaseType(DatabaseType.ORACLE)
                .directoryPath(tempDir.toString())
                .filePattern("aa*")
                .batchSize(100)
                .build();

        reader.open(config);
        List<CdcEvent> firstPoll = reader.poll(10, Duration.ofMillis(500));
        assertEquals(2, firstPoll.size());
        CdcPosition lastPos = reader.getCurrentPosition();
        reader.close();

        // Re-open with checkpoint position
        OracleTrailFileReader resumeReader = new OracleTrailFileReader();
        CdcReaderConfig resumeConfig = CdcReaderConfig.builder()
                .pipelineId("pipe-seek")
                .databaseType(DatabaseType.ORACLE)
                .directoryPath(tempDir.toString())
                .filePattern("aa*")
                .startingPosition(lastPos)
                .batchSize(100)
                .build();

        resumeReader.open(resumeConfig);
        List<CdcEvent> secondPoll = resumeReader.poll(10, Duration.ofMillis(200));

        // Reached end of file, should have 0 new events
        assertEquals(0, secondPoll.size());
        resumeReader.close();
    }

    @Test
    void testReaderTableSegregationAndOperationFilter() throws Exception {
        File trailFile = tempDir.resolve("aa000001").toFile();

        var records = List.of(
                // 1. Matched table, matched op
                new OracleTrailFixtureGenerator.TestRecord(
                        OracleTrailConstants.OP_INSERT, "HR", "EMPLOYEES", Map.of("ID", 101, "NAME", "Alice"), Map.of()
                ),
                // 2. Unmatched table (DEPARTMENTS)
                new OracleTrailFixtureGenerator.TestRecord(
                        OracleTrailConstants.OP_INSERT, "HR", "DEPARTMENTS", Map.of("ID", 10, "NAME", "Engineering"), Map.of()
                ),
                // 3. Matched table, unmatched op (DELETE)
                new OracleTrailFixtureGenerator.TestRecord(
                        OracleTrailConstants.OP_DELETE, "HR", "EMPLOYEES", Map.of(), Map.of("ID", 102)
                )
        );

        var tx = List.of(new OracleTrailFixtureGenerator.TestTransaction("TX-FILTER", 99000L, records));
        fixtureGenerator.generateBinaryTrailFile(trailFile, 1, tx);

        CdcReaderConfig config = CdcReaderConfig.builder()
                .pipelineId("pipe-filter")
                .databaseType(DatabaseType.ORACLE)
                .directoryPath(tempDir.toString())
                .filePattern("aa*")
                .targetTableNames(Set.of("EMPLOYEES"))
                .allowedOperations(Set.of(CdcOperationType.INSERT))
                .batchSize(100)
                .build();

        reader.open(config);
        List<CdcEvent> events = reader.poll(10, Duration.ofMillis(500));

        // Only the INSERT on EMPLOYEES should be emitted!
        assertEquals(1, events.size());
        CdcEvent event = events.get(0);
        assertEquals("EMPLOYEES", event.getTableName());
        assertEquals(CdcOperationType.INSERT, event.getOperationType());
        assertEquals("Alice", event.getAfterData().get("NAME"));
    }
}
