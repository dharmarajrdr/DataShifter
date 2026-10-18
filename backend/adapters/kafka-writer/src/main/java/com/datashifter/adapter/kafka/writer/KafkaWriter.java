package com.datashifter.adapter.kafka.writer;

import com.datashifter.adapter.sdk.AdapterConfig;
import com.datashifter.adapter.sdk.DataRecord;
import com.datashifter.adapter.sdk.DataWriter;
import com.datashifter.adapter.sdk.WriteMode;
import com.datashifter.adapter.sdk.WriteResult;
import com.datashifter.adapter.sdk.annotations.AdapterConfigProperty;
import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.adapter.sdk.annotations.DataShifterAdapter;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.producer.Producer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Future;

/**
 * Target adapter for streaming and batch publishing to Apache Kafka topics.
 */
@DataShifterAdapter(
        id = "kafka-writer",
        name = "Apache Kafka Writer",
        description = "High-throughput streaming and batch target writer for Apache Kafka topics",
        type = AdapterType.WRITER,
        mode = AdapterMode.BOTH,
        category = "messaging",
        version = "1.0.0"
)
@AdapterConfigProperty(name = "bootstrapServers", label = "Bootstrap Servers", type = "string", description = "Kafka broker bootstrap servers", defaultValue = "localhost:9092")
@AdapterConfigProperty(name = "topic", label = "Default Topic", type = "string", description = "Target Kafka topic", defaultValue = "datashifter-records")
@AdapterConfigProperty(name = "keyField", label = "Message Key Field", type = "string", description = "Record field to use as Kafka message key", defaultValue = "")
@AdapterConfigProperty(name = "acks", label = "Acks", type = "string", description = "Kafka producer acks configuration", defaultValue = "all")
@AdapterConfigProperty(name = "compressionType", label = "Compression Type", type = "string", description = "Compression codec: none, gzip, snappy, lz4, zstd", defaultValue = "none")
@AdapterConfigProperty(name = "retries", label = "Retries", type = "number", description = "Producer retries", defaultValue = "3")
@AdapterConfigProperty(name = "batchSize", label = "Batch Size", type = "number", description = "Producer batch size in bytes", defaultValue = "16384")
@AdapterConfigProperty(name = "lingerMs", label = "Linger Ms", type = "number", description = "Producer linger ms", defaultValue = "5")
@Slf4j
public class KafkaWriter implements DataWriter {

    private final KafkaProducerFactory producerFactory;
    private final KafkaRecordSerializer serializer;
    private Producer<String, byte[]> producer;
    private AdapterConfig config;

    public KafkaWriter() {
        this(new KafkaProducerFactory(), new KafkaRecordSerializer());
    }

    public KafkaWriter(KafkaProducerFactory producerFactory, KafkaRecordSerializer serializer) {
        this.producerFactory = producerFactory;
        this.serializer = serializer;
    }

    @Override
    public synchronized void init(AdapterConfig config) throws Exception {
        this.config = config;
        if (this.producer == null) {
            this.producer = producerFactory.createProducer(config);
            log.info("Initialized KafkaWriter with bootstrap servers: {}",
                    config != null ? config.getString("bootstrapServers", "localhost:9092") : "default");
        }
    }

    @Override
    public WriteResult writeBatch(AdapterConfig adapterConfig,
                                  String targetTable,
                                  List<DataRecord> records,
                                  WriteMode writeMode,
                                  String primaryKeyColumn) throws Exception {
        if (records == null || records.isEmpty()) {
            return WriteResult.empty();
        }

        if (this.producer == null) {
            init(adapterConfig != null ? adapterConfig : this.config);
        }

        AdapterConfig effectiveConfig = adapterConfig != null ? adapterConfig : this.config;
        String defaultTopic = effectiveConfig != null ? effectiveConfig.getString("topic", "datashifter-records") : "datashifter-records";
        String topic = (targetTable != null && !targetTable.isBlank()) ? targetTable : defaultTopic;
        String keyField = effectiveConfig != null ? effectiveConfig.getString("keyField", primaryKeyColumn) : primaryKeyColumn;

        List<Future<RecordMetadata>> futures = new ArrayList<>(records.size());
        List<DataRecord> sentRecords = new ArrayList<>(records.size());
        List<WriteResult.FailedRecord> failedRecords = new ArrayList<>();

        for (DataRecord record : records) {
            try {
                ProducerRecord<String, byte[]> producerRecord = serializer.serialize(topic, record, keyField, primaryKeyColumn);
                Future<RecordMetadata> future = producer.send(producerRecord);
                futures.add(future);
                sentRecords.add(record);
            } catch (Exception e) {
                log.error("Failed to serialize or send record to topic {}: {}", topic, e.getMessage(), e);
                failedRecords.add(new WriteResult.FailedRecord(record, e.getMessage(), "KAFKA_SERIALIZE_ERROR"));
            }
        }

        producer.flush();

        int successCount = 0;
        for (int i = 0; i < futures.size(); i++) {
            DataRecord record = sentRecords.get(i);
            try {
                futures.get(i).get();
                successCount++;
            } catch (Exception e) {
                log.error("Failed to produce record to topic {}: {}", topic, e.getMessage(), e);
                failedRecords.add(new WriteResult.FailedRecord(record, e.getMessage(), "KAFKA_PRODUCE_ERROR"));
            }
        }

        log.debug("Published {} records to Kafka topic {} (success={}, failures={})",
                records.size(), topic, successCount, failedRecords.size());

        return WriteResult.builder()
                .totalRecords(records.size())
                .successCount(successCount)
                .failureCount(failedRecords.size())
                .failedRecords(failedRecords)
                .build();
    }

    @Override
    public WriteResult applyBatch(AdapterConfig adapterConfig,
                                  String targetTable,
                                  List<DataRecord> records,
                                  String primaryKeyColumn) throws Exception {
        return writeBatch(adapterConfig, targetTable, records, WriteMode.UPSERT, primaryKeyColumn);
    }

    @Override
    public synchronized void close() throws Exception {
        if (producer != null) {
            producer.flush();
            producer.close();
            producer = null;
            log.info("Closed KafkaWriter producer");
        }
    }
}
