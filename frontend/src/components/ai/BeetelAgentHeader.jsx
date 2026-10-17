import React from 'react';
import { Button } from '../common';

export const BeetelAgentHeader = ({
  id = 'beetel-agent-header',
  className = '',
  engineLabel = 'Claude 3.5 Sonnet',
  onNewSession,
  onConfigureKeys,
}) => {
  return (
    <div
      id={id}
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none ${className}`}
    >
      <div id={`${id}-heading-group`} className="space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 id={`${id}-title`} className="text-2xl font-bold tracking-tight text-slate-900">
            Beetel Agent Studio
          </h1>
          <span
            id={`${id}-status-badge`}
            className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Engine Active: {engineLabel}
          </span>
        </div>
        <p id={`${id}-subtitle`} className="text-sm text-slate-500">
          Autonomous AI Copilot for natural language pipeline synthesis, schema migration, and SQL validation
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          id={`${id}-btn-keys`}
          variant="secondary"
          onClick={onConfigureKeys}
          title="Configure AI API keys"
        >
          <svg className="w-3.5 h-3.5 mr-1.5 stroke-current fill-none inline" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
          AI API Keys
        </Button>
        <Button id={`${id}-btn-new`} variant="primary" onClick={onNewSession}>
          <svg className="w-3.5 h-3.5 mr-1.5 stroke-current fill-none inline" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Session
        </Button>
      </div>
    </div>
  );
};

export default BeetelAgentHeader;
