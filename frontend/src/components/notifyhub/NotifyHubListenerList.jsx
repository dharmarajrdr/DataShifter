import React from 'react';
import { Card, Button } from '../common';

const RESOURCE_META = {
  PIPELINE: { tag: 'PL', cls: 'bg-blue-50 text-blue-700 border-blue-100' },
  WORKFLOW: { tag: 'WF', cls: 'bg-purple-50 text-purple-700 border-purple-100' },
  UDF: { tag: 'UDF', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
  CONNECTION: { tag: 'DB', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  BEETEL: { tag: 'AI', cls: 'bg-pink-50 text-pink-700 border-pink-100' },
  SETUP: { tag: 'CFG', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export const NotifyHubListenerList = ({
  listeners = [], channels = [], templates = [], onEdit, onDelete, onNewListener,
}) => {
  if (listeners.length === 0) {
    return (
      <Card id="listeners-empty-card" variant="outlined" className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
        <p className="font-semibold text-slate-700">No event listeners configured</p>
        <p className="text-xs mt-1 text-slate-500">Subscribe to pipeline failures, SLA breaches, and workflow lifecycle events.</p>
        <Button variant="primary" size="sm" className="mt-4" onClick={onNewListener}>+ Add Event Listener</Button>
      </Card>
    );
  }

  return (
    <div id="listeners-grid" className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {listeners.map((l) => {
        const meta = RESOURCE_META[l.resourceType] || { tag: 'EV', cls: 'bg-indigo-50 text-indigo-700 border-indigo-100' };
        const ch = channels.find((c) => c.id === l.channelId);
        const tmpl = templates.find((t) => t.id === l.templateId);
        const active = l.enabled !== false;

        return (
          <Card
            key={l.id}
            id={`listener-card-${l.id}`}
            variant="elevated"
            padding={false}
            className={`p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 ease-in-out hover:border-indigo-400 hover:shadow-md bg-white border ${
              active ? 'border-slate-200 ring-1 ring-slate-100' : 'border-slate-200 opacity-90'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs select-none border ${meta.cls}`}>
                  {meta.tag}
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide ${
                  active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {active ? 'Active' : 'Paused'}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 truncate" title={l.name}>{l.name}</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                  {l.resourceType} • {l.eventKey || 'ON_ANY_ERROR'}
                </p>
                <div className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  Route to <strong className="text-slate-800">{ch?.name || 'All Channels'}</strong> using <span className="font-mono text-slate-700">{tmpl?.name || 'Standard Alert'}</span>.
                </div>
              </div>
            </div>

            <div className="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {l.priority || 'CRITICAL'}
              </span>
              <div className="flex items-center gap-1.5">
                <Button id={`listener-edit-${l.id}`} variant="ghost" size="sm" onClick={() => onEdit(l)}>
                  Configure
                </Button>
                <button
                  type="button"
                  id={`listener-delete-${l.id}`}
                  onClick={() => onDelete(l)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                  title="Delete Listener"
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

export default NotifyHubListenerList;
