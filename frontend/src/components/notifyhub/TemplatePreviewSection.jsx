import React from 'react';

const SAMPLE_VARS = {
  pipeline_name: 'mysql_customer_cdc_sync',
  pipelineName: 'mysql_customer_cdc_sync',
  pipeline_id: 'pipe-cdc-8821',
  error_message: 'Deadlock encountered during sync; retry limit reached',
  errorMessage: 'Deadlock encountered during sync; retry limit reached',
  priority: 'CRITICAL',
  status: 'FAILED',
  timestamp: '2026-10-16 10:42:15 UTC',
  cluster: 'aws-us-east-1.datashifter.io',
  action_url: 'https://app.datashifter.io/pipelines/pipe-cdc-8821',
  date: '2026-10-16',
  activeCount: '14',
  totalRows: '42.8M',
  eventKey: 'pipeline.failed',
  resourceId: 'pipe-cdc-8821',
};

const interpolate = (text = '') =>
  text.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (_, k) => SAMPLE_VARS[k] || `[${k}]`);

export const TemplatePreviewSection = ({ subjectTemplate = '', bodyTemplate = '', preview }) => {
  const renderedSubject = preview?.sampleSubject || preview?.renderedSubject || interpolate(subjectTemplate);
  const renderedBody = preview?.sampleBody || preview?.renderedBody || interpolate(bodyTemplate);
  const detected = Array.from(new Set(`${subjectTemplate} ${bodyTemplate}`.match(/\{\{([^}]+)\}\}/g) || []));

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-full space-y-3">
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <i className="fa-solid fa-eye text-indigo-600 text-[11px]" />
            Live Rendered Preview
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Sample Pipeline Context
          </span>
        </div>

        <div className="mt-3 space-y-2.5">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400">Subject Preview:</span>
            <div className="text-xs font-semibold text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200 mt-1 break-words">
              {renderedSubject || '<Empty Subject>'}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400">Rendered Payload Body:</span>
            <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 font-mono whitespace-pre-wrap leading-relaxed mt-1 max-h-56 overflow-y-auto">
              {renderedBody || '<Empty Body>'}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200">
        <span className="text-[10px] font-semibold text-slate-500 block mb-1">Detected Variables ({detected.length}):</span>
        <div className="flex flex-wrap gap-1">
          {detected.length > 0 ? (
            detected.map((v) => (
              <span key={v} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-[10px] border border-indigo-100">
                {v}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-slate-400 italic">No variables detected yet</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplatePreviewSection;
