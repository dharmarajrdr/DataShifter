package com.datashifter.execution.adapters;

import com.datashifter.adapter.sdk.*;
import com.datashifter.common.cdc.CdcEvent;
import com.datashifter.common.cdc.CdcPosition;
import com.datashifter.common.enums.CdcOperationType;
import com.datashifter.common.models.AdapterDefinition;
import com.datashifter.common.repositories.AdapterDefinitionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.file.Path;
import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * End-to-End integration test verifying the entire DataShifter SPI Adapter lifecycle:
 * dynamic classloading, config parsing, engine batch bridge conversion, CDC streaming replication,
 * write result translation, and resource disposal.
 */
@ExtendWith(MockitoExtension.class)
class AdapterEndToEndFlowTest {

    @Mock
    private AdapterDefinitionRepository definitionRepo;

    private AdapterExecutionBridge bridge;
    private AdapterExecutionManager manager;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp(@TempDir Path tempDir) {
        objectMapper = new ObjectMapper();
        bridge = new AdapterExecutionBridge();
        manager = new AdapterExecutionManager(tempDir.toString(), definitionRepo, objectMapper);
    }

    public static class RecordingMockWriter implements DataWriter {
        final List<DataRecord> writtenRecords = new ArrayList<>();
        final List<DataRecord> appliedCdcRecords = new ArrayList<>();
        AdapterConfig receivedConfig;
        boolean closed = false;

        @Override
        public void init(AdapterConfig config) {
            this.receivedConfig = config;
        }

        @Override
        public WriteResult writeBatch(AdapterConfig config, String targetTable, List<DataRecord> records, WriteMode writeMode, String primaryKeyColumn) {
            writtenRecords.addAll(records);
            return WriteResult.success(records.size());
        }

        @Override
        public WriteResult applyBatch(AdapterConfig config, String targetTable, List<DataRecord> records, String primaryKeyColumn) {
            appliedCdcRecords.addAll(records);
            return WriteResult.success(records.size());
        }

        @Override
        public void close() {
            this.closed = true;
        }
    }

    public static class StreamingMockReader implements DataReader {
        final List<DataRecord> generated = new ArrayList<>();
        boolean closed = false;

        @Override
        public List<DataRecord> readChunk(AdapterConfig config, String tableName, String primaryKeyColumn, String lastPkValue, int chunkSize) {
            List<DataRecord> chunk = new ArrayList<>();
            for (int i = 0; i < Math.min(chunkSize, 5); i++) {
                chunk.add(DataRecord.builder()
                        .operation(RecordOperation.READ)
                        .data(Map.of("id", i + 1, "name", "record-" + (i + 1)))
                        .headers(Map.of("tableName", tableName))
                        .build());
            }
            return chunk;
        }

        @Override
        public void close() {
            this.closed = true;
        }
    }

