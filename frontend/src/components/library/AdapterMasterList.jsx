import React from 'react';
import { Search } from 'lucide-react';

export const AdapterMasterList = ({
  adapters = [], selectedId, onSelectAdapter, searchQuery,
  onSearchChange, typeFilter, onTypeFilterChange,
}) => {
  return (
    <aside id="adapter-master-pane" className="w-full md:w-80 lg:w-96 border-r border-surface-200 bg-white flex flex-col flex-shrink-0 h-full font-sans">
      <div id="adapter-master-toolbar" className="p-4 border-b border-surface-200 flex flex-col gap-3 bg-white">
        <div id="adapter-search-wrap" className="relative">
          <Search id="adapter-search-icon" className="w-4 h-4 text-content-tertiary absolute left-3 top-2.5 pointer-events-none" />
          <input
            id="adapter-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search adapters by key, name..."
            className="w-full pl-9 pr-3 py-2 text-xs font-sans bg-surface-50 border border-surface-300 rounded-lg text-content-primary placeholder-content-tertiary focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all"
          />
        </div>

        <div id="adapter-filter-pills" className="flex items-center gap-1.5 flex-wrap">
          {['ALL', 'READER', 'WRITER', 'CDC'].map((mode) => (
            <button
              key={mode}
              id={`adapter-filter-${mode.toLowerCase()}`}
              type="button"
              onClick={() => onTypeFilterChange(mode)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                typeFilter === mode
                  ? 'bg-brand-600 text-white font-semibold'
                  : 'bg-surface-100 text-content-secondary hover:text-content-primary hover:bg-surface-200'
              }`}
            >
              {mode === 'ALL' ? 'All' : mode === 'READER' ? 'Readers' : mode === 'WRITER' ? 'Writers' : 'CDC'}
            </button>
          ))}
        </div>
      </div>

      <div id="adapter-items-list" className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {adapters.length === 0 ? (
          <div id="adapter-items-empty" className="p-6 text-center text-xs text-content-tertiary">
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
                className={`p-3 rounded-lg border cursor-pointer transition-all relative flex flex-col gap-1.5 ${
                  isSelected ? 'bg-brand-50 border-brand-300 shadow-subtle' : 'bg-white border-surface-200 hover:bg-surface-50 hover:border-surface-300'
                }`}
              >
                {isSelected && <span id={`adapter-item-active-bar-${adp.id}`} className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-brand-600 rounded-r" />}
                <div id={`adapter-row-top-${adp.id}`} className="flex items-center justify-between gap-2">
                  <span id={`adapter-name-${adp.id}`} className="text-xs font-semibold text-content-primary truncate">{adp.name}</span>
                  {adp.isOfficial ?
                    <i id={`adapter-official-badge-${adp.id}`} className='fa fa-check-circle text-blue-700 text-xs flex-shrink-0' title='Official Adapter' /> :
                    <i id={`adapter-custom-badge-${adp.id}`} className='fa fa-certificate text-orange-400 text-xs flex-shrink-0' title='Custom Adapter' />
                  }
                </div>
                <div id={`adapter-key-${adp.id}`} className="text-xs text-content-secondary truncate mt-0.5 tabular-nums">{adp.adapterKey}</div>
                <div id={`adapter-row-bottom-${adp.id}`} className="flex items-center gap-2 mt-1 pt-1.5 border-t border-surface-100">
                  <span id={`adapter-type-pill-${adp.id}`} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center ${adp.adapterType === 'READER' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                    {adp.adapterType}
                  </span>
                  {adp.supportedMode === 'CDC' && (
                    <span id={`adapter-mode-pill-${adp.id}`} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center bg-amber-50 text-amber-700 border-amber-200">CDC</span>
                  )}
                  <span id={`adapter-version-${adp.id}`} className="text-[11px] text-content-tertiary ml-auto tabular-nums">v{adp.version}</span>
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
