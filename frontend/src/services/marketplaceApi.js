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
  const isPg = k.includes('postgres');
  const isOra = k.includes('oracle');
  const isKf = k.includes('kafka');
  const isFs = k.includes('file');
  return {
    id: item.id,
    adapterKey: item.adapterKey,
    name: item.name,
    desc: item.description || '',
    category: ['streaming', 'messaging'].includes(item.category) ? 'Streaming' : item.category === 'storage' ? 'Storage' : 'Databases',
    role: item.supportedMode === 'CDC' || item.adapterType === 'READER' ? 'SOURCE' : item.adapterType === 'WRITER' ? 'TARGET' : 'BIDIRECTIONAL',
    installed: Boolean(item.purchased || item.isPurchased),
    version: 'v1.0.0',
    author: 'DataShifter Certified',
    avatarText: isPg ? 'PG' : isOra ? 'ORA' : isKf ? 'KFK' : isFs ? 'FS' : 'ADP',
    bg: isPg ? 'bg-emerald-50 text-emerald-700' : isOra ? 'bg-rose-50 text-rose-700' : isKf ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700',
    protocols: ['JDBC', 'Direct Stream'],
    features: ['Pluggable JAR', 'Schema Discovery', 'Zero Downtime'],
  };
}

export default marketplaceApi;
