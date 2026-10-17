import React from 'react';
import { EVENT_CATALOG, PRIORITIES } from './eventCatalogConstants';

export const EventListenerFormFields = ({
  name, setName, resourceType, setResourceType,
  eventKey, setEventKey, channelId, setChannelId,
  templateId, setTemplateId, priority, setPriority,
  channels = [], templates = [],
}) => {
  const currentResource = EVENT_CATALOG.find((r) => r.resourceType === resourceType) || EVENT_CATALOG[0];

  return (
    <div className="space-y-3.5">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Listener Name <span className="text-rose-600">*</span></label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Notify Slack on Pipeline Failure" className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Resource Scope</label>
          <select value={resourceType} onChange={(e) => { setResourceType(e.target.value); const cat = EVENT_CATALOG.find((c) => c.resourceType === e.target.value); if (cat?.events?.[0]) setEventKey(cat.events[0].key); }} className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600">
            {EVENT_CATALOG.map((cat) => (<option key={cat.resourceType} value={cat.resourceType}>{cat.resourceName}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Trigger Event</label>
          <select value={eventKey} onChange={(e) => setEventKey(e.target.value)} className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600">
            {currentResource.events.map((ev) => (<option key={ev.key} value={ev.key}>{ev.label} ({ev.key})</option>))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Channel <span className="text-rose-600">*</span></label>
          <select value={channelId} onChange={(e) => setChannelId(e.target.value)} className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600">
            <option value="">Select Target Channel...</option>
            {channels.map((ch) => (<option key={ch.id} value={ch.id}>{ch.name} ({ch.channelType})</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Alert Template (Optional)</label>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600">
            <option value="">Default Standard Template</option>
            {templates.map((tmpl) => (<option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Dispatch Priority Level</label>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600">
          {PRIORITIES.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
        </select>
      </div>
    </div>
  );
};

export default EventListenerFormFields;
