package com.datashifter.execution.adapters;

import com.datashifter.adapter.sdk.AdapterConfig;
import com.datashifter.adapter.sdk.DataRecord;
import com.datashifter.adapter.sdk.DataWriter;
import com.datashifter.adapter.sdk.RecordOperation;
import com.datashifter.adapter.sdk.WriteMode;
import com.datashifter.adapter.sdk.WriteResult;
import com.datashifter.common.cdc.CdcEvent;
import com.datashifter.common.enums.CdcOperationType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdapterExecutionBridgeTest {

    private AdapterExecutionBridge bridge;

    @Mock
    private DataWriter writer;

    @BeforeEach
    void setUp() {
        bridge = new AdapterExecutionBridge();
    }

    @Test
    void testToDataRecordAndFromDataRecord() {
        Map<String, Object> row = Map.of("id", 101, "name", "Alpha");
        DataRecord record = bridge.toDataRecord(row, RecordOperation.INSERT, "users");

        assertNotNull(record);
        assertEquals(RecordOperation.INSERT, record.getOperation());
        assertEquals("users", record.getHeader("tableName"));
        assertEquals("Alpha", record.getField("name"));

        Map<String, Object> extracted = bridge.fromDataRecord(record);
        assertEquals(101, extracted.get("id"));
        assertEquals("Alpha", extracted.get("name"));
    }

    @Test
    void testBatchConversion() {
        List<Map<String, Object>> rows = List.of(
                Map.of("id", 1, "val", "A"),
                Map.of("id", 2, "val", "B")
        );

        List<DataRecord> records = bridge.toDataRecords(rows, RecordOperation.READ, "my_table");
        assertEquals(2, records.size());
        assertEquals("A", records.get(0).getField("val"));
        assertEquals("B", records.get(1).getField("val"));

        List<Map<String, Object>> back = bridge.fromDataRecords(records);
        assertEquals(2, back.size());
        assertEquals("A", back.get(0).get("val"));
    }

    @Test
    void testCdcEventConversion() {
        CdcEvent insertEvent = CdcEvent.builder()
                .tableName("orders")
                .operationType(CdcOperationType.INSERT)
                .transactionId("tx-100")
                .afterData(Map.of("order_id", "O1", "amount", 500))
                .build();

        DataRecord insertRecord = bridge.cdcEventToDataRecord(insertEvent);
        assertNotNull(insertRecord);
        assertEquals(RecordOperation.INSERT, insertRecord.getOperation());
        assertEquals("tx-100", insertRecord.getHeader("transactionId"));
        assertEquals("O1", insertRecord.getField("order_id"));

        CdcEvent deleteEvent = CdcEvent.builder()
                .tableName("orders")
                .operationType(CdcOperationType.DELETE)
                .primaryKeyValues(Map.of("order_id", "O1"))
                .beforeData(Map.of("order_id", "O1", "amount", 500))
                .build();

        DataRecord deleteRecord = bridge.cdcEventToDataRecord(deleteEvent);
        assertNotNull(deleteRecord);
        assertEquals(RecordOperation.DELETE, deleteRecord.getOperation());
        assertEquals("O1", deleteRecord.getField("order_id"));
    }

    @Test
    void testWriteBatchDelegation() throws Exception {
        List<Map<String, Object>> rows = List.of(
                Map.of("id", 1, "text", "test")
        );
        AdapterConfig config = new AdapterConfig();

        when(writer.writeBatch(eq(config), eq("target_tbl"), anyList(), eq(WriteMode.UPSERT), eq("id")))
                .thenReturn(WriteResult.success(1));

        WriteResult result = bridge.writeBatch(writer, config, "target_tbl", rows, WriteMode.UPSERT, "id");
        assertNotNull(result);
        assertEquals(1, result.getSuccessCount());

        ArgumentCaptor<List<DataRecord>> captor = ArgumentCaptor.forClass(List.class);
        verify(writer).writeBatch(eq(config), eq("target_tbl"), captor.capture(), eq(WriteMode.UPSERT), eq("id"));
        assertEquals(1, captor.getValue().size());
        assertEquals("test", captor.getValue().get(0).getField("text"));
    }

    @Test
    void testApplyCdcEventsDelegation() throws Exception {
        CdcEvent update = CdcEvent.builder()
                .tableName("products")
                .operationType(CdcOperationType.UPDATE)
                .afterData(Map.of("sku", "P1", "price", 99.0))
                .beforeData(Map.of("sku", "P1", "price", 89.0))
                .build();

        AdapterConfig config = new AdapterConfig();
        when(writer.applyBatch(eq(config), eq("products"), anyList(), eq("sku")))
                .thenReturn(WriteResult.success(1));

        WriteResult result = bridge.applyCdcEvents(writer, config, "products", List.of(update), "sku");
        assertEquals(1, result.getSuccessCount());
        verify(writer).applyBatch(eq(config), eq("products"), anyList(), eq("sku"));
    }
}
