import React from 'react';
import { Button } from '../common';

export const NotifyHubHeader = ({
  id = 'notifyhub-header',
  activeTab,
  onNewListener,
  onNewChannel,
  onNewTemplate,
}) => {
  return (
    <div
      id={id}
      className="ds-notifyhub-header flex items-center justify-between flex-wrap gap-4 bg-white border border-slate-200 rounded-xl p-5 mb-5 shadow-xs"
    >
      <div>
        <h1 id={`${id}-title`} className="text-xl font-bold text-slate-900 leading-tight">
          NotifyHub
        </h1>
        <p id={`${id}-subtitle`} className="text-xs text-slate-500 mt-1">
          Centralized notification manager for channels, reusable templates, and multi-resource event listeners.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {activeTab === 'listeners' && (
          <Button id={`${id}-btn-new-listener`} variant="primary" onClick={onNewListener}>
            <i className="fa-solid fa-plus mr-1.5" />
            New Event Listener
          </Button>
        )}
        {activeTab === 'channels' && (
          <Button id={`${id}-btn-new-channel`} variant="primary" onClick={onNewChannel}>
            <i className="fa-solid fa-plus mr-1.5" />
            New Channel
          </Button>
        )}
        {activeTab === 'templates' && (
          <Button id={`${id}-btn-new-template`} variant="primary" onClick={onNewTemplate}>
            <i className="fa-solid fa-plus mr-1.5" />
            New Template
          </Button>
        )}
      </div>
    </div>
  );
};

export default NotifyHubHeader;
