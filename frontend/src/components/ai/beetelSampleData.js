export const SAMPLE_AGENT_SESSIONS = [
  {
    id: 'sess-1',
    title: 'Postgres to Snowflake CDC',
    preview: 'Synthesized mapping for 42 columns...',
    headerTitle: 'Postgres to Snowflake CDC Pipeline Architecture',
    userMessage: 'Inspect database connection prod_aurora_postgres and generate a continuous CDC replication pipeline into Snowflake table ANALYTICS.ORDERS_RAW with automatic schema inference.',
    agentMessage: 'I analyzed the Aurora Postgres catalog. Verified 12 tables with Logical Decoding (pgoutput) enabled. Here is the synthesized pipeline plan:',
    spec: {
      source: 'PostgreSQL WAL2JSON',
      transform: 'CDC Event Flattener',
      dest: 'Snowflake Internal Stage',
      validation: 'Validation: 100% Passed',
    },
  },
  {
    id: 'sess-2',
    title: 'Fix ClickHouse Memory Heap',
    preview: 'Suggested batch tuning parameter...',
    headerTitle: 'ClickHouse Memory Heap Exhaustion Diagnostic',
    userMessage: 'Pipeline clickhouse_events_sink is throwing OutOfMemoryError during peak 50k rows/sec ingress. Analyze heap dump and suggest tuning.',
    agentMessage: 'Identified buffer queue amplification. Recommendation: Decrease max_insert_block_size to 65536 and enable async_insert=1.',
    spec: {
      source: 'ClickHouse Driver v2',
      transform: 'Batch Block Limiter (64K)',
      dest: 'ClickHouse Buffer Queue',
      validation: 'Estimated Memory Drop: 68%',
    },
  },
  {
    id: 'sess-3',
    title: 'Kafka JSON Flattener UDF',
    preview: 'Generated Java bytecode wrapper...',
    headerTitle: 'Kafka Nested JSON Schema Normalizer',
    userMessage: 'Create a custom UDF to flatten nested Stripe webhook events and cast timestamp strings into epoch milliseconds.',
    agentMessage: 'Generated high-performance transformation bytecode with zero heap allocation per record.',
    spec: {
      source: 'Apache Kafka 3.4',
      transform: 'StripeJsonNormalizerUDF',
      dest: 'Parquet S3 Lakehouse',
      validation: 'Throughput: 140k rec/sec',
    },
  },
];