    @Test
    @DisplayName("End-to-End: Batch write execution through SPI bridge with result translation")
    void testEndToEndBatchWriteFlow() throws Exception {
        RecordingMockWriter writer = new RecordingMockWriter();
        AdapterConfig config = AdapterConfig.builder()
                .property("batchSize", 1000)
                .property("targetSchema", "PUBLIC")
                .build();
        writer.init(config);

        List<Map<String, Object>> engineRows = List.of(
                Map.of("id", 101, "name", "Alpha", "amount", 199.99),
                Map.of("id", 102, "name", "Beta", "amount", 299.50),
                Map.of("id", 103, "name", "Gamma", "amount", 349.00)
        );

        WriteResult sdkResult = bridge.writeBatch(writer, config, "CUSTOMERS", engineRows, WriteMode.UPSERT, "id");
        assertThat(sdkResult.getTotalRecords()).isEqualTo(3);
        assertThat(sdkResult.getSuccessCount()).isEqualTo(3);
        assertThat(sdkResult.getFailureCount()).isEqualTo(0);
        assertThat(writer.writtenRecords).hasSize(3);

        com.datashifter.connector.spi.interfaces.WriteResult connectorResult = bridge.toConnectorWriteResult(sdkResult);
        assertThat(connectorResult.getTotalRecords()).isEqualTo(3);
        assertThat(connectorResult.getSuccessCount()).isEqualTo(3);
        assertThat(connectorResult.getFailureCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("End-to-End: CDC event streaming replication across multi-table batch")
    void testEndToEndCdcStreamingFlow() throws Exception {
        RecordingMockWriter writer = new RecordingMockWriter();
        AdapterConfig config = new AdapterConfig();

        CdcEvent evt1 = CdcEvent.builder()
                .tableName("ORDERS")
                .operationType(CdcOperationType.INSERT)
                .transactionId("tx-001")
                .position(CdcPosition.builder().scn(500100L).token("500100").build())
                .commitTimestamp(Instant.now())
                .afterData(Map.of("order_id", 1, "customer_id", 101, "total", 99.5))
                .build();

        CdcEvent evt2 = CdcEvent.builder()
                .tableName("ORDERS")
                .operationType(CdcOperationType.UPDATE)
                .transactionId("tx-002")
                .position(CdcPosition.builder().scn(500101L).token("500101").build())
                .commitTimestamp(Instant.now())
                .beforeData(Map.of("order_id", 1, "total", 99.5))
                .afterData(Map.of("order_id", 1, "customer_id", 101, "total", 149.0))
                .build();

        CdcEvent evt3 = CdcEvent.builder()
                .tableName("CUSTOMERS")
                .operationType(CdcOperationType.DELETE)
                .transactionId("tx-003")
                .position(CdcPosition.builder().scn(500102L).token("500102").build())
                .commitTimestamp(Instant.now())
                .beforeData(Map.of("customer_id", 999))
                .build();

        List<CdcEvent> streamBatch = List.of(evt1, evt2, evt3);

        WriteResult res = bridge.applyCdcEvents(writer, config, null, streamBatch, null);
        assertThat(res.getTotalRecords()).isEqualTo(3);
        assertThat(res.getSuccessCount()).isEqualTo(3);
        assertThat(writer.appliedCdcRecords).hasSize(3);

        DataRecord r1 = writer.appliedCdcRecords.get(0);
        assertThat(r1.getOperation()).isEqualTo(RecordOperation.INSERT);
        assertThat(r1.getData().get("total")).isEqualTo(99.5);

        DataRecord r2 = writer.appliedCdcRecords.get(1);
        assertThat(r2.getOperation()).isEqualTo(RecordOperation.UPDATE);
        assertThat(r2.getBeforeData().get("total")).isEqualTo(99.5);
        assertThat(r2.getData().get("total")).isEqualTo(149.0);

        DataRecord r3 = writer.appliedCdcRecords.get(2);
        assertThat(r3.getOperation()).isEqualTo(RecordOperation.DELETE);
    }

    @Test
    @DisplayName("End-to-End: Full round-trip DataRecord to CdcEvent and back")
    void testEndToEndRoundTripConversion() {
        CdcEvent original = CdcEvent.builder()
                .tableName("INVENTORY")
                .operationType(CdcOperationType.UPDATE)
                .transactionId("xid-9988")
                .beforeData(Map.of("item_id", 42, "qty", 10))
                .afterData(Map.of("item_id", 42, "qty", 8))
                .build();

        DataRecord record = bridge.cdcEventToDataRecord(original);
        assertThat(record.getOperation()).isEqualTo(RecordOperation.UPDATE);
        assertThat(record.getHeaders().get("tableName")).isEqualTo("INVENTORY");
        assertThat(record.getHeaders().get("transactionId")).isEqualTo("xid-9988");
        assertThat(record.getBeforeData().get("qty")).isEqualTo(10);
        assertThat(record.getData().get("qty")).isEqualTo(8);

        CdcEvent reconstructed = bridge.dataRecordToCdcEvent(record);
        assertThat(reconstructed.getTableName()).isEqualTo("INVENTORY");
        assertThat(reconstructed.getOperationType()).isEqualTo(CdcOperationType.UPDATE);
        assertThat(reconstructed.getTransactionId()).isEqualTo("xid-9988");
        assertThat(reconstructed.getBeforeData().get("qty")).isEqualTo(10);
        assertThat(reconstructed.getAfterData().get("qty")).isEqualTo(8);
    }

    @Test
    @DisplayName("End-to-End: AdapterExecutionManager dynamic discovery, execution and disposal")
    void testEndToEndAdapterLifecycle() throws Exception {
        AdapterDefinition def = AdapterDefinition.builder()
                .adapterKey("stream-mock-reader")
                .className(StreamingMockReader.class.getName())
                .build();
        when(definitionRepo.findByAdapterKey("stream-mock-reader")).thenReturn(Optional.of(def));

        AdapterConfig config = manager.parseConfig("{\"timeoutMs\": 5000}");
        DataReader reader = manager.getReader("stream-mock-reader", config);
        assertThat(reader).isInstanceOf(StreamingMockReader.class);

        List<DataRecord> chunk = reader.readChunk(config, "ITEMS", "id", null, 10);
        assertThat(chunk).hasSize(5);

        List<Map<String, Object>> rows = bridge.fromDataRecords(chunk);
        assertThat(rows).hasSize(5);
        assertThat(rows.get(0).get("name")).isEqualTo("record-1");

        manager.close(reader);
        assertThat(((StreamingMockReader) reader).closed).isTrue();
    }
}
