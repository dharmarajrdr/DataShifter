import React from 'react';
import { Button } from '../common';
import { BeetelIcon } from '../layout/Icons';
import { AGENT } from '../../constants/literals';

const POOL_LABELS = {
  USER: { label: 'Personal Keys', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ORG: { label: 'Org Keys', bg: 'bg-sky-50 text-sky-700 border-sky-200' },
  SYSTEM: { label: 'System Pool', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  OLLAMA_FALLBACK: { label: 'Local Ollama', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export const BeetelAgentHeader = ({
  id = 'beetel-agent-header',
  keyStatus,
  onNewChat,
  onConfigureKeys,
}) => {
  const pool = POOL_LABELS[keyStatus?.activePool] || POOL_LABELS.SYSTEM;

  return (
    <div
      id={id}
      className="ds-agent-header flex items-center justify-between flex-wrap gap-4 bg-white border border-slate-200 rounded-xl p-5 mb-4 shadow-xs"
    >
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 shadow-xs">
          <BeetelIcon color="#4F46E5" size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 id={`${id}-title`} className="text-xl font-bold text-slate-900 leading-tight">
              {AGENT.title}
            </h1>
            <span
              id={`${id}-pool-badge`}
              onClick={onConfigureKeys}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border cursor-pointer transition hover:opacity-80 ${pool.bg}`}
              title="Click to configure AI API keys"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {pool.label}
            </span>
          </div>
          <p id={`${id}-subtitle`} className="text-xs text-slate-500 mt-0.5">
            {AGENT.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          id={`${id}-btn-new`}
          variant="primary"
          onClick={onNewChat}
        >
          <i className="fa-solid fa-plus mr-1.5" />
          {AGENT.newChat}
        </Button>
      </div>
    </div>
  );
};

export default BeetelAgentHeader;
