import React from 'react';

const CATEGORIES = [
  { id: 'ALL', label: 'All' },
  { id: 'RDBMS', label: 'RDBMS' },
  { id: 'CLOUD_DW', label: 'Cloud DW' },
  { id: 'STREAMING', label: 'Streaming' },
  { id: 'OBJECT_STORE', label: 'Object Store' },
];

export const ConnectionsFilterBar = ({
  selectedCategory = 'ALL',
  onCategoryChange,
  searchQuery = '',
  onSearchChange,
  categoryCounts = {},
  id = 'conn-filter-bar',
}) => {
  return (
    <div
      id={id}
      className="bg-white border border-slate-200 rounded-xl p-3 mb-5 shadow-xs flex items-center justify-between flex-wrap gap-3"
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.id;
          const count = categoryCounts[cat.id];
          return (
            <button
              key={cat.id}
              id={`${id}-tab-${cat.id.toLowerCase()}`}
              type="button"
              onClick={() => onCategoryChange?.(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                active
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
              }`}
            >
              <span>{cat.label}</span>
              {typeof count === 'number' && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    active ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="relative w-full sm:w-64">
        <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs pointer-events-none" />
        <input
          id={`${id}-search`}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search name, driver, or host..."
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
        />
      </div>
    </div>
  );
};

export default ConnectionsFilterBar;
