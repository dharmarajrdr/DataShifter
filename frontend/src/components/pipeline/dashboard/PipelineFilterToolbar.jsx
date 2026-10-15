import React from 'react';
import PipelineNamespacePills from './PipelineNamespacePills';

export const PipelineFilterToolbar = ({
  id = 'pipeline-filter-toolbar',
  className = '',
  namespaces = [],
  selectedNamespaces = [],
  onToggleNamespace,
  onClearNamespaces,
  onCreateNamespaceClick,
  canCreateNamespace = false,
  search = '',
  onSearchChange,
  viewMode = 'grid',
  onViewModeChange,
}) => {
  return (
    <div
      id={id}
      className={`ds-pipeline-filters-bar flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-3.5 py-2 shrink-0 ${className}`}
    >
      <PipelineNamespacePills
        id={`${id}-pills`}
        namespaces={namespaces}
        selectedNamespaces={selectedNamespaces}
        onToggleNamespace={onToggleNamespace}
        onClearNamespaces={onClearNamespaces}
        onCreateNamespaceClick={onCreateNamespaceClick}
        canCreateNamespace={canCreateNamespace}
      />

      <div id={`${id}-right`} className="ds-filters-right flex items-center gap-2.5">
        <div id={`${id}-search-box`} className="ds-search-box relative w-56">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            id={`${id}-search-input`}
            type="text"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-indigo-500"
            placeholder="Search pipelines, tables..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div id={`${id}-view-toggle`} className="inline-flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
          <button
            id={`${id}-grid-view-btn`}
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`text-xs px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <i className="fa-solid fa-grip" />
            <span>Grid</span>
          </button>
          <button
            id={`${id}-table-view-btn`}
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`text-xs px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'table' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <i className="fa-solid fa-list" />
            <span>Table</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PipelineFilterToolbar;
