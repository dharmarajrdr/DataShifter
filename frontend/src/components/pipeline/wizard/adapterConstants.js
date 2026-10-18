export const SOURCE_ADAPTER_LIST = [
  {
    id: 'oracle-jdbc',
    name: 'Oracle JDBC Reader',
    sub: 'Direct Relational DB Query',
    dbType: 'ORACLE',
    badge: 'JDBC',
  },
  {
    id: 'oracle-trail',
    name: 'Oracle GoldenGate Trail',
    sub: 'Binary Trail CDC Stream',
    dbType: 'ORACLE',
    badge: 'CDC',
  },
  {
    id: 'postgres-jdbc',
    name: 'PostgreSQL JDBC Reader',
    sub: 'Direct DB Table Query',
    dbType: 'POSTGRESQL',
    badge: 'JDBC',
  },
  {
    id: 'postgres-wal',
    name: 'PostgreSQL WAL Reader',
    sub: 'Logical Replication Slot',
    dbType: 'POSTGRESQL',
    badge: 'CDC',
  },
  {
    id: 'filesystem',
    name: 'FileSystem Ingestion',
    sub: 'Parquet / CSV / JSONL Files',
    dbType: 'FILE',
    badge: 'FILE',
  },
];

export const TARGET_ADAPTER_LIST = [
  {
    id: 'postgres-writer',
    name: 'PostgreSQL Writer',
    sub: 'JDBC Batch Upsert & Insert',
    dbType: 'POSTGRESQL',
    badge: 'JDBC',
  },
  {
    id: 'oracle-writer',
    name: 'Oracle Writer',
    sub: 'JDBC Batch Relational Sink',
    dbType: 'ORACLE',
    badge: 'JDBC',
  },
  {
    id: 's3-writer',
    name: 'Amazon S3 / Lakehouse',
    sub: 'Parquet / Delta Lake Storage',
    dbType: 'S3',
    badge: 'CLOUD',
  },
  {
    id: 'kafka-writer',
    name: 'Apache Kafka Broker',
    sub: 'Event Stream Topic Producer',
    dbType: 'KAFKA',
    badge: 'STREAM',
  },
  {
    id: 'snowflake-writer',
    name: 'Snowflake DW',
    sub: 'Cloud Data Warehouse Table',
    dbType: 'SNOWFLAKE',
    badge: 'DW',
  },
];

export const isDbAdapter = (adapterId = '') =>
  adapterId.startsWith('oracle-') || adapterId.startsWith('postgres-');

export const getExpectedDbType = (adapterId = '') => {
  if (adapterId.startsWith('oracle-')) return 'ORACLE';
  if (adapterId.startsWith('postgres-')) return 'POSTGRESQL';
  return null;
};

