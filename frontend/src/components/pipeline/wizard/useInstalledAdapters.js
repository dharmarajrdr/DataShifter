import { useEffect, useState } from 'react';
import { adapterApi } from '../../../services/adapterApi';
import { marketplaceApi } from '../../../services/marketplaceApi';
import {
  DEFAULT_INSTALLED_SOURCES,
  DEFAULT_INSTALLED_TARGETS,
  formatAdapterForDropdown,
} from './adapterConstants';

/**
 * Hook to dynamically load installed source and target adapters (<= 100 lines).
 */
export const useInstalledAdapters = (config, setConfig) => {
  const [sourceAdapters, setSourceAdapters] = useState(DEFAULT_INSTALLED_SOURCES);
  const [targetAdapters, setTargetAdapters] = useState(DEFAULT_INSTALLED_TARGETS);

  useEffect(() => {
    let mounted = true;

    const loadInstalled = async () => {
      try {
        const [adpRes, mktRes] = await Promise.allSettled([
          adapterApi.getAll(),
          marketplaceApi.getCatalog(),
        ]);

        const rawAdapters = adpRes.status === 'fulfilled' ? (adpRes.value?.data || []) : [];
        const mktItems = mktRes.status === 'fulfilled' ? (mktRes.value?.data || mktRes.value?.items || []) : [];
        const purchasedMkt = mktItems.filter((i) => i.purchased || i.isPurchased);

        const map = new Map();
        rawAdapters.forEach((a) => {
          const k = a.adapterKey || a.id;
          if (k) map.set(k, a);
        });
        purchasedMkt.forEach((m) => {
          const k = m.adapterKey || m.id;
          if (k && !map.has(k)) map.set(k, m);
        });

        if (!mounted || map.size === 0) return;

        const all = Array.from(map.values()).map(formatAdapterForDropdown);
        const sources = all.filter(
          (a) => a.adapterType === 'READER' || a.supportedMode === 'CDC' || (!a.adapterType && a.id.includes('reader'))
        );
        const targets = all.filter(
          (a) => a.adapterType === 'WRITER' || (!a.adapterType && a.id.includes('writer'))
        );

        if (sources.length > 0) {
          setSourceAdapters(sources);
          if (setConfig && !sources.some((s) => s.id === config?.sourceAdapter || s.alias === config?.sourceAdapter)) {
            const first = sources[0];
            const isCdc = first.supportedMode === 'CDC' || first.id.includes('wal') || first.id.includes('trail');
            setConfig((prev) => ({
              ...prev,
              sourceAdapter: first.id,
              pipelineMode: isCdc ? 'CDC' : 'BATCH',
            }));
          }
        }

        if (targets.length > 0) {
          setTargetAdapters(targets);
          if (setConfig && !targets.some((t) => t.id === config?.targetAdapter)) {
            setConfig((prev) => ({ ...prev, targetAdapter: targets[0].id }));
          }
        }
      } catch {
        // Retain fallback defaults
      }
    };

    loadInstalled();
    return () => { mounted = false; };
  }, [config?.sourceAdapter, config?.targetAdapter, setConfig]);

  return { sourceAdapters, targetAdapters };
};

export default useInstalledAdapters;
