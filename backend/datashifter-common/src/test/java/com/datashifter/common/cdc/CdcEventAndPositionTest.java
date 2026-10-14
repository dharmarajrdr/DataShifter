package com.datashifter.common.cdc;

import com.datashifter.common.enums.CdcOperationType;
import com.datashifter.common.enums.DatabaseType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class CdcEventAndPositionTest {

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Test
    void testCdcPositionComparisonByScn() {
        CdcPosition pos1 = CdcPosition.builder().sourceFile("aa000001").fileOffset(100L).scn(10500L).build();
        CdcPosition pos2 = CdcPosition.builder().sourceFile("aa000001").fileOffset(200L).scn(10501L).build();
        CdcPosition pos3 = CdcPosition.builder().sourceFile("aa000001").fileOffset(100L).scn(10500L).build();

        assertTrue(pos1.compareTo(pos2) < 0, "pos1 with smaller SCN should be less than pos2");
        assertTrue(pos2.compareTo(pos1) > 0, "pos2 with larger SCN should be greater than pos1");
        assertEquals(0, pos1.compareTo(pos3), "Equal positions should return 0");
    }

    @Test
    void testCdcPositionComparisonByLsnAndOffset() {
        CdcPosition pos1 = CdcPosition.builder().lsn(2000L).fileOffset(50L).build();
        CdcPosition pos2 = CdcPosition.builder().lsn(3000L).fileOffset(10L).build();

        assertTrue(pos1.compareTo(pos2) < 0);

        // When LSN is same, compare by file offset
        CdcPosition pos3 = CdcPosition.builder().sourceFile("aa01").fileOffset(100L).build();
        CdcPosition pos4 = CdcPosition.builder().sourceFile("aa01").fileOffset(200L).build();
        assertTrue(pos3.compareTo(pos4) < 0);
    }

    @Test
    void testCdcEventCreationAndHelpers() {
        CdcEvent event = CdcEvent.builder()
                .eventId("evt-1")
                .pipelineId("pipe-100")
                .sourceDatabaseType(DatabaseType.ORACLE)
                .schemaName("SHIFTER")
                .tableName("CUSTOMERS")
                .operationType(CdcOperationType.UPDATE)
                .transactionId("XID-99")
                .commitTimestamp(Instant.now())
                .primaryKeyValues(Map.of("ID", 42))
                .beforeData(Map.of("ID", 42, "NAME", "Alice Old"))
                .afterData(Map.of("ID", 42, "NAME", "Alice New"))
                .position(CdcPosition.builder().sourceFile("aa000005").fileOffset(1024L).scn(50000L).build())
                .build();

        assertEquals("SHIFTER.CUSTOMERS", event.getFullTableName());
        assertEquals("SHIFTER.CUSTOMERS#{ID=42}", event.computePartitionKey());
        assertEquals(CdcOperationType.UPDATE, event.getOperationType());
        assertNotNull(event.getPosition());
        assertEquals(50000L, event.getPosition().getScn());
    }

    @Test
    void testCdcEventSerializationAndDeserialization() throws Exception {
        CdcEvent event = CdcEvent.builder()
                .eventId("evt-serial-1")
                .pipelineId("pipe-test")
                .sourceDatabaseType(DatabaseType.POSTGRESQL)
                .schemaName("public")
                .tableName("orders")
                .operationType(CdcOperationType.INSERT)
                .afterData(Map.of("order_id", 101, "total", 99.95))
                .primaryKeyValues(Map.of("order_id", 101))
                .position(CdcPosition.builder().sourceFile("000000010000000000000001").fileOffset(800L).lsn(123456L).build())
                .build();

        String json = objectMapper.writeValueAsString(event);
        assertNotNull(json);

        CdcEvent deserialized = objectMapper.readValue(json, CdcEvent.class);
        assertEquals(event.getEventId(), deserialized.getEventId());
        assertEquals(event.getTableName(), deserialized.getTableName());
        assertEquals(event.getOperationType(), deserialized.getOperationType());
        assertEquals(123456L, deserialized.getPosition().getLsn());
    }

    @Test
    void testCdcWriteResultMetrics() {
        CdcWriteResult result = CdcWriteResult.builder()
                .totalEvents(10)
                .appliedInserts(5)
                .appliedUpdates(3)
                .appliedDeletes(2)
                .failureCount(0)
                .build();

        assertEquals(10, result.getTotalApplied());
        assertTrue(result.isAllSuccessful());

        CdcWriteResult resultWithFailures = CdcWriteResult.builder()
                .totalEvents(10)
                .appliedInserts(5)
                .appliedUpdates(3)
                .appliedDeletes(1)
                .failureCount(1)
                .build();

        assertEquals(9, resultWithFailures.getTotalApplied());
        assertFalse(resultWithFailures.isAllSuccessful());
    }
}
