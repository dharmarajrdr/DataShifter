import React from 'react';
import { Card, Button } from '../common';
import { CHANNEL_TYPES, parseChannelConfig } from './channelConfigConstants';

export const NotifyHubChannelList = ({ channels = [], onEdit, onDelete, onNewChannel }) => {
  if (channels.length === 0) {
    return (
      <Card id="channels-empty-card" variant="outlined" className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
        <p className="font-semibold text-slate-700">No notification channels configured</p>
        <p className="text-xs mt-1 text-slate-500">Connect Slack, Email, Microsoft Teams, Zoho Cliq, or Webhook endpoints.</p>
        <Button variant="primary" size="sm" className="mt-4" onClick={onNewChannel}>+ Add Channel</Button>
      </Card>
    );
  }

  return (
    <div id="channels-grid" className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {channels.map((ch) => {
        const typeCfg = CHANNEL_TYPES.find((t) => t.value === ch.channelType) || {
          tag: 'WH', tagCls: 'bg-indigo-50 text-indigo-700 border-indigo-100', sub: 'Custom Webhook',
        };
        const cfg = parseChannelConfig(ch);
        const active = ch.enabled !== false;
        const totalDispatched = ch.dispatchedCount ?? (ch.stats?.dispatched ?? 0);
        const scope = cfg.scope || ch.scope || 'All Severity Levels';

        return (
          <Card
            key={ch.id}
            id={`channel-card-${ch.id}`}
            variant="elevated"
            padding={false}
            className={`p-4 flex flex-col justify-between transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card bg-white border ${
              active ? 'border-slate-200 ring-1 ring-slate-100' : 'border-slate-200 opacity-90'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs select-none border ${typeCfg.tagCls}`}>
                  {typeCfg.tag}
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide ${
                  active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {active ? 'Active' : 'Paused'}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 truncate" title={ch.name}>
                  {ch.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                  {typeCfg.sub} • {totalDispatched} Dispatched
                </p>
                <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">
                  Scope: {scope}. Auto-routes incident alerts to destination endpoints.
                </p>
              </div>
            </div>

            <div className="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {ch.channelType}
              </span>
              <div className="flex items-center gap-1.5">
                <Button id={`channel-edit-${ch.id}`} variant="ghost" size="sm" onClick={() => onEdit(ch)}>
                  Configure
                </Button>
                <button
                  type="button"
                  id={`channel-delete-${ch.id}`}
                  onClick={() => onDelete(ch)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                  title="Delete Channel"
                >
                  <i className="fa-solid fa-trash-can text-xs" />
                </button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default NotifyHubChannelList;
