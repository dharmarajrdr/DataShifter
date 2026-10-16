import React from 'react';
import { Button } from '../common';

export const NotifyHubHeader = ({
  id = 'notifyhub-header',
  activeTab = 'channels',
  onNewListener,
  onNewChannel,
  onNewTemplate,
  onSendTestAlert,
}) => {
  const getPrimaryAction = () => {
    if (activeTab === 'channels') return { label: 'Add Channel', onClick: onNewChannel };
    if (activeTab === 'templates') return { label: 'Create Template', onClick: onNewTemplate };
    return { label: 'Add Event Listener', onClick: onNewListener };
  };

  const primary = getPrimaryAction();

  return (
    <div
      id={id}
      className="ds-notifyhub-header flex items-center justify-between flex-wrap gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs"
    >
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-600 flex items-center justify-center text-lg shrink-0 shadow-xs">
          <svg className="w-6 h-6 stroke-current fill-none" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 id={`${id}-title`} className="text-lg font-bold text-slate-900 leading-tight">
              NotifyHub Alerting & Integrations
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Reliability Core
            </span>
          </div>
          <p id={`${id}-subtitle`} className="text-xs text-slate-500 mt-0.5">
            Configure delivery webhooks, failure notification channels, and on-call escalation rules
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          id={`${id}-btn-test`}
          variant="secondary"
          onClick={onSendTestAlert}
          title="Send a test notification across active channels"
        >
          <svg className="w-3.5 h-3.5 mr-1.5 stroke-current fill-none inline" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          Send Test Alert
        </Button>
        <Button id={`${id}-btn-primary`} variant="primary" onClick={primary.onClick}>
          <svg className="w-3.5 h-3.5 mr-1.5 stroke-current fill-none inline" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {primary.label}
        </Button>
      </div>
    </div>
  );
};

export default NotifyHubHeader;
