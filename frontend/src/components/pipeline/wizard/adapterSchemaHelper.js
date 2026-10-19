export const DEFAULT_CDC_SCHEMAS = {
  'postgres-wal-reader': [
    { key: 'walDirectory', label: 'WAL Directory', type: 'directory', required: true, default: '/var/lib/postgresql/data/pg_wal', desc: 'Directory containing PostgreSQL WAL files' },
    { key: 'filePattern', label: 'File Pattern', type: 'string', required: false, default: '000000010000.*', desc: 'WAL segment file pattern' },
    { key: 'startingLsn', label: 'Starting LSN', type: 'string', required: false, default: '', desc: 'Starting Log Sequence Number (empty for head)' },
    { key: 'slotName', label: 'Replication Slot', type: 'string', required: false, default: 'datashifter_cdc_slot', desc: 'Logical replication slot name' },
    { key: 'flushIntervalMs', label: 'Flush Interval (ms)', type: 'number', required: false, default: 200, desc: 'Flush interval in milliseconds' },
    { key: 'maxBatchSize', label: 'Max Batch Size', type: 'number', required: false, default: 500, desc: 'Maximum mutation events buffered per micro-batch' },
  ],
  'oracle-gg-reader': [
    { key: 'trailDirPath', label: 'Trail Directory', type: 'directory', required: true, default: '/u01/app/oracle/dirdat', desc: 'Trail files directory' },
    { key: 'filePattern', label: 'Trail File Pattern', type: 'string', required: false, default: 'aa.*', desc: 'Trail sequence file pattern' },
    { key: 'startingScn', label: 'Starting SCN / RBA', type: 'string', required: false, default: '', desc: 'Initial SCN or RBA offset' },
    { key: 'flushIntervalMs', label: 'Flush Interval (ms)', type: 'number', required: false, default: 200, desc: 'Flush interval in milliseconds' },
    { key: 'maxBatchSize', label: 'Max Batch Size', type: 'number', required: false, default: 500, desc: 'Maximum mutation events buffered per batch' },
  ],
};

export const normalizeSchemaProperties = (adp) => {
  if (!adp) return [];
  let raw = adp.configSchema;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = []; }
  }
  const list = Array.isArray(raw) ? raw : (raw?.properties || []);
  if (list.length > 0) {
    return list.map((p) => ({
      key: p.key || p.name || '',
      label: p.label || p.key || p.name || '',
      type: (p.type || 'string').toLowerCase(),
      required: Boolean(p.required),
      default: p.default ?? p.defaultValue ?? '',
      desc: p.desc || p.description || '',
    }));
  }
  const k = adp.adapterKey || adp.id || '';
  return DEFAULT_CDC_SCHEMAS[k] || DEFAULT_CDC_SCHEMAS[adp.alias] || [];
};

export const getPropertyValue = (config = {}, prop) => {
  const k = prop.key;
  if (config.sourceConfig && config.sourceConfig[k] !== undefined) return config.sourceConfig[k];
  if (config[k] !== undefined) return config[k];
  if (k === 'walDirectory' || k === 'trailDirPath') return config.cdcDirectoryPath ?? prop.default;
  if (k === 'filePattern') return config.cdcFilePattern ?? prop.default;
  if (k === 'startingLsn' || k === 'startingScn') return config.cdcStartingScn ?? prop.default;
  if (k === 'slotName') return config.cdcSlotName ?? prop.default;
  if (k === 'flushIntervalMs') return config.cdcFlushIntervalMs ?? prop.default;
  if (k === 'maxBatchSize') return config.cdcBatchSize ?? prop.default;
  return prop.default ?? '';
};

export const updateConfigProperty = (config = {}, propKey, val) => {
  const nextSrc = { ...(config.sourceConfig || {}), [propKey]: val };
  const updated = { ...config, sourceConfig: nextSrc, [propKey]: val };
  if (propKey === 'walDirectory' || propKey === 'trailDirPath') updated.cdcDirectoryPath = val;
  if (propKey === 'filePattern') updated.cdcFilePattern = val;
  if (propKey === 'startingLsn' || propKey === 'startingScn') updated.cdcStartingScn = val;
  if (propKey === 'slotName') updated.cdcSlotName = val;
  if (propKey === 'flushIntervalMs') updated.cdcFlushIntervalMs = Number(val);
  if (propKey === 'maxBatchSize') updated.cdcBatchSize = Number(val);
  return updated;
};
