import React from 'react';
import { Card, Badge, Button } from '../../components/common';

/**
 * Placeholder view for the Adapter Marketplace (Phase 4 destination) (<= 100 lines).
 */
export const MarketplacePlaceholder = ({
  id = 'marketplace-page',
  className = '',
}) => {
  return (
    <div
      id={id}
      className={`p-6 max-w-5xl mx-auto space-y-6 ${className}`}
    >
      <div id="marketplace-header" className="flex items-center justify-between">
        <div id="marketplace-title-group" className="space-y-1">
          <div id="marketplace-badge-group" className="flex items-center gap-2">
            <h1 id="marketplace-heading" className="text-2xl font-bold text-slate-900 tracking-tight">
              Adapter Marketplace
            </h1>
            <Badge id="marketplace-phase-badge" variant="primary" size="sm">
              Phase 4 Ready
            </Badge>
          </div>
          <p id="marketplace-desc" className="text-sm text-slate-500">
            Discover, install, and configure certified source & target connectors for DataShifter.
          </p>
        </div>
      </div>

      <Card id="marketplace-card" variant="elevated" className="p-8 text-center">
        <div id="marketplace-card-content" className="max-w-md mx-auto space-y-4">
          <div
            id="marketplace-icon-wrapper"
            className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm"
          >
            <svg id="marketplace-icon-svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 id="marketplace-subheading" className="text-lg font-semibold text-slate-800">
            Marketplace Foundation Ready
          </h2>
          <p id="marketplace-card-desc" className="text-sm text-slate-600 leading-relaxed">
            The modern navigation shell is now in place. Phase 4 will introduce full connector search, registry filters, and one-click installations.
          </p>
          <div id="marketplace-card-actions" className="pt-2 flex justify-center gap-3">
            <Button
              id="marketplace-view-pipelines-btn"
              className="marketplace-action-btn"
              variant="primary"
              size="md"
              onClick={() => { window.location.href = '/pipelines'; }}
            >
              Go to Pipelines
            </Button>
            <Button
              id="marketplace-docs-btn"
              className="marketplace-action-btn"
              variant="outline"
              size="md"
              onClick={() => { window.location.href = '/docs'; }}
            >
              Browse Docs
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MarketplacePlaceholder;
