import { apiClient, USE_MOCK as CLIENT_USE_MOCK } from './apiClient';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true' || CLIENT_USE_MOCK;

export const MOCK_ADAPTERS = [
  {
    id: 'adp-1', name: 'Oracle GoldenGate CDC Reader', adapterKey: 'oracle-gg-reader',
    adapterType: 'READER', supportedMode: 'CDC', category: 'CDC_STREAM', version: '1.2.0',
    isOfficial: true, className: 'com.datashifter.adapter.oracle.gg.OracleGGReader',
    artifactName: 'oracle-gg-reader-1.2.0.jar', sizeBytes: 4200000, pipelineCount: 3,
    description: 'High-throughput CDC engine from Oracle GoldenGate trail files.',
    configSchema: [{ key: 'trailDirPath', type: 'String', required: true, default: '/u01/app/oracle/dirdat', desc: 'Trail files directory' }]
  },
  {
    id: 'adp-2', name: 'PostgreSQL WAL Streaming Reader', adapterKey: 'postgres-wal-reader',
    adapterType: 'READER', supportedMode: 'CDC', category: 'CDC_STREAM', version: '1.1.0',
    isOfficial: true, className: 'com.datashifter.adapter.postgres.wal.PostgresWalReader',
    artifactName: 'postgres-wal-reader-1.1.0.jar', sizeBytes: 3800000, pipelineCount: 5,
    description: 'Zero-latency replication using PostgreSQL logical decoding replication slots.',
    configSchema: [{ key: 'slotName', type: 'String', required: true, default: 'datashifter_slot', desc: 'Replication slot name' }]
  },
  {
    id: 'adp-3', name: 'Apache Kafka Event Writer', adapterKey: 'kafka-writer',
    adapterType: 'WRITER', supportedMode: 'BOTH', category: 'STREAMING', version: '1.3.0',
    isOfficial: true, className: 'com.datashifter.adapter.kafka.writer.KafkaWriter',
    artifactName: 'kafka-writer-1.3.0.jar', sizeBytes: 6200000, pipelineCount: 6,
    description: 'Writes mutation envelopes and batches to Kafka topics partitioned by PK.',
    configSchema: [{ key: 'topic', type: 'String', required: true, default: 'datashifter.cdc.events', desc: 'Kafka topic' }]
  },
  {
    id: 'adp-4', name: 'FileSystem & Cloud Storage Writer', adapterKey: 'filesystem-writer',
    adapterType: 'WRITER', supportedMode: 'BOTH', category: 'FILE_STORAGE', version: '1.5.0',
    isOfficial: true, className: 'com.datashifter.adapter.filesystem.writer.FileSystemWriter',
    artifactName: 'filesystem-writer-1.5.0.jar', sizeBytes: 4500000, pipelineCount: 7,
    description: 'High-speed file sink supporting Parquet, NDJSON, and CSV with auto rotation.',
    configSchema: [{ key: 'outputDirectory', type: 'String', required: true, default: '/data/lake/raw', desc: 'Target directory' }]
  }
];

export function normalizeAdapter(a) {
  if (!a) return a;
  let s = a.configSchema;
  if (typeof s === 'string') {
    try { s = JSON.parse(s); } catch { s = []; }
  }
  const raw = Array.isArray(s) ? s : (s?.properties || []);
  const configSchema = raw.map(p => ({
    key: p.key || p.name || '',
    type: p.type || 'String',
    required: Boolean(p.required),
    default: p.default ?? p.defaultValue ?? '',
    desc: p.desc || p.description || '',
  }));
  return { ...a, isOfficial: Boolean(a.isOfficial ?? a.official), configSchema };
}

export const adapterApi = {
  getAll: async (params = {}) => {
    if (USE_MOCK) return { data: MOCK_ADAPTERS.map(normalizeAdapter) };
    try {
      const res = await apiClient.get('/adapters', { params });
      return { ...res, data: (res.data || []).map(normalizeAdapter) };
    } catch (e) {
      if (process.env.NODE_ENV === 'test') return { data: MOCK_ADAPTERS.map(normalizeAdapter) };
      throw e;
    }
  },
  getById: async (id) => {
    if (USE_MOCK) return { data: normalizeAdapter(MOCK_ADAPTERS.find(a => a.id === id) || MOCK_ADAPTERS[0]) };
    try {
      const res = await apiClient.get(`/adapters/${id}`);
      return { ...res, data: normalizeAdapter(res.data) };
    } catch (e) {
      if (process.env.NODE_ENV === 'test') return { data: normalizeAdapter(MOCK_ADAPTERS[0]) };
      throw e;
    }
  },
  upload: (file, metadata = {}) => {
    if (USE_MOCK) {
      const newAdapter = { id: `adp-${Date.now()}`, ...metadata, version: '1.0.0', isOfficial: false, sizeBytes: file.size, configSchema: [] };
      return Promise.resolve({ data: newAdapter });
    }
    const form = new FormData();
    form.append('file', file);
    if (metadata.name) form.append('name', metadata.name);
    if (metadata.description) form.append('description', metadata.description);
    return apiClient.upload('/adapters', form);
  },
  delete: (id) => USE_MOCK ? Promise.resolve({ data: true }) : apiClient.delete(`/adapters/${id}`),
};

export default adapterApi;
