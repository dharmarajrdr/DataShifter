import React, { useState } from 'react';
import { Button, Toggle } from '../common';
import { CloseIcon } from '../layout/Icons';
import { notifyHubApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { CHANNEL_TYPES, parseChannelConfig } from './channelConfigConstants';
import ChannelTypeConfigFields from './ChannelTypeConfigFields';

export const ChannelModal = ({ channel, onClose, onSave }) => {
  const notification = useNotification();
  const isEdit = !!channel;
  const cfg = parseChannelConfig(channel);

  const [name, setName] = useState(channel?.name || '');
  const [channelType, setChannelType] = useState(channel?.channelType || 'SLACK');
  const [enabled, setEnabled] = useState(channel ? channel.enabled : true);
  const [emailTo, setEmailTo] = useState(Array.isArray(cfg.to) ? cfg.to.join(', ') : (cfg.to || ''));
  const [emailFrom, setEmailFrom] = useState(cfg.from || '');
  const [webhookUrl, setWebhookUrl] = useState(cfg.webhookUrl || cfg.endpointUrl || cfg.url || '');
  const [authToken, setAuthToken] = useState(cfg.authToken || '');
  const [customHeaders, setCustomHeaders] = useState(cfg.headers ? JSON.stringify(cfg.headers, null, 2) : '{}');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return notification.error('Channel name is required.');
    if (channelType === 'EMAIL' && !emailTo.trim()) return notification.error('Email recipient (To) is required.');
    if (['SLACK', 'TEAMS', 'CLIQ', 'WEBHOOK'].includes(channelType) && !webhookUrl.trim()) {
      return notification.error('Webhook URL is required.');
    }

    let configJson = {};
    if (channelType === 'EMAIL') {
      configJson = { to: emailTo.split(',').map((x) => x.trim()).filter(Boolean), from: emailFrom.trim() || undefined };
    } else if (channelType === 'SLACK' || channelType === 'TEAMS') {
      configJson = { webhookUrl: webhookUrl.trim() };
    } else if (channelType === 'CLIQ') {
      configJson = { webhookUrl: webhookUrl.trim(), authToken: authToken.trim() || undefined };
    } else {
      let h = {};
      try { h = JSON.parse(customHeaders); } catch { return notification.error('Headers must be valid JSON'); }
      configJson = { endpointUrl: webhookUrl.trim(), headers: h };
    }

    setSaving(true);
    try {
      const payload = { name: name.trim(), channelType, configJson: JSON.stringify(configJson), enabled };
      if (isEdit) await notifyHubApi.updateChannel(channel.id, payload);
      else await notifyHubApi.createChannel(payload);
      notification.success(`Channel "${name}" ${isEdit ? 'updated' : 'created'} successfully`);
      onSave();
    } catch (err) { notification.error(err.message || 'Failed to save channel'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <h3 className="text-base font-semibold text-slate-900">{isEdit ? 'Edit Channel Configuration' : 'Add Channel Configuration'}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"><CloseIcon /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Channel Name <span className="text-rose-600">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. #data-pipeline-alerts" className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Channel Destination Type</label>
            <select value={channelType} onChange={(e) => setChannelType(e.target.value)} className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-600">
              {CHANNEL_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </div>

          <ChannelTypeConfigFields channelType={channelType} webhookUrl={webhookUrl} setWebhookUrl={setWebhookUrl} authToken={authToken} setAuthToken={setAuthToken} emailTo={emailTo} setEmailTo={setEmailTo} emailFrom={emailFrom} setEmailFrom={setEmailFrom} customHeaders={customHeaders} setCustomHeaders={setCustomHeaders} />

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800">Channel Active</p>
              <p className="text-[11px] text-slate-500">Allow listeners to dispatch notifications to this channel</p>
            </div>
            <Toggle checked={enabled} onChange={setEnabled} />
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : (isEdit ? 'Update Channel' : 'Create Channel')}</Button>
        </div>
      </form>
    </div>
  );
};

export default ChannelModal;
