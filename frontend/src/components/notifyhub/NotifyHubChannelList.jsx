import React, { useState } from 'react';
import { Button } from '../common';
import { notifyHubApi } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

const TYPE_CONFIG = {
  SLACK: { icon: 'fa-brands fa-slack', cls: 'bg-pink-50 text-pink-700 border-pink-200' },
  EMAIL: { icon: 'fa-solid fa-envelope', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  TEAMS: { icon: 'fa-solid fa-people-group', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  CLIQ: { icon: 'fa-solid fa-comments', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  WEBHOOK: { icon: 'fa-solid fa-network-wired', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
};

export const NotifyHubChannelList = ({
  channels = [],
  onEdit,
  onDelete,
  onNewChannel,
}) => {
  const notification = useNotification();
  const [testingId, setTestingId] = useState(null);

  const handleTest = async (channel) => {
    setTestingId(channel.id);
    try {
      await notifyHubApi.testChannel(channel.id);
      notification.success(`Test alert sent to ${channel.name}`);
    } catch (err) {
      notification.error(err.message || 'Failed to send test alert');
    } finally {
      setTestingId(null);
    }
  };

  if (channels.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center shadow-xs">
        <i className="fa-solid fa-bullhorn text-3xl text-slate-300 mb-3 block" />
        <p className="text-base font-bold text-slate-800 mb-1">No notification channels configured</p>
        <p className="text-xs text-slate-500 mb-4">Add your team's Slack, Email, Microsoft Teams, Zoho Cliq or custom Webhook endpoints.</p>
        <Button variant="primary" onClick={onNewChannel}>+ Create Channel Configuration</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {channels.map((ch) => {
        const typeCfg = TYPE_CONFIG[ch.channelType] || TYPE_CONFIG.WEBHOOK;
        let cfg = {};
        try { cfg = JSON.parse(ch.configJson || '{}'); } catch (e) {}

        return (
          <div key={ch.id} id={`channel-card-${ch.id}`} className="ds-channel-card bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 uppercase ${typeCfg.cls}`}>
                  <i className={`${typeCfg.icon} text-[10px]`} />
                  {ch.channelType}
                </span>
                <span className="text-[10px] font-mono text-slate-400">ID: {ch.id.slice(0, 8)}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 truncate" title={ch.name}>{ch.name}</h3>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-xs text-slate-600 mb-3 space-y-1">
                {ch.channelType === 'EMAIL' ? (
                  <p className="truncate"><strong className="text-slate-500">To:</strong> {Array.isArray(cfg.to) ? cfg.to.join(', ') : cfg.to || '—'}</p>
                ) : (
                  <p className="truncate font-mono text-[11px]"><strong className="text-slate-500">URL:</strong> {cfg.webhookUrl || cfg.endpointUrl || cfg.url || '—'}</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button onClick={() => handleTest(ch)} disabled={testingId === ch.id} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50">
                {testingId === ch.id ? 'Sending...' : 'Test Alert'}
              </button>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => onEdit(ch)}>Edit</Button>
                <Button variant="danger" size="sm" onClick={() => onDelete(ch)}>Delete</Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotifyHubChannelList;
