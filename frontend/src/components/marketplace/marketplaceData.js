/**
 * Central Adapter Registry Dataset (<= 100 lines).
 */
export const ADAPTER_REGISTRY = [
  {
    id: 'postgres', name: 'PostgreSQL CDC', category: 'Databases', role: 'BIDIRECTIONAL',
    version: 'v2.4.1', installed: true, author: 'DataShifter Certified', avatarText: 'PG',
    bg: 'bg-emerald-50 text-emerald-700', desc: 'Real-time logical replication via pgoutput decoding.',
    protocols: ['pgoutput', 'wal2json'],
    permissions: 'ALTER USER datashifter WITH REPLICATION;\nGRANT SELECT ON ALL TABLES IN SCHEMA public TO datashifter;',
    features: ['Logical Decoding', 'Schema Evolution', 'Low-Watermark Snapshots', 'TLS 1.3 Encryption'],
  },
  {
    id: 'oracle', name: 'Oracle GoldenGate', category: 'Databases', role: 'SOURCE',
    version: 'v1.8.0', installed: true, author: 'Enterprise Partner', avatarText: 'ORA',
    bg: 'bg-rose-50 text-rose-700', desc: 'High-throughput change data capture for Oracle 11g through 23c.',
    protocols: ['LogMiner', 'XStream API'],
    permissions: 'GRANT LOGMINING TO c##datashifter;\nGRANT SELECT ON V_$LOGMNR_CONTENTS TO c##datashifter;',
    features: ['LogMiner & XStream', 'RAC Clustering', 'Supplemental Logging', 'ASM Direct Read'],
  },
  {
    id: 'snowflake', name: 'Snowflake Streaming', category: 'Data Warehouses', role: 'TARGET',
    version: 'v3.1.2', installed: true, author: 'DataShifter Certified', avatarText: 'SF',
    bg: 'bg-sky-50 text-sky-700', desc: 'Direct Snowpipe Streaming ingestion with micro-batch guarantees.',
    protocols: ['Snowpipe Streaming REST', 'Key-Pair Auth'],
    permissions: 'GRANT USAGE ON DATABASE analytics TO ROLE datashifter_role;',
    features: ['Sub-Second Ingestion', 'Zero-Copy Compaction', 'Key-Pair Authentication', 'Auto-Schema Drift'],
  },
  {
    id: 'kafka', name: 'Apache Kafka', category: 'Streaming', role: 'BIDIRECTIONAL',
    version: 'v2.1.0', installed: false, author: 'Community Verified', avatarText: 'KFK',
    bg: 'bg-amber-50 text-amber-700', desc: 'Distributed pub-sub streaming supporting Avro, JSON, and Protobuf.',
    protocols: ['Kafka Protocol 3.x', 'SASL/SCRAM'],
    permissions: 'ALLOW Describe, Read, Write ON Topic * TO User:datashifter;',
    features: ['Confluent Schema Registry', 'Exact-Once Semantics', 'Partition Routing', 'Snappy Compression'],
  },
  {
    id: 'bigquery', name: 'Google BigQuery', category: 'Data Warehouses', role: 'TARGET',
    version: 'v2.0.4', installed: false, author: 'DataShifter Certified', avatarText: 'BQ',
    bg: 'bg-blue-50 text-blue-700', desc: 'Writes via BigQuery Storage Write API with stream commits.',
    protocols: ['Storage Write API', 'Service Account OAuth2'],
    permissions: 'roles/bigquery.dataEditor, roles/bigquery.jobUser',
    features: ['Default Stream Write', 'Pending Commits', 'Partition Alignment', 'Dead-Letter Routing'],
  },
  {
    id: 's3', name: 'Amazon S3 Lake', category: 'Storage', role: 'BIDIRECTIONAL',
    version: 'v1.9.5', installed: false, author: 'DataShifter Certified', avatarText: 'S3',
    bg: 'bg-orange-50 text-orange-700', desc: 'Snappy-compressed Parquet rollups with Hive folder partitioning.',
    protocols: ['AWS S3 API', 'IAM Role / STS'],
    permissions: 's3:PutObject, s3:GetObject, s3:ListBucket ON arn:aws:s3:::datashifter-lake/*',
    features: ['Snappy Parquet', 'Hive Partitioning (year/month/day)', 'Object Tagging', 'AWS KMS SSE'],
  },
  {
    id: 'mysql', name: 'MySQL Binlog CDC', category: 'Databases', role: 'SOURCE',
    version: 'v2.2.0', installed: false, author: 'DataShifter Certified', avatarText: 'MY',
    bg: 'bg-cyan-50 text-cyan-700', desc: 'Continuous binary log tailing with GTID and schema tracking.',
    protocols: ['MySQL Binary Protocol', 'GTID'],
    permissions: "GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'datashifter'@'%';",
    features: ['ROW Binlog Format', 'GTID Failover', 'Heartbeat Keepalive', 'Zero Downtime Initial Snapshot'],
  },
  {
    id: 'mongodb', name: 'MongoDB Streams', category: 'NoSQL', role: 'BIDIRECTIONAL',
    version: 'v1.5.1', installed: false, author: 'Community Verified', avatarText: 'MDB',
    bg: 'bg-emerald-50 text-emerald-800', desc: 'Document change stream listener with unnesting pipelines.',
    protocols: ['MongoDB Wire Protocol', 'SCRAM-SHA-256'],
    permissions: 'grantPrivilegesToRole: { resource: { cluster: true }, actions: [ "find", "changeStream" ] }',
    features: ['Oplog & Change Streams', 'JSON Flattening Engine', 'Resume Token Persistence'],
  },
];

export const CATEGORIES = ['ALL', 'Databases', 'Data Warehouses', 'Streaming', 'Storage', 'NoSQL'];
