import React from 'react';

/**
 * Filter controls bar with search query input, role selector, and sort dropdown (<= 100 lines).
 */
export const MarketplaceFilters = ({
  id = 'marketplace-filters',
  className = '',
  searchQuery = '',
  onSearchChange,
  roleFilter = 'ALL',
  onRoleChange,
  sortMode = 'popular',
  onSortChange,
}) => {
  return (
    <div
      id={id}
      className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${className}`}
    >
      <div id="marketplace-search-wrapper" className="relative flex-1 max-w-md">
        <input
          id="marketplace-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search connectors by name, protocol, or role..."
          aria-label="Search connectors"
          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all"
        />
        <svg
          id="marketplace-search-icon"
          className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div id="marketplace-select-group" className="flex items-center gap-2 self-end sm:self-auto">
        <select
          id="marketplace-role-select"
          aria-label="Filter by role"
          value={roleFilter}
          onChange={(e) => onRoleChange(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="ALL">All Roles</option>
          <option value="SOURCE">Source Connectors</option>
          <option value="TARGET">Target Sinks</option>
          <option value="BIDIRECTIONAL">Bidirectional Only</option>
        </select>

        <select
          id="marketplace-sort-select"
          aria-label="Sort connectors"
          value={sortMode}
          onChange={(e) => onSortChange(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="popular">Most Popular</option>
          <option value="name">Alphabetical (A–Z)</option>
          <option value="installed">Installed First</option>
        </select>
      </div>
    </div>
  );
};

export default MarketplaceFilters;
