import React, { useEffect } from 'react';
import { parseErrorDetails, formatErrorTimestamp } from '../../utils/errorLogParser';
import ErrorRemediationCard from './ErrorRemediationCard';
import ErrorSourcePayload from './ErrorSourcePayload';

export const ErrorDetailDrawer = ({ error, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (error) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [error, onClose]);

  if (!error) return null;
  const d = parseErrorDetails(error.message, error.type);

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-screen w-full sm:w-[540px] max-w-full bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-out">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 font-mono">
              {d.code}
            </span>
            <h2 className="text-sm font-bold text-slate-800">Error Diagnostic Details</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors text-lg"
            title="Close details (Esc)"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-semibold text-slate-800">Entity Mapping</span>
              <span>{error.sourceTable} → {error.targetTable}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-semibold text-slate-800">Location</span>
              <span className="font-mono">Chunk #{error.chunk ?? 0} · Row #{error.row ?? 1}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-semibold text-slate-800">Logged At</span>
              <span className="font-mono">{formatErrorTimestamp(error.timestamp)}</span>
            </div>
          </div>

          <ErrorRemediationCard
            remediation={d.remediation}
            docUrl={d.docUrl}
            constraint={d.constraint}
            conflict={d.conflict}
          />

          <div className="bg-slate-900 rounded-xl p-3 text-xs font-mono text-slate-200 overflow-x-auto">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-sans font-semibold">
              Technical Diagnostic / Stack Trace
            </div>
            <pre className="text-rose-300 whitespace-pre-wrap break-all leading-relaxed">{error.message}</pre>
          </div>

          <ErrorSourcePayload sourceData={error.sourceData} />
        </div>
      </div>
    </>
  );
};

export default ErrorDetailDrawer;
