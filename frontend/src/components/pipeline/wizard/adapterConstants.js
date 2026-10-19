export const DEFAULT_INSTALLED_SOURCES = [
  {
    id: 'postgres-reader',
    name: 'PostgreSQL Database Reader',
    sub: 'Direct Relational DB Query',
    dbType: 'POSTGRESQL',
    badge: 'JDBC',
    alias: 'postgres-jdbc',
  },
  {
    id: 'postgres-wal-reader',
    name: 'PostgreSQL WAL CDC Reader',
    sub: 'Logical Replication Slot',
    dbType: 'POSTGRESQL',
    badge: 'CDC',
    alias: 'postgres-wal',
  },
  {
    id: 'oracle-reader',
    name: 'Oracle JDBC Reader',
    sub: 'Direct Relational DB Query',
    dbType: 'ORACLE',
    badge: 'JDBC',
    alias: 'oracle-jdbc',
  },
  {
    id: 'oracle-gg-reader',
    name: 'Oracle GoldenGate Trail',
    sub: 'Binary Trail CDC Stream',
    dbType: 'ORACLE',
    badge: 'CDC',
    alias: 'oracle-trail',
  },
];

export const DEFAULT_INSTALLED_TARGETS = [
  {
    id: 'oracle-writer',
    name: 'Oracle Writer',
    sub: 'JDBC Batch Relational Sink',
    dbType: 'ORACLE',
    badge: 'JDBC',
  },
  {
    id: 'postgres-writer',
    name: 'PostgreSQL Writer',
    sub: 'JDBC Batch Upsert & Insert',
    dbType: 'POSTGRESQL',
    badge: 'JDBC',
  },
];

export const SOURCE_ADAPTER_LIST = DEFAULT_INSTALLED_SOURCES;
export const TARGET_ADAPTER_LIST = DEFAULT_INSTALLED_TARGETS;

export const formatAdapterForDropdown = (adp) => {
  const k = (adp.adapterKey || adp.id || '').toLowerCase();
  const isPg = k.includes('postgres');
  const isOra = k.includes('oracle');
  const isKf = k.includes('kafka');
  const isFs = k.includes('file') || k.includes('s3');
  const isSpanner = k.includes('spanner');
  const isBq = k.includes('bigquery');
  const isBt = k.includes('bigtable');
  const isSf = k.includes('snowflake');

  const dbType = isPg ? 'POSTGRESQL' : isOra ? 'ORACLE' : isKf ? 'KAFKA' : isFs ? 'S3' : isSpanner ? 'SPANNER' : isBq ? 'BIGQUERY' : isBt ? 'BIGTABLE' : isSf ? 'SNOWFLAKE' : (adp.dbType || 'OTHER');
  const isCdc = adp.supportedMode === 'CDC' || k.includes('wal') || k.includes('trail') || k.includes('gg');
  const badge = isCdc ? 'CDC' : isKf ? 'STREAM' : isFs ? 'FILE' : isSf ? 'DW' : (adp.badge || 'JDBC');

  const alias = k === 'oracle-gg-reader' ? 'oracle-trail' : k === 'postgres-wal-reader' ? 'postgres-wal' : k === 'postgres-reader' ? 'postgres-jdbc' : k === 'oracle-reader' ? 'oracle-jdbc' : null;

  return {
    id: adp.adapterKey || adp.id,
    name: adp.name,
    sub: adp.description || adp.sub || (adp.adapterType === 'READER' ? 'Source Reader' : 'Target Writer'),
    dbType,
    badge,
    alias,
    adapterKey: adp.adapterKey || adp.id,
    adapterType: adp.adapterType,
    supportedMode: adp.supportedMode,
    configSchema: adp.configSchema || [],
  };
};

export const isDbAdapter = (id = '') => id.includes('oracle') || id.includes('postgres') || id.includes('spanner') || id.includes('bigquery') || id.includes('bigtable');

export const getExpectedDbType = (id = '') => {
  if (id.includes('oracle')) return 'ORACLE';
  if (id.includes('postgres')) return 'POSTGRESQL';
  if (id.includes('spanner')) return 'SPANNER';
  if (id.includes('bigquery')) return 'BIGQUERY';
  if (id.includes('bigtable')) return 'BIGTABLE';
  return null;
};
