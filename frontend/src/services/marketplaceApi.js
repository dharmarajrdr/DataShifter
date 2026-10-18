import { apiClient } from './apiClient';

/**
 * Service for Marketplace Catalog, 1-Click Install and Uninstall (<= 100 lines).
 */
export const marketplaceApi = {
  getCatalog: (params = {}) => apiClient.get('/marketplace/catalog', { params }),

  getItem: (id) => apiClient.get(`/marketplace/items/${id}`),

  install: (id) => apiClient.post(`/marketplace/items/${id}/install`, {}),

  uninstall: (id) => apiClient.post(`/marketplace/items/${id}/uninstall`, {}),
};

export function mapCatalogItem(item) {
  const k = item.adapterKey || '';
  const isPg = k.includes('postgres'); const isOra = k.includes('oracle');
  const isKf = k.includes('kafka'); const isFs = k.includes('file');
  const isSpanner = k.includes('spanner'); const isBq = k.includes('bigquery'); const isBt = k.includes('bigtable');
  const avatarText = isPg ? 'PG' : isOra ? 'ORA' : isKf ? 'KFK' : isFs ? 'FS' : isSpanner ? 'SPAN' : isBq ? 'BQ' : isBt ? 'BT' : 'ADP';
  const bg = isPg ? 'bg-emerald-50 text-emerald-700' : isOra ? 'bg-rose-50 text-rose-700' : isKf ? 'bg-amber-50 text-amber-700' : isSpanner ? 'bg-indigo-50 text-indigo-700' : isBq ? 'bg-blue-50 text-blue-700' : isBt ? 'bg-purple-50 text-purple-700' : 'bg-surface-100 text-content-primary';
  const category = ['streaming', 'messaging'].includes(item.category) ? 'Streaming' : item.category === 'storage' ? 'Storage' : (isBq ? 'Data Warehouses' : isBt ? 'NoSQL' : 'Databases');
  const permissions = item.permissions || (isPg ? 'ALTER USER datashifter WITH REPLICATION;\nGRANT SELECT ON ALL TABLES IN SCHEMA public TO datashifter;' : isOra ? 'GRANT LOGMINING TO c##datashifter;\nGRANT SELECT ON V_$LOGMNR_CONTENTS TO c##datashifter;' : isSpanner ? 'roles/spanner.databaseUser, roles/spanner.viewer' : isBq ? 'roles/bigquery.dataEditor, roles/bigquery.jobUser' : isBt ? 'roles/bigtable.user, roles/bigtable.reader' : 'GRANT USAGE ON SCHEMA public TO datashifter;');
  return {
    id: item.id, adapterKey: item.adapterKey, name: item.name, desc: item.description || '',
    category, role: item.supportedMode === 'CDC' || item.adapterType === 'READER' ? 'SOURCE' : item.adapterType === 'WRITER' ? 'TARGET' : 'BIDIRECTIONAL',
    installed: Boolean(item.purchased || item.isPurchased), version: 'v1.0.0', author: 'DataShifter Certified',
    avatarText, bg, protocols: isSpanner ? ['gRPC', 'Spanner API'] : isBq ? ['Storage Write API', 'Arrow'] : isBt ? ['gRPC', 'Bigtable Data API'] : ['JDBC', 'Direct Stream'],
    features: ['Pluggable JAR', 'Schema Discovery', 'Zero Downtime'], permissions,
  };
}

export default marketplaceApi;
