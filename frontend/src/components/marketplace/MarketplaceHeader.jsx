import React from 'react';

/**
 * Marketplace header presenting catalog title and installed statistics pill (<= 100 lines).
 */
export const MarketplaceHeader = ({
  id = 'marketplace-header',
  className = '',
  installedCount = 0,
  totalCount = 0,
}) => {
  return (
    <div
      id={id}
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none ${className}`}
    >
      <div id="marketplace-heading-group" className="space-y-1">
        <h1
          id="marketplace-title"
          className="text-2xl font-bold tracking-tight text-slate-900"
        >
          Adapter Marketplace
        </h1>
        <p
          id="marketplace-subtitle"
          className="text-sm text-slate-500"
        >
          Discover, install, and configure certified connectors for real-time CDC and batch replication.
        </p>
      </div>

      <div
        id="marketplace-stats-badge"
        className="self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-subtle"
      >
        <span id="marketplace-stats-label">Installed:</span>
        <strong id="marketplace-stats-count" className="text-brand font-bold">
          {installedCount}
        </strong>
        <span id="marketplace-stats-total" className="text-slate-400">
          / {totalCount} Connectors
        </span>
      </div>
    </div>
  );
};

export default MarketplaceHeader;
