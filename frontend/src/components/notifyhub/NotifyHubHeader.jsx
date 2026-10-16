import React from 'react';
import { Button } from '../common';

export const NotifyHubHeader = ({
  id = 'notifyhub-header',
  activeTab = 'listeners',
  onNewListener,
  onNewChannel,
  onNewTemplate,
  onSendTestAlert,
}) => {
  const getPrimaryAction = () => {
    if (activeTab === 'channels') {
      return { label: 'Add Channel', icon: 'fa-solid fa-plus', onClick: onNewChannel };
    }
    if (activeTab === 'templates') {
      return { label: 'Create Template', icon: 'fa-solid fa-plus', onClick: onNewTemplate };
    }
    return { label: 'Add Event Listener', icon: 'fa-solid fa-plus', onClick: onNewListener };
  };

  const primary = getPrimaryAction();

  return (
    <div
      id={id}
      className="ds-notifyhub-header flex items-center justify-between flex-wrap gap-4 bg-white border border-slate-200 rounded-xl p-5 mb-5 shadow-xs"
    >
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center text-lg flex-shrink-0 shadow-xs">
          <i className="fa-solid fa-bell" />
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
          <i className="fa-regular fa-paper-plane mr-1.5" />
          Send Test Alert
        </Button>
        <Button id={`${id}-btn-primary`} variant="primary" onClick={primary.onClick}>
          <i className={`${primary.icon} mr-1.5`} />
          {primary.label}
        </Button>
      </div>
    </div>
  );
};

export default NotifyHubHeader;
