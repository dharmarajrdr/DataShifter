import React from 'react';
import { Card, Badge, Button } from '../common';

/**
 * Interactive adapter card with install action and inspect trigger (<= 100 lines).
 */
export const MarketplaceCard = ({
  id,
  className = '',
  adapter,
  onToggleInstall,
  onInspect,
}) => {
  const cardId = id || `adapter-card-${adapter.id}`;
  const isBlocked = Boolean(adapter.installed && (adapter.refCount || 0) > 0);

  return (
    <Card
      id={cardId}
      variant="elevated"
      padding={false}
      className={`adapter-card p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-200 ease-in-out hover:border-indigo-400 hover:shadow-md
        ${adapter.installed ? 'ring-1 ring-brand-200 border-brand-100 bg-white' : 'border-surface-200'} ${className}`}
      onClick={() => onInspect(adapter)}
    >
      <div id={`${cardId}-content`} className="space-y-2.5">
        <div id={`${cardId}-header`} className="flex items-start justify-between gap-2">
          <div
            id={`${cardId}-avatar`}
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs tracking-tight select-none ${adapter.bg}`}
          >
            {adapter.avatarText}
          </div>
          <Badge
            id={`${cardId}-status`}
            variant={adapter.installed ? 'primary' : 'neutral'}
            size="sm"
          >
            {adapter.installed ? 'Installed' : 'Available'}
          </Badge>
        </div>

        <div id={`${cardId}-title-group`}>
          <h3 id={`${cardId}-name`} className="font-bold text-sm text-slate-900 truncate">
            {adapter.name}
          </h3>
          <p id={`${cardId}-meta`} className="text-xs text-slate-500 font-medium">
            {adapter.category} • {adapter.version}
          </p>
          <p id={`${cardId}-desc`} className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">
            {adapter.desc}
          </p>
        </div>
      </div>

      <div
        id={`${cardId}-footer`}
        className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between"
      >
        <span
          id={`${cardId}-role`}
          className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
        >
          {adapter.role}
        </span>

        <Button
          id={`${cardId}-action-btn`}
          variant={adapter.installed ? 'ghost' : 'primary'}
          size="sm"
          disabled={isBlocked}
          title={isBlocked ? `Cannot uninstall: Referenced by ${adapter.refCount} pipeline(s)` : undefined}
          className={adapter.installed ? (isBlocked ? 'text-slate-400 cursor-not-allowed opacity-60' : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50') : ''}
          onClick={(e) => {
            e.stopPropagation();
            if (!isBlocked) onToggleInstall(adapter.id);
          }}
        >
          {isBlocked && (
            <svg id={`${cardId}-lock-icon`} className="w-3 h-3 mr-1 inline-block text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" strokeWidth="2" />
            </svg>
          )}
          {adapter.installed ? 'Uninstall' : 'Install'}
        </Button>
      </div>
    </Card>
  );
};

export default MarketplaceCard;
