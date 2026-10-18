import React, { useEffect, useState } from 'react';
import { parseErrorDetails, formatErrorTimestamp } from '../../utils/errorLogParser';
import ErrorRemediationCard from './ErrorRemediationCard';
import ErrorSourcePayload from './ErrorSourcePayload';

export const ErrorDetailDrawer = ({ error, onClose }) => {
  const [displayedError, setDisplayedError] = useState(error);
  const isOpen = Boolean(error);

  useEffect(() => {
    if (error) setDisplayedError(error);
  }, [error]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!displayedError && !isOpen) return null;
  const d = parseErrorDetails(displayedError?.message, displayedError?.type);

  return (
    <>
      <div
        id="error-detail-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.35)',
          backdropFilter: 'blur(3px)', zIndex: 1040, opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
      <div
        id="error-detail-drawer"
        style={{
          position: 'fixed', top: 0, right: 0, height: '100vh',
          width: '560px', maxWidth: '100vw', background: '#ffffff',
          display: 'flex', flexDirection: 'column', zIndex: 1050,
          boxShadow: isOpen ? '-8px 0 32px rgba(0, 0, 0, 0.18)' : 'none',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
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
              <span>{displayedError?.sourceTable} → {displayedError?.targetTable}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-semibold text-slate-800">Location</span>
              <span className="font-mono">Chunk #{displayedError?.chunk ?? 0} · Row #{displayedError?.row ?? 1}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-semibold text-slate-800">Logged At</span>
              <span className="font-mono">{formatErrorTimestamp(displayedError?.timestamp)}</span>
            </div>
          </div>

          <ErrorRemediationCard remediation={d.remediation} docUrl={d.docUrl} constraint={d.constraint} conflict={d.conflict} />

          <div className="bg-slate-900 rounded-xl p-3 text-xs font-mono text-slate-200 overflow-x-auto">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-sans font-semibold">Technical Diagnostic / Stack Trace</div>
            <pre className="text-rose-300 whitespace-pre-wrap break-all leading-relaxed">{displayedError?.message}</pre>
          </div>

          <ErrorSourcePayload sourceData={displayedError?.sourceData} />
        </div>
      </div>
    </>
  );
};

export default ErrorDetailDrawer;
