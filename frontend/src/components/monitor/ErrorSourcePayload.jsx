import React, { useState } from 'react';

export const ErrorSourcePayload = ({ sourceData }) => {
  const [copied, setCopied] = useState(false);
  if (!sourceData) return null;

  let formatted = sourceData;
  try {
    const parsed = typeof sourceData === 'string' ? JSON.parse(sourceData) : sourceData;
    formatted = JSON.stringify(parsed, null, 2);
  } catch {
    formatted = String(sourceData);
  }

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200/90 overflow-hidden bg-slate-900 text-slate-100 shadow-2xs">
      <div className="bg-slate-800/90 px-4 py-2 flex items-center justify-between border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
          <span className="text-xs font-semibold text-slate-300">Source Row Data (Payload)</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs px-2.5 py-1 rounded bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
          title="Copy payload"
        >
          {copied ? '✓ Copied' : 'Copy JSON'}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono overflow-x-auto text-emerald-400 leading-relaxed max-h-60">
        <code>{formatted}</code>
      </pre>
    </div>
  );
};

export default ErrorSourcePayload;
