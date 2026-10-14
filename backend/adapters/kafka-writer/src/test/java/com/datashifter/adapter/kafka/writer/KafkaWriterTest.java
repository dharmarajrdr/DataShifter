package com.datashifter.adapter.kafka.writer;

import com.datashifter.adapter.sdk.AdapterConfig;
import com.datashifter.adapter.sdk.DataRecord;
import com.datashifter.adapter.sdk.RecordOperation;
import com.datashifter.adapter.sdk.WriteMode;
import com.datashifter.adapter.sdk.WriteResult;
import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.adapter.sdk.annotations.DataShifterAdapter;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.producer.MockProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.Header;
import org.apache.kafka.common.serialization.ByteArraySerializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class KafkaWriterTest {

    private MockProducer<String, byte[]> mockProducer;
    private KafkaWriter kafkaWriter;
    private AdapterConfig config;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() throws Exception {
        this.mockProducer = new MockProducer<>(true, new StringSerializer(), new ByteArraySerializer());
        KafkaProducerFactory factory = new KafkaProducerFactory(mockProducer);
        this.kafkaWriter = new KafkaWriter(factory, new KafkaRecordSerializer());

        Map<String, Object> props = new HashMap<>();
        props.put("bootstrapServers", "localhost:9092");
        props.put("topic", "default-topic");
        this.config = new AdapterConfig(props);
        this.kafkaWriter.init(config);
        this.objectMapper = new ObjectMapper();
    }

    @Test
    void testAdapterAnnotationMetadata() {
        DataShifterAdapter annotation = KafkaWriter.class.getAnnotation(DataShifterAdapter.class);
        assertNotNull(annotation);
        assertEquals("kafka-writer", annotation.id());
        assertEquals("Apache Kafka Writer", annotation.name());
        assertEquals(AdapterType.WRITER, annotation.type());
        assertEquals(AdapterMode.BOTH, annotation.mode());
        assertEquals("messaging", annotation.category());
    }

    @Test
    void testWriteBatchBasic() throws Exception {
        DataRecord record1 = DataRecord.builder()
                .operation(RecordOperation.INSERT)
                .data(Map.of("id", 1001, "customer", "Alice", "amount", 250.0))
                .build();

        DataRecord record2 = DataRecord.builder()
                .operation(RecordOperation.INSERT)
                .data(Map.of("id", 1002, "customer", "Bob", "amount", 120.0))
                .build();

        WriteResult result = kafkaWriter.writeBatch(config, "orders-topic", List.of(record1, record2), WriteMode.INSERT_ONLY, "id");

        assertEquals(2, result.getTotalRecords());
        assertEquals(2, result.getSuccessCount());
        assertEquals(0, result.getFailureCount());

        List<ProducerRecord<String, byte[]>> history = mockProducer.history();
        assertEquals(2, history.size());

        ProducerRecord<String, byte[]> pr1 = history.get(0);
        assertEquals("orders-topic", pr1.topic());
        assertEquals("1001", pr1.key());

        JsonNode json1 = objectMapper.readTree(pr1.value());
        assertEquals("Alice", json1.get("customer").asText());
        assertEquals(250.0, json1.get("amount").asDouble());
        assertEquals("INSERT", json1.get("_op").asText());

        ProducerRecord<String, byte[]> pr2 = history.get(1);
        assertEquals("orders-topic", pr2.topic());
        assertEquals("1002", pr2.key());
    }

    @Test
    void testApplyBatchCdcOperationsAndHeaders() throws Exception {
        DataRecord insert = DataRecord.builder()
                .operation(RecordOperation.INSERT)
                .header("sourceSystem", "oracle-hr")
                .data(Map.of("user_id", "U100", "status", "ACTIVE"))
                .build();

        Map<String, Object> beforeData = Map.of("user_id", "U100", "status", "ACTIVE");
        DataRecord update = DataRecord.builder()
                .operation(RecordOperation.UPDATE)
                .beforeData(beforeData)
                .data(Map.of("user_id", "U100", "status", "INACTIVE"))
                .build();

        DataRecord delete = DataRecord.builder()
                .operation(RecordOperation.DELETE)
                .data(Map.of("user_id", "U100"))
                .build();

        WriteResult result = kafkaWriter.applyBatch(config, "users-cdc-topic", List.of(insert, update, delete), "user_id");

        assertEquals(3, result.getTotalRecords());
        assertEquals(3, result.getSuccessCount());
        assertEquals(0, result.getFailureCount());

        List<ProducerRecord<String, byte[]>> history = mockProducer.history();
        assertEquals(3, history.size());

        // Verify headers
        Header sourceHeader = history.get(0).headers().lastHeader("sourceSystem");
        assertNotNull(sourceHeader);
        assertEquals("oracle-hr", new String(sourceHeader.value(), StandardCharsets.UTF_8));

        Header opHeader = history.get(0).headers().lastHeader("operation");
        assertNotNull(opHeader);
        assertEquals("INSERT", new String(opHeader.value(), StandardCharsets.UTF_8));

        // Verify update payload contains _before
        JsonNode updateJson = objectMapper.readTree(history.get(1).value());
        assertEquals("UPDATE", updateJson.get("_op").asText());
        assertEquals("INACTIVE", updateJson.get("status").asText());
        assertTrue(updateJson.has("_before"));
        assertEquals("ACTIVE", updateJson.get("_before").get("status").asText());
    }

    @Test
    void testEmptyBatch() throws Exception {
        WriteResult result = kafkaWriter.writeBatch(config, "test-topic", List.of(), WriteMode.INSERT_ONLY, "id");
        assertEquals(0, result.getTotalRecords());
        assertEquals(0, result.getSuccessCount());
        assertEquals(0, result.getFailureCount());
        assertTrue(mockProducer.history().isEmpty());
    }

    @Test
    void testProducerFailureHandling() throws Exception {
        // Prepare mock producer to simulate failure on send
        mockProducer.sendException = new RuntimeException("Kafka broker leader not available");

        DataRecord record = DataRecord.builder()
                .operation(RecordOperation.INSERT)
                .data(Map.of("id", "E1"))
                .build();

        WriteResult result = kafkaWriter.writeBatch(config, "events-topic", List.of(record), WriteMode.INSERT_ONLY, "id");

        assertEquals(1, result.getTotalRecords());
        assertEquals(0, result.getSuccessCount());
        assertEquals(1, result.getFailureCount());
        assertEquals(1, result.getFailedRecords().size());
        assertTrue(result.getFailedRecords().get(0).getErrorMessage().contains("Kafka broker leader not available"));
    }

    @Test
    void testCloseFlushesProducer() throws Exception {
        assertFalse(mockProducer.closed());
        kafkaWriter.close();
        assertTrue(mockProducer.closed());
    }
}
