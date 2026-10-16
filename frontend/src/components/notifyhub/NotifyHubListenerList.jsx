import React from 'react';
import { Button, StatusBadge } from '../common';
import { EVENT_CATALOG } from './EventListenerModal';

export const NotifyHubListenerList = ({
  listeners = [],
  channels = [],
  templates = [],
  onEdit,
  onDelete,
  onNewListener,
}) => {
  if (listeners.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center shadow-xs">
        <i className="fa-solid fa-bolt text-3xl text-slate-300 mb-3 block" />
        <p className="text-base font-bold text-slate-800 mb-1">No event listeners configured</p>
        <p className="text-xs text-slate-500 mb-4">Listen to platform events (pipeline error, workflow finished, etc.) and trigger notifications.</p>
        <Button variant="primary" onClick={onNewListener}>+ Add Event Listener</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {listeners.map((l) => {
        const cat = EVENT_CATALOG.find((c) => c.resourceType === l.resourceType);
        const matchedChannel = channels.find((c) => c.id === l.channelId);
        const matchedTemplate = templates.find((t) => t.id === l.templateId);

        return (
          <div key={l.id} id={`listener-card-${l.id}`} className="ds-listener-card bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 uppercase">
                  <i className={cat?.icon || 'fa-solid fa-bell'} />
                  {l.resourceType}
                </span>
                <StatusBadge status={l.enabled ? 'ACTIVE' : 'PAUSED'} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1 truncate" title={l.name}>{l.name}</h3>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs font-mono text-slate-700 mb-2 truncate">
                on {l.resourceType?.toLowerCase()} {l.eventAction?.toLowerCase()} ({l.eventKey})
              </div>
              <p className="text-xs text-slate-500 mb-3 line-clamp-2 min-h-[32px]">{l.description || 'No description provided'}</p>
              <div className="text-[11px] text-slate-500 space-y-1 mb-2 bg-slate-50/50 p-2 rounded border border-slate-100">
                <div className="truncate"><strong className="text-slate-700">Channel:</strong> {matchedChannel ? `${matchedChannel.name} (${matchedChannel.channelType})` : 'None'}</div>
                <div className="truncate"><strong className="text-slate-700">Template:</strong> {matchedTemplate ? matchedTemplate.name : 'Default'}</div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => onEdit(l)}>Edit</Button>
              <Button variant="danger" size="sm" onClick={() => onDelete(l)}>Delete</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotifyHubListenerList;
