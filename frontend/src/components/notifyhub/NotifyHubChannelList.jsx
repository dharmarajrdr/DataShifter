import React from 'react';
import { Button } from '../common';
import { CHANNEL_TYPES, parseChannelConfig } from './channelConfigConstants';

export const NotifyHubChannelList = ({ channels = [], onEdit, onDelete, onNewChannel }) => {
  if (channels.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center text-xl mx-auto mb-3">
          <i className="fa-solid fa-bullhorn" />
        </div>
        <p className="text-base font-bold text-slate-900 mb-1">No notification channels configured</p>
        <p className="text-xs text-slate-500 mb-4">Add your team's Slack, Email, Microsoft Teams, Zoho Cliq, or custom Webhook endpoints.</p>
        <Button variant="primary" onClick={onNewChannel}>+ Add Channel</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {channels.map((ch) => {
        const typeCfg = CHANNEL_TYPES.find((t) => t.value === ch.channelType) || {
          tag: 'WH', tagCls: 'bg-indigo-50 text-indigo-700', sub: 'Custom Webhook',
        };
        const cfg = parseChannelConfig(ch);
        const active = ch.enabled !== false;
        const totalDispatched = ch.dispatchedCount ?? (ch.stats?.dispatched ?? 0);
        const scope = cfg.scope || ch.scope || 'On Error / Halt';

        return (
          <div
            key={ch.id}
            id={`channel-card-${ch.id}`}
            className="card bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${typeCfg.tagCls}`}>
                  {typeCfg.tag}
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {active ? 'Active' : 'Paused'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-3 truncate" title={ch.name}>
                {ch.name}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate" title={`${typeCfg.sub} • ${scope}`}>
                {typeCfg.sub} • {scope}
              </p>
            </div>

            <div className="mt-3.5 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Total Dispatched: {totalDispatched}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id={`channel-edit-${ch.id}`}
                  onClick={() => onEdit(ch)}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] cursor-pointer"
                >
                  Configure
                </button>
                <button
                  type="button"
                  id={`channel-delete-${ch.id}`}
                  onClick={() => onDelete(ch)}
                  className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                  title="Delete Channel"
                >
                  <i className="fa-solid fa-trash-can text-[11px]" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotifyHubChannelList;
