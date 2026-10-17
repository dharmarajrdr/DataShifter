import React, { useState } from 'react';
import { parseErrorDetails, formatErrorTimestamp } from '../../utils/errorLogParser';

export const ErrorLogEntry = ({ error, onOpenDetails }) => {
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
    <div
      className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden transition-all hover:border-slate-300 hover:shadow-xs mb-3 cursor-pointer"
      onClick={() => onOpenDetails?.(error)}
    >
      <div className="p-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/40">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 font-mono">
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
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xs"
            title="Copy error message"
          >
            {copied ? '✓' : '📋'}
          </button>
          <button
            type="button"
            onClick={() => onOpenDetails?.(error)}
            className="px-3 py-1 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/70 transition-all flex items-center gap-1"
          >
            <span>Details</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-3.5 py-2 text-xs text-slate-600 truncate">
        <span>{d.cleanMessage}</span>
      </div>
    </div>
  );
};

export default ErrorLogEntry;
