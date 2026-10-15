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

  return (
    <Card
      id={cardId}
      variant="elevated"
      className={`adapter-card p-5 flex flex-col justify-between cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card
        ${adapter.installed ? 'ring-1 ring-brand-200 border-brand-100 bg-white' : 'border-surface-200'} ${className}`}
      onClick={() => onInspect(adapter)}
    >
      <div id={`${cardId}-content`} className="space-y-3">
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
        className="pt-3.5 mt-3.5 border-t border-slate-100 flex items-center justify-between"
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
          className={adapter.installed ? 'text-slate-600 hover:text-rose-600 hover:bg-rose-50' : ''}
          onClick={(e) => {
            e.stopPropagation();
            onToggleInstall(adapter.id);
          }}
        >
          {adapter.installed ? 'Uninstall' : 'Install'}
        </Button>
      </div>
    </Card>
  );
};

export default MarketplaceCard;
