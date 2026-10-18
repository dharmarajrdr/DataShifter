import React from 'react';

export const ErrorRemediationCard = ({ remediation, docUrl, constraint, conflict }) => {
  if (!remediation && !docUrl && !constraint && !conflict) return null;

  return (
    <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-4 text-xs text-amber-950 space-y-2.5">
      <div className="flex items-center gap-2 font-semibold text-amber-900">
        <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Recommended Resolution & Diagnostics</span>
      </div>

      {remediation && (
        <p className="leading-relaxed text-slate-800">
          <strong className="text-amber-900">Solution: </strong>
          {remediation}
        </p>
      )}

      {(constraint || conflict || docUrl) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60 text-slate-700">
          {constraint && (
            <span className="px-2 py-0.5 rounded bg-white border border-amber-300 font-mono text-[11px]">
              Constraint: <strong className="text-slate-900">{constraint}</strong>
            </span>
          )}
          {conflict && (
            <span className="px-2 py-0.5 rounded bg-white border border-amber-300 font-mono text-[11px]">
              Conflicting: <strong className="text-rose-700">{conflict}</strong>
            </span>
          )}
          {docUrl && (
            <a
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-indigo-700 font-semibold hover:underline"
            >
              <span>Documentation</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorRemediationCard;
