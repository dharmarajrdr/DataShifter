package com.datashifter.adapter.kafka.writer;

import com.datashifter.adapter.sdk.AdapterConfig;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.Producer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.ByteArraySerializer;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;

/**
 * Factory for creating configured KafkaProducer instances.
 */
public class KafkaProducerFactory {

    private Producer<String, byte[]> customProducer;

    public KafkaProducerFactory() {}

    /**
     * Package-private constructor for injecting MockProducer in tests.
     */
    public KafkaProducerFactory(Producer<String, byte[]> customProducer) {
        this.customProducer = customProducer;
    }

    public Producer<String, byte[]> createProducer(AdapterConfig config) {
        if (customProducer != null) {
            return customProducer;
        }

        String servers = config.getString("bootstrapServers", "localhost:9092");
        String acks = config.getString("acks", "all");
        String compression = config.getString("compressionType", "none");
        int retries = config.getInteger("retries", 3);
        int batchSize = config.getInteger("batchSize", 16384);
        int lingerMs = config.getInteger("lingerMs", 5);

        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, servers);
        props.put(ProducerConfig.ACKS_CONFIG, acks);
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, compression);
        props.put(ProducerConfig.RETRIES_CONFIG, retries);
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, batchSize);
        props.put(ProducerConfig.LINGER_MS_CONFIG, lingerMs);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, ByteArraySerializer.class.getName());

        return new KafkaProducer<>(props);
    }
}
