package com.datashifter.connector.spi.adapters.postgres.cdc;

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

class PostgresWalFileReaderTest {

    @TempDir
    Path tempDir;

    private PostgresWalFixtureGenerator fixtureGenerator;
    private PostgresWalFileReader reader;

    @BeforeEach
    void setUp() {
        fixtureGenerator = new PostgresWalFixtureGenerator();
        reader = new PostgresWalFileReader();
    }

    @AfterEach
    void tearDown() throws Exception {
        if (reader != null) {
            reader.close();
        }
    }

    @Test
    void testLsnCalculationsAndFormatting() {
        long lsn = PostgresWalConstants.parseLsn("0/3D7E5D8");
        assertEquals(64480728L, lsn);
        assertEquals("0/3D7E5D8", PostgresWalConstants.formatLsn(lsn));

        String walFileName = PostgresWalConstants.lsnToWalFileName(lsn, 1);
        assertEquals("000000010000000000000003", walFileName);

        long recoveredLsn = PostgresWalConstants.walFileNameToLsn(walFileName);
        assertEquals(3L * PostgresWalConstants.WAL_SEGMENT_SIZE, recoveredLsn);
        assertEquals(1, PostgresWalConstants.walFileNameToTimeline(walFileName));
    }

    @Test
    void testReadBinaryWalFile() throws Exception {
        String fileName = "000000010000000000000001";
        File walFile = tempDir.resolve(fileName).toFile();

        var records = List.of(
                PostgresWalFixtureGenerator.TestRecord.insert("public", "users", Map.of("id", "1", "name", "John")),
                PostgresWalFixtureGenerator.TestRecord.update("public", "users", Map.of("id", "1"), Map.of("id", "1", "name", "John Doe")),
                PostgresWalFixtureGenerator.TestRecord.delete("public", "users", Map.of("id", "1"))
        );

        long baseLsn = PostgresWalConstants.walFileNameToLsn(fileName);
        var tx = new PostgresWalFixtureGenerator.TestTransaction(501, baseLsn + 200, records);
        fixtureGenerator.generateBinaryWalFile(walFile, 1, baseLsn, List.of(tx));

        CdcReaderConfig config = CdcReaderConfig.builder()
                .pipelineId("pipe-pg-1")
                .databaseType(DatabaseType.POSTGRESQL)
                .directoryPath(tempDir.toString())
                .filePattern("00000001.*")
                .batchSize(100)
                .build();

        reader.open(config);
        assertEquals(DatabaseType.POSTGRESQL, reader.getSupportedType());

        List<CdcEvent> events = reader.poll(10, Duration.ofMillis(500));
        assertEquals(3, events.size());

        CdcEvent insertEvent = events.get(0);
        assertEquals(CdcOperationType.INSERT, insertEvent.getOperationType());
        assertEquals("PUBLIC.USERS", insertEvent.getFullTableName());
        assertEquals("John", insertEvent.getAfterData().get("name"));

        CdcEvent updateEvent = events.get(1);
        assertEquals(CdcOperationType.UPDATE, updateEvent.getOperationType());
        assertEquals("John Doe", updateEvent.getAfterData().get("name"));

        CdcEvent deleteEvent = events.get(2);
        assertEquals(CdcOperationType.DELETE, deleteEvent.getOperationType());

        CdcPosition pos = reader.getCurrentPosition();
        assertNotNull(pos);
        assertEquals(fileName, pos.getSourceFile());
        assertTrue(pos.getLsn() > 0);
    }

    @Test
    void testReadJsonWalStream() throws Exception {
        File jsonFile = tempDir.resolve("wal_stream.json").toFile();

        var records = List.of(
                PostgresWalFixtureGenerator.TestRecord.insert("public", "orders", Map.of("order_id", 99, "amount", 450.0)),
                PostgresWalFixtureGenerator.TestRecord.update("public", "orders", Map.of("order_id", 99), Map.of("order_id", 99, "amount", 500.0))
        );

        long lsn = PostgresWalConstants.parseLsn("0/16B3748");
        var tx = new PostgresWalFixtureGenerator.TestTransaction(1002, lsn, records);
        fixtureGenerator.generateJsonWalFile(jsonFile, List.of(tx));

        CdcReaderConfig config = CdcReaderConfig.builder()
                .pipelineId("pipe-pg-json")
                .databaseType(DatabaseType.POSTGRESQL)
                .directoryPath(tempDir.toString())
                .filePattern(".*\\.json")
                .build();

        reader.open(config);
        List<CdcEvent> events = reader.poll(10, Duration.ofMillis(500));
        assertEquals(2, events.size());
        assertEquals(CdcOperationType.INSERT, events.get(0).getOperationType());
        assertEquals(CdcOperationType.UPDATE, events.get(1).getOperationType());
        assertEquals("PUBLIC.ORDERS", events.get(0).getFullTableName());
    }

