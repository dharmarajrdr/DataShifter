import React, { useState } from 'react';
import { Button, Toggle } from '../common';
import { CloseIcon } from '../layout/Icons';
import { notifyHubApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import EventListenerFormFields from './EventListenerFormFields';

export const EventListenerModal = ({ listener, channels = [], templates = [], onClose, onSave }) => {
  const notification = useNotification();
  const isEdit = !!listener;

  const [name, setName] = useState(listener?.name || '');
  const [resourceType, setResourceType] = useState(listener?.resourceType || 'PIPELINE');
  const [eventKey, setEventKey] = useState(listener?.eventKey || 'pipeline.failed');
  const [channelId, setChannelId] = useState(listener?.channelId || (channels[0]?.id || ''));
  const [templateId, setTemplateId] = useState(listener?.templateId || '');
  const [priority, setPriority] = useState(listener?.priority || 'CRITICAL');
  const [enabled, setEnabled] = useState(listener ? listener.enabled : true);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return notification.error('Listener name is required.');
    if (!channelId) return notification.error('Target channel destination is required.');

    setSaving(true);
    try {
      const payload = {
        name: name.trim(), resourceType, eventKey, channelId,
        templateId: templateId || undefined, priority, enabled,
      };
      if (isEdit) await notifyHubApi.updateListener(listener.id, payload);
      else await notifyHubApi.createListener(payload);
      notification.success(`Listener "${name}" ${isEdit ? 'updated' : 'created'} successfully`);
      onSave();
    } catch (err) {
      notification.error(err.message || 'Failed to save event listener');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <h3 className="text-base font-semibold text-slate-900">{isEdit ? 'Edit Event Listener' : 'Add Event Listener'}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"><CloseIcon /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <EventListenerFormFields
            name={name} setName={setName} resourceType={resourceType} setResourceType={setResourceType}
            eventKey={eventKey} setEventKey={setEventKey} channelId={channelId} setChannelId={setChannelId}
            templateId={templateId} setTemplateId={setTemplateId} priority={priority} setPriority={setPriority}
            channels={channels} templates={templates}
          />

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800">Listener Active</p>
              <p className="text-[11px] text-slate-500">Automatically dispatch notifications when event triggers</p>
            </div>
            <Toggle checked={enabled} onChange={setEnabled} />
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : (isEdit ? 'Update Listener' : 'Create Listener')}</Button>
        </div>
      </form>
    </div>
  );
};

export default EventListenerModal;
