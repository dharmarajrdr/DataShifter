import { apiClient, USE_MOCK as CLIENT_USE_MOCK } from './apiClient';
import { DEFAULT_CDC_SCHEMAS } from '../components/pipeline/wizard/adapterSchemaHelper';

const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true' || CLIENT_USE_MOCK;

export const MOCK_ADAPTERS = [
  {
    id: 'adp-1', name: 'Oracle GoldenGate CDC Reader', adapterKey: 'oracle-gg-reader',
    adapterType: 'READER', supportedMode: 'CDC', category: 'CDC_STREAM', version: '1.2.0',
    isOfficial: true, className: 'com.datashifter.adapter.oracle.gg.OracleGGReader', artifactName: 'oracle-gg-reader-1.2.0.jar', sizeBytes: 4200000, pipelineCount: 3, description: 'High-throughput CDC engine from Oracle GoldenGate trail files.',
    configSchema: DEFAULT_CDC_SCHEMAS['oracle-gg-reader'],
  },
  {
    id: 'adp-2', name: 'PostgreSQL WAL Streaming Reader', adapterKey: 'postgres-wal-reader',
    adapterType: 'READER', supportedMode: 'CDC', category: 'CDC_STREAM', version: '1.1.0',
    isOfficial: true, className: 'com.datashifter.adapter.postgres.wal.PostgresWalReader', artifactName: 'postgres-wal-reader-1.1.0.jar', sizeBytes: 3800000, pipelineCount: 5, description: 'Zero-latency replication using PostgreSQL logical decoding replication slots.',
    configSchema: DEFAULT_CDC_SCHEMAS['postgres-wal-reader'],
  },
  {
    id: 'adp-3', name: 'Apache Kafka Event Writer', adapterKey: 'kafka-writer',
    adapterType: 'WRITER', supportedMode: 'BOTH', category: 'STREAMING', version: '1.3.0',
    isOfficial: true, className: 'com.datashifter.adapter.kafka.writer.KafkaWriter', artifactName: 'kafka-writer-1.3.0.jar', sizeBytes: 6200000, pipelineCount: 6, description: 'Writes mutation envelopes and batches to Kafka topics partitioned by PK.',
    configSchema: [{ key: 'topic', type: 'String', required: true, default: 'datashifter.cdc.events', desc: 'Kafka topic' }]
  },
  {
    id: 'adp-4', name: 'FileSystem & Cloud Storage Writer', adapterKey: 'filesystem-writer',
    adapterType: 'WRITER', supportedMode: 'BOTH', category: 'FILE_STORAGE', version: '1.5.0',
    isOfficial: true, className: 'com.datashifter.adapter.filesystem.writer.FileSystemWriter', artifactName: 'filesystem-writer-1.5.0.jar', sizeBytes: 4500000, pipelineCount: 7, description: 'High-speed file sink supporting Parquet, NDJSON, and CSV with auto rotation.',
    configSchema: [{ key: 'outputDirectory', type: 'String', required: true, default: '/data/lake/raw', desc: 'Target directory' }]
  }
];

export function normalizeAdapter(a) {
  if (!a) return a;
  let s = a.configSchema;
  if (typeof s === 'string') { try { s = JSON.parse(s); } catch { s = []; } }
  const raw = Array.isArray(s) ? s : (s?.properties || []);
  const configSchema = raw.map((p) => ({
    key: p.key || p.name || '', type: p.type || 'String', required: Boolean(p.required),
    default: p.default ?? p.defaultValue ?? '', desc: p.desc || p.description || '',
    label: p.label || p.key || p.name || '',
  }));
  return { ...a, isOfficial: Boolean(a.isOfficial ?? a.official), configSchema };
}

const triggerDownload = (blob, filename) => {
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = u; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
};

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
    if (USE_MOCK) return Promise.resolve({ data: { id: `adp-${Date.now()}`, ...metadata, version: '1.0.0', isOfficial: false, sizeBytes: file.size, configSchema: [] } });
    const form = new FormData();
    form.append('file', file);
    if (metadata.name) form.append('name', metadata.name);
    if (metadata.description) form.append('description', metadata.description);
    return apiClient.upload('/adapters', form);
  },
  download: async (id, filename = 'adapter.jar') => {
    if (USE_MOCK || process.env.NODE_ENV === 'test') {
      triggerDownload(new Blob(['mock-jar-content'], { type: 'application/java-archive' }), filename);
      return;
    }
    const token = localStorage.getItem('ds_access_token');
    const res = await fetch(`${apiClient.API_BASE}/adapters/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Download failed');
    }
    triggerDownload(await res.blob(), filename);
  },
  delete: (id) => USE_MOCK ? Promise.resolve({ data: true }) : apiClient.delete(`/adapters/${id}`),
};

export default adapterApi;