    @Test
    void testAbortedTransactionIsDiscarded() throws Exception {
        String fileName = "000000010000000000000002";
        File walFile = tempDir.resolve(fileName).toFile();

        var abortedRecords = List.of(
                PostgresWalFixtureGenerator.TestRecord.insert("public", "accounts", Map.of("id", "999", "balance", 0))
        );
        var committedRecords = List.of(
                PostgresWalFixtureGenerator.TestRecord.insert("public", "accounts", Map.of("id", "100", "balance", 5000))
        );

        long baseLsn = PostgresWalConstants.walFileNameToLsn(fileName);
        var abortedTx = new PostgresWalFixtureGenerator.TestTransaction(701, baseLsn + 100, true, abortedRecords);
        var committedTx = new PostgresWalFixtureGenerator.TestTransaction(702, baseLsn + 300, false, committedRecords);

        fixtureGenerator.generateBinaryWalFile(walFile, 1, baseLsn, List.of(abortedTx, committedTx));

        CdcReaderConfig config = CdcReaderConfig.builder()
                .pipelineId("pipe-pg-abort")
                .databaseType(DatabaseType.POSTGRESQL)
                .directoryPath(tempDir.toString())
                .filePattern("00000001.*")
                .build();

        reader.open(config);
        List<CdcEvent> events = reader.poll(10, Duration.ofMillis(500));

        // Aborted transaction 701 must NOT be emitted; only committed transaction 702
        assertEquals(1, events.size());
        assertEquals("100", events.get(0).getAfterData().get("id"));
    }

    @Test
    void testTableFiltering() throws Exception {
        String fileName = "000000010000000000000005";
        File walFile = tempDir.resolve(fileName).toFile();

        var records = List.of(
                PostgresWalFixtureGenerator.TestRecord.insert("public", "included_table", Map.of("id", 1)),
                PostgresWalFixtureGenerator.TestRecord.insert("public", "ignored_table", Map.of("id", 2))
        );

        long baseLsn = PostgresWalConstants.walFileNameToLsn(fileName);
        var tx = new PostgresWalFixtureGenerator.TestTransaction(801, baseLsn + 150, records);
        fixtureGenerator.generateBinaryWalFile(walFile, 1, baseLsn, List.of(tx));

        CdcReaderConfig config = CdcReaderConfig.builder()
                .pipelineId("pipe-pg-filter")
                .databaseType(DatabaseType.POSTGRESQL)
                .directoryPath(tempDir.toString())
                .filePattern("00000001.*")
                .targetTableNames(Set.of("included_table"))
                .build();

        reader.open(config);
        List<CdcEvent> events = reader.poll(10, Duration.ofMillis(500));

        assertEquals(1, events.size());
        assertEquals("PUBLIC.INCLUDED_TABLE", events.get(0).getFullTableName());
    }

    @Test
    void testMultiFileSegmentRotation() throws Exception {
        String file1Name = "000000010000000000000001";
        String file2Name = "000000010000000000000002";
        File file1 = tempDir.resolve(file1Name).toFile();
        File file2 = tempDir.resolve(file2Name).toFile();

        var tx1 = new PostgresWalFixtureGenerator.TestTransaction(901, 1000L, List.of(
                PostgresWalFixtureGenerator.TestRecord.insert("public", "logs", Map.of("msg", "first segment"))
        ));
        var tx2 = new PostgresWalFixtureGenerator.TestTransaction(902, 2000L, List.of(
                PostgresWalFixtureGenerator.TestRecord.insert("public", "logs", Map.of("msg", "second segment"))
        ));

        fixtureGenerator.generateBinaryWalFile(file1, 1, 0L, List.of(tx1));
        fixtureGenerator.generateBinaryWalFile(file2, 1, PostgresWalConstants.WAL_SEGMENT_SIZE, List.of(tx2));

        CdcReaderConfig config = CdcReaderConfig.builder()
                .pipelineId("pipe-pg-rotation")
                .databaseType(DatabaseType.POSTGRESQL)
                .directoryPath(tempDir.toString())
                .filePattern("00000001.*")
                .build();

        reader.open(config);

        List<CdcEvent> batch1 = reader.poll(1, Duration.ofMillis(300));
        assertEquals(1, batch1.size());
        assertEquals("first segment", batch1.get(0).getAfterData().get("msg"));

        List<CdcEvent> batch2 = reader.poll(1, Duration.ofMillis(300));
        assertEquals(1, batch2.size());
        assertEquals("second segment", batch2.get(0).getAfterData().get("msg"));
    }

    @Test
    void testResumeFromCheckpointLsn() throws Exception {
        String file1Name = "000000010000000000000001";
        String file2Name = "000000010000000000000002";
        File file1 = tempDir.resolve(file1Name).toFile();
        File file2 = tempDir.resolve(file2Name).toFile();

        long seg2Lsn = PostgresWalConstants.WAL_SEGMENT_SIZE;
        var tx1 = new PostgresWalFixtureGenerator.TestTransaction(101, 500L, List.of(
                PostgresWalFixtureGenerator.TestRecord.insert("public", "items", Map.of("id", 1))
        ));
        var tx2 = new PostgresWalFixtureGenerator.TestTransaction(102, seg2Lsn + 500L, List.of(
                PostgresWalFixtureGenerator.TestRecord.insert("public", "items", Map.of("id", 2))
        ));

        fixtureGenerator.generateBinaryWalFile(file1, 1, 0L, List.of(tx1));
        fixtureGenerator.generateBinaryWalFile(file2, 1, seg2Lsn, List.of(tx2));

        // Start directly at segment 2 LSN
        CdcPosition resumePos = CdcPosition.builder()
                .lsn(seg2Lsn + 100)
                .token(PostgresWalConstants.formatLsn(seg2Lsn + 100))
                .build();

        CdcReaderConfig config = CdcReaderConfig.builder()
                .pipelineId("pipe-pg-resume")
                .databaseType(DatabaseType.POSTGRESQL)
                .directoryPath(tempDir.toString())
                .filePattern("00000001.*")
                .startingPosition(resumePos)
                .build();

        reader.open(config);
        List<CdcEvent> events = reader.poll(10, Duration.ofMillis(500));
        assertEquals(1, events.size());
        assertEquals("2", String.valueOf(events.get(0).getAfterData().get("id")));
    }
}
