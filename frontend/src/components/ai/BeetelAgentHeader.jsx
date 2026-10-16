import React from 'react';
import { Button } from '../common';

export const BeetelAgentHeader = ({
  id = 'beetel-agent-header',
  engineLabel = 'Claude 3.5 Sonnet',
  onNewSession,
  onConfigureKeys,
}) => {
  return (
    <div
      id={id}
      className="card header-card bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between flex-wrap gap-4"
    >
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
          <svg className="w-6 h-6 stroke-current fill-none" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 2a2 2 0 0 1 2 2v2h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4V4a2 2 0 0 1 2-2z" />
            <circle cx="9" cy="13" r="1" />
            <circle cx="15" cy="13" r="1" />
            <path d="M10 17h4" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 id={`${id}-title`} className="text-lg font-bold text-slate-900 leading-tight">
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
          <p id={`${id}-subtitle`} className="text-xs text-slate-500 mt-0.5">
            Autonomous AI Copilot for natural language pipeline synthesis, schema migration, and SQL validation
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
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
