import React from 'react';

export const TemplatePreviewSection = ({ preview }) => {
  if (!preview) return null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Live Rendered Preview</span>
        <span className="text-[10px] text-slate-400 font-mono">Sample Context</span>
      </div>
      {preview.renderedSubject && (
        <div className="text-xs font-semibold text-slate-900 bg-white p-2 rounded border border-slate-200 truncate">
          {preview.renderedSubject}
        </div>
      )}
      <div className="text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
        {preview.renderedBody || 'No preview body generated'}
      </div>
    </div>
  );
};

export default TemplatePreviewSection;
