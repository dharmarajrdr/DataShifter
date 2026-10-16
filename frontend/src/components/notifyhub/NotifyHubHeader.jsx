import React from 'react';
import { Button } from '../common';

export const NotifyHubHeader = ({
  id = 'notifyhub-header',
  className = '',
  activeTab = 'channels',
  onNewListener,
  onNewChannel,
  onNewTemplate,
  onSendTestAlert,
  channelCount = 0,
  listenerCount = 0,
}) => {
  const getPrimaryAction = () => {
    if (activeTab === 'channels') return { label: '+ Add Channel', onClick: onNewChannel };
    if (activeTab === 'templates') return { label: '+ Create Template', onClick: onNewTemplate };
    return { label: '+ Add Event Listener', onClick: onNewListener };
  };

  const primary = getPrimaryAction();

  return (
    <div id={id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none ${className}`}>
      <div id={`${id}-heading-group`} className="space-y-1">
        <h1 id={`${id}-title`} className="text-2xl font-bold tracking-tight text-slate-900">
          NotifyHub Alerting & Integrations
        </h1>
        <p id={`${id}-subtitle`} className="text-sm text-slate-500">
          Configure delivery webhooks, failure notification channels, and automated event listeners.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div id={`${id}-stats-badge`} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-subtle">
          <span>Active:</span>
          <strong className="text-brand font-bold">{channelCount} Channels</strong>
          <span className="text-slate-400">• {listenerCount} Listeners</span>
        </div>
        <Button id={`${id}-btn-test`} variant="secondary" size="md" onClick={onSendTestAlert}>
          Send Test Alert
        </Button>
        <Button id={`${id}-btn-primary`} variant="primary" size="md" onClick={primary.onClick}>
          {primary.label}
        </Button>
      </div>
    </div>
  );
};

export default NotifyHubHeader;
