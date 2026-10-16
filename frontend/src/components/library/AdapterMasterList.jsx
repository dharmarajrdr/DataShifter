import React from 'react';
import { Search } from 'lucide-react';

export const AdapterMasterList = ({
  adapters = [],
  selectedId,
  onSelectAdapter,
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
}) => {
  return (
    <aside id="adapter-master-pane" className="w-full md:w-80 lg:w-96 border-r border-surface-200 bg-white flex flex-col flex-shrink-0 h-full">
      <div id="adapter-master-toolbar" className="p-3.5 border-b border-surface-200 space-y-2.5 bg-surface-50">
        <div id="adapter-search-wrap" className="relative">
          <input
            id="adapter-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search adapters (key, name)..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-surface-300 rounded-lg placeholder-content-tertiary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow"
          />
          <Search id="adapter-search-icon" className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-content-tertiary pointer-events-none" />
        </div>

        <div id="adapter-filter-pills" className="flex items-center gap-1.5 flex-wrap">
          {['ALL', 'READER', 'WRITER', 'CDC'].map((mode) => (
            <button
              key={mode}
              id={`adapter-filter-${mode.toLowerCase()}`}
              type="button"
              onClick={() => onTypeFilterChange(mode)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                typeFilter === mode
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-white border border-surface-200 text-content-secondary hover:bg-surface-100'
              }`}
            >
              {mode === 'ALL' ? 'All' : mode === 'READER' ? 'Readers' : mode === 'WRITER' ? 'Writers' : 'CDC Engines'}
            </button>
          ))}
        </div>
      </div>

      <div id="adapter-items-list" className="flex-1 overflow-y-auto divide-y divide-surface-100 p-2 space-y-1">
        {adapters.length === 0 ? (
          <div id="adapter-items-empty" className="p-8 text-center text-xs text-content-tertiary">
            No adapters match the current filter.
          </div>
        ) : (
          adapters.map((adp) => {
            const isSelected = adp.id === selectedId;
            return (
              <div
                key={adp.id}
                id={`adapter-item-${adp.id}`}
                onClick={() => onSelectAdapter(adp.id)}
                className={`p-3 rounded-xl cursor-pointer transition-all border ${
                  isSelected ? 'bg-brand-50/70 border-brand-200 shadow-xs' : 'bg-white border-transparent hover:border-surface-200 hover:bg-surface-50'
                }`}
              >
                <div id={`adapter-row-top-${adp.id}`} className="flex items-start justify-between gap-2">
                  <span id={`adapter-name-${adp.id}`} className="font-semibold text-xs text-content-primary truncate">{adp.name}</span>
                  {adp.isOfficial ? (
                    <span id={`adapter-official-badge-${adp.id}`} title="Official Built-in" className="text-brand-600 font-bold text-xs flex-shrink-0">✓</span>
                  ) : (
                    <span id={`adapter-custom-badge-${adp.id}`} className="text-[10px] bg-slate-100 px-1 rounded text-content-secondary">Custom</span>
                  )}
                </div>
                <div id={`adapter-key-${adp.id}`} className="font-mono text-[11px] text-content-secondary truncate mt-0.5">{adp.adapterKey}</div>
                <div id={`adapter-row-bottom-${adp.id}`} className="flex items-center gap-2 mt-2 pt-1.5 border-t border-surface-100/60">
                  <span id={`adapter-type-pill-${adp.id}`} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${adp.adapterType === 'READER' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                    {adp.adapterType}
                  </span>
                  {adp.supportedMode === 'CDC' && (
                    <span id={`adapter-mode-pill-${adp.id}`} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">CDC</span>
                  )}
                  <span id={`adapter-version-${adp.id}`} className="text-[10.5px] text-content-tertiary ml-auto font-mono">v{adp.version}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default AdapterMasterList;
