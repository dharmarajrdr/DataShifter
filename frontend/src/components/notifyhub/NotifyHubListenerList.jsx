import React from 'react';
import { Button } from '../common';

const RESOURCE_META = {
  PIPELINE: { tag: 'PL', cls: 'bg-blue-50 text-blue-700' },
  WORKFLOW: { tag: 'WF', cls: 'bg-purple-50 text-purple-700' },
  UDF: { tag: 'UDF', cls: 'bg-amber-50 text-amber-700' },
  CONNECTION: { tag: 'DB', cls: 'bg-emerald-50 text-emerald-700' },
  BEETEL: { tag: 'AI', cls: 'bg-pink-50 text-pink-700' },
  SETUP: { tag: 'CFG', cls: 'bg-slate-100 text-slate-700' },
};

export const NotifyHubListenerList = ({
  listeners = [], channels = [], templates = [], onEdit, onDelete, onNewListener,
}) => {
  if (listeners.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center text-xl mx-auto mb-3">
          <i className="fa-solid fa-bolt" />
        </div>
        <p className="text-base font-bold text-slate-900 mb-1">No event listeners configured</p>
        <p className="text-xs text-slate-500 mb-4">Listen to platform events (pipeline error, workflow finished, etc.) and trigger notifications.</p>
        <Button variant="primary" onClick={onNewListener}>+ Add Event Listener</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {listeners.map((l) => {
        const meta = RESOURCE_META[l.resourceType] || { tag: 'EV', cls: 'bg-indigo-50 text-indigo-700' };
        const ch = channels.find((c) => c.id === l.channelId);
        const tmpl = templates.find((t) => t.id === l.templateId);
        const active = l.enabled !== false;

        return (
          <div key={l.id} id={`listener-card-${l.id}`} className="card bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${meta.cls}`}>{meta.tag}</div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {active ? 'Active' : 'Paused'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-3 truncate" title={l.name}>{l.name}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate" title={`${l.eventKey || l.resourceType} • ${l.priority || 'CRITICAL'}`}>
                {l.eventKey || l.resourceType} • {l.priority || 'CRITICAL'}
              </p>
              <div className="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600 space-y-1">
                <div className="truncate"><span className="text-slate-400">Target:</span> <strong className="text-slate-700 ml-1">{ch?.name || 'All Channels'}</strong></div>
                <div className="truncate"><span className="text-slate-400">Template:</span> <span className="text-slate-700 ml-1">{tmpl?.name || 'Standard Alert'}</span></div>
              </div>
            </div>

            <div className="mt-3.5 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Priority: <strong className="text-slate-700 font-semibold">{l.priority || 'CRITICAL'}</strong></span>
              <div className="flex items-center gap-2">
                <button type="button" id={`listener-edit-${l.id}`} onClick={() => onEdit(l)} className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] cursor-pointer">
                  Configure
                </button>
                <button type="button" id={`listener-delete-${l.id}`} onClick={() => onDelete(l)} className="text-slate-400 hover:text-rose-600 transition-colors p-1" title="Delete Listener">
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

export default NotifyHubListenerList;
