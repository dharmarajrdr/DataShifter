package com.datashifter.adapter.sdk;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class DataRecordTest {

    @Test
    void testBasicBatchRecordCreation() {
        Map<String, Object> data = new HashMap<>();
        data.put("id", 101);
        data.put("name", "Alice");

        DataRecord record = DataRecord.of(data);

        assertEquals(RecordOperation.READ, record.getOperation());
        assertEquals(101, record.getField("id"));
        assertEquals("Alice", record.getField("name"));
        assertNull(record.getBeforeData());
        assertTrue(record.getHeaders().isEmpty());
    }

    @Test
    void testCdcStreamingRecordBuilder() {
        Map<String, Object> after = Map.of("id", 202, "status", "PAID");
        Map<String, Object> before = Map.of("id", 202, "status", "PENDING");

        DataRecord record = DataRecord.builder()
                .operation(RecordOperation.UPDATE)
                .data(after)
                .beforeData(before)
                .header("scn", 987654321L)
                .header("txId", "TX_100")
                .build();

        assertEquals(RecordOperation.UPDATE, record.getOperation());
        assertEquals("PAID", record.getField("status"));
        assertEquals("PENDING", record.getBeforeData().get("status"));
        assertEquals(987654321L, record.getHeader("scn"));
        assertEquals("TX_100", record.getHeader("txId"));
    }
}
