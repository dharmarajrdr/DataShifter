import React from 'react';
import { CATEGORIES } from './marketplaceData';

/**
 * Category filter pills bar with counts and active indicators (<= 100 lines).
 */
export const MarketplaceCategories = ({
  id = 'marketplace-categories',
  className = '',
  selectedCategory = 'ALL',
  onSelectCategory,
  counts = {},
}) => {
  return (
    <div
      id={id}
      role="tablist"
      aria-label="Connector categories"
      className={`flex items-center gap-2 flex-wrap pt-3 border-t border-slate-100 ${className}`}
    >
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat;
        const count = counts[cat] ?? 0;
        const catKey = cat.toLowerCase().replace(/\s+/g, '-');

        return (
          <button
            key={cat}
            id={`category-tab-${catKey}`}
            role="tab"
            aria-selected={isSelected}
            type="button"
            onClick={() => onSelectCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all select-none
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
              ${isSelected
                ? 'bg-brand text-white shadow-subtle'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}
          >
            <span>{cat === 'ALL' ? 'All Categories' : cat}</span>
            <span
              id={`category-count-${catKey}`}
              className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold
                ${isSelected ? 'bg-brand-700/50 text-white' : 'bg-slate-200/80 text-slate-500'}`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default MarketplaceCategories;
