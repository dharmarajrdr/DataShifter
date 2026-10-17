import React, { useState } from 'react';
import { parseErrorDetails, formatErrorTimestamp } from '../../utils/errorLogParser';
import ErrorRemediationCard from './ErrorRemediationCard';
import ErrorSourcePayload from './ErrorSourcePayload';

export const ErrorLogEntry = ({ error }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const d = parseErrorDetails(error.message, error.type);

  const copyText = (e) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(error.message || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all hover:border-slate-300 mb-4">
      <div
        className="p-4 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80 font-mono">
            {d.code}
          </span>
          <span className="text-xs font-semibold text-slate-800">
            {error.sourceTable} <span className="text-slate-400 font-normal">→</span> {error.targetTable}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[11px]">
            Chunk #{error.chunk ?? 0} · Row #{error.row ?? 1}
          </span>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-slate-400 font-mono">{formatErrorTimestamp(error.timestamp)}</span>
          <button
            type="button"
            onClick={copyText}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all text-xs"
            title="Copy error message"
          >
            {copied ? '✓' : '📋'}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5"
          >
            <span>{expanded ? 'Collapse' : 'Details'}</span>
            <svg className={`w-3.5 h-3.5 transform transition-transform ${expanded ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {!expanded && (
        <div
          className="px-4 py-2.5 bg-slate-50/20 text-xs text-slate-600 font-medium truncate cursor-pointer hover:bg-slate-50/60"
          onClick={() => setExpanded(true)}
        >
          <span className="font-mono text-slate-500 mr-1.5">{d.code}:</span>
          <span>{d.cleanMessage}</span>
        </div>
      )}

      {expanded && (
        <div className="p-4 space-y-3.5">
          <ErrorRemediationCard
            remediation={d.remediation}
            docUrl={d.docUrl}
            constraint={d.constraint}
            conflict={d.conflict}
          />
          <div className="bg-slate-900 rounded-xl p-3 text-xs font-mono text-slate-200 overflow-x-auto">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-sans font-semibold">Technical Diagnostic / Stack Trace</div>
            <pre className="text-rose-300 whitespace-pre-wrap break-all leading-relaxed">{error.message}</pre>
          </div>
          <ErrorSourcePayload sourceData={error.sourceData} />
        </div>
      )}
    </div>
  );
};

export default ErrorLogEntry;
