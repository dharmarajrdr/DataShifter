import React from 'react';

export const WorkflowFilterToolbar = ({
  id = 'workflow-filter-toolbar',
  className = '',
  namespaces = [],
  selectedNamespace = 'ALL',
  onSelectNamespace,
  searchQuery = '',
  onSearchChange,
}) => {
  const nsOptions = [
    { id: 'ALL', name: 'All Namespaces' },
    { id: 'DEFAULT', name: 'Default' },
    ...namespaces,
  ];

  return (
    <div
      id={id}
      className={`ds-workflow-filters-bar flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-3.5 py-2 shrink-0 ${className}`}
    >
      <div id={`${id}-left`} className="ds-filters-left flex items-center gap-1.5 flex-wrap">
        {nsOptions.map((ns) => {
          const isSel = selectedNamespace === ns.id;
          return (
            <button
              key={ns.id}
              id={`${id}-ns-${ns.id}`}
              type="button"
              onClick={() => onSelectNamespace(ns.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer inline-flex items-center gap-1.5 font-medium ${
                isSel
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {ns.color && (
                <span
                  id={`${id}-dot-${ns.id}`}
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: ns.color }}
                />
              )}
              <span id={`${id}-name-${ns.id}`}>{ns.name}</span>
            </button>
          );
        })}
      </div>

      <div id={`${id}-right`} className="ds-filters-right flex items-center gap-2.5">
        <div id={`${id}-search-box`} className="relative w-64">
          <i
            id={`${id}-search-icon`}
            className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
          />
          <input
            id={`${id}-search-input`}
            type="text"
            aria-label="Search workflows or member pipelines"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            placeholder="Search workflows or member pipelines..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default WorkflowFilterToolbar;
