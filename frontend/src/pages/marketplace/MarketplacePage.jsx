import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../components/common';
import {
  MarketplaceHeader, MarketplaceFilters, MarketplaceCategories,
  MarketplaceCard, MarketplaceDrawer, ADAPTER_REGISTRY,
} from '../../components/marketplace';
import { marketplaceApi, mapCatalogItem } from '../../services/marketplaceApi';
import { pipelineApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

/** Adapter Marketplace Catalog Page (<= 100 lines). */
export const MarketplacePage = ({ id = 'marketplace-page', className = '' }) => {
  const notification = useNotification();
  const [adapters, setAdapters] = useState(ADAPTER_REGISTRY);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [sortMode, setSortMode] = useState('popular');
  const [inspectedAdapter, setInspectedAdapter] = useState(null);

  useEffect(() => {
    Promise.all([marketplaceApi.getCatalog(), pipelineApi.getAll().catch(() => [])]).then(([cRes, pRes]) => {
      const list = cRes?.data || cRes?.items;
      const pipes = Array.isArray(pRes?.data) ? pRes.data : Array.isArray(pRes) ? pRes : [];
      if (Array.isArray(list) && list.length > 0) {
        setAdapters(list.map(mapCatalogItem).map((a) => {
          const k = a.adapterKey || a.id;
          const refCount = pipes.filter((p) => [p.sourceAdapterId, p.targetAdapterId].includes(k) || [p.sourceAdapterId, p.targetAdapterId].includes(a.id)).length;
          return { ...a, refCount };
        }));
      }
    }).catch(() => {});
  }, []);

  const toggleInstall = async (adapterId) => {
    const target = adapters.find((a) => a.id === adapterId || a.adapterKey === adapterId);
    if (!target) return;
    if (target.installed && (target.refCount || 0) > 0) {
      notification.error(`Cannot uninstall adapter '${target.name}': Referenced by ${target.refCount} pipeline(s)`);
      return;
    }
    const next = !target.installed;
    setAdapters((prev) => prev.map((a) => ((a.id === target.id || a.adapterKey === target.adapterKey) ? { ...a, installed: next } : a)));
    if (inspectedAdapter && (inspectedAdapter.id === target.id || inspectedAdapter.adapterKey === target.adapterKey)) {
      setInspectedAdapter((prev) => (prev ? { ...prev, installed: next } : null));
    }
    if (target.adapterKey) {
      try {
        if (next) await marketplaceApi.install(target.id);
        else await marketplaceApi.uninstall(target.id);
        notification.success(`Adapter '${target.name}' ${next ? 'installed' : 'uninstalled'} successfully`);
      } catch (err) {
        setAdapters((prev) => prev.map((a) => ((a.id === target.id || a.adapterKey === target.adapterKey) ? { ...a, installed: !next } : a)));
        notification.error(err.message || 'Operation failed');
      }
    }
  };
  const counts = useMemo(() => adapters.reduce((acc, a) => ({ ...acc, ALL: (acc.ALL || 0) + 1, [a.category]: (acc[a.category] || 0) + 1 }), {}), [adapters]);

  const filteredAdapters = useMemo(() => adapters.filter((a) => {
    const matchCat = selectedCategory === 'ALL' || a.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q);
    const matchRole = roleFilter === 'ALL' || a.role === roleFilter || a.role === 'BIDIRECTIONAL';
    return matchCat && matchSearch && matchRole;
  }).sort((a, b) => sortMode === 'name' ? a.name.localeCompare(b.name) : sortMode === 'installed' ? (b.installed ? 1 : 0) - (a.installed ? 1 : 0) : 0), [adapters, selectedCategory, searchQuery, roleFilter, sortMode]);

  return (
    <>
      <div id={id} className={`w-full max-w-7xl mx-auto space-y-6 ${className}`}>
        <MarketplaceHeader installedCount={adapters.filter((a) => a.installed).length} totalCount={adapters.length} />
        <Card id="marketplace-controls-card" variant="elevated" padding={false} className="p-4 space-y-4">
          <MarketplaceFilters searchQuery={searchQuery} onSearchChange={setSearchQuery} roleFilter={roleFilter} onRoleChange={setRoleFilter} sortMode={sortMode} onSortChange={setSortMode} />
          <MarketplaceCategories selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} counts={counts} />
        </Card>
        {filteredAdapters.length === 0 ? (
          <Card id="marketplace-empty-card" variant="outlined" className="p-12 text-center text-slate-500">
            <p className="font-semibold text-slate-700">No connectors match your criteria</p>
            <p className="text-xs mt-1">Try modifying your search keywords or switching category filters.</p>
          </Card>
        ) : (
          <div id="marketplace-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAdapters.map((adapter) => (
              <MarketplaceCard key={adapter.id} adapter={adapter} onToggleInstall={toggleInstall} onInspect={setInspectedAdapter} />
            ))}
          </div>
        )}
      </div>
      <MarketplaceDrawer adapter={inspectedAdapter} isOpen={Boolean(inspectedAdapter)} onClose={() => setInspectedAdapter(null)} onToggleInstall={toggleInstall} />
    </>
  );
};

export default MarketplacePage;
