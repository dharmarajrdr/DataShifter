import React from 'react';
import { Button } from '../common';

const FORMAT_META = {
  HTML: { tag: 'HTML', cls: 'bg-purple-50 text-purple-700' },
  MARKDOWN: { tag: 'MD', cls: 'bg-blue-50 text-blue-700' },
  JSON: { tag: 'JSON', cls: 'bg-emerald-50 text-emerald-700' },
  STANDARD: { tag: 'TXT', cls: 'bg-amber-50 text-amber-700' },
};

export const NotifyHubTemplateList = ({
  templates = [], onEdit, onDelete, onNewTemplate,
}) => {
  if (templates.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center text-xl mx-auto mb-3">
          <i className="fa-solid fa-envelope-open-text" />
        </div>
        <p className="text-base font-bold text-slate-900 mb-1">No notification templates configured</p>
        <p className="text-xs text-slate-500 mb-4">Create reusable templates with dynamic variables like {'{{pipelineName}}'}, {'{{status}}'}, etc.</p>
        <Button variant="primary" onClick={onNewTemplate}>+ Add Alert Template</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {templates.map((tmpl) => {
        const fmtKey = (tmpl.format || 'STANDARD').toUpperCase();
        const meta = FORMAT_META[fmtKey] || FORMAT_META.STANDARD;
        const varMatches = tmpl.body?.match(/\{\{([^}]+)\}\}/g) || [];
        const varCount = varMatches.length;

        return (
          <div key={tmpl.id} id={`template-card-${tmpl.id}`} className="card bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${meta.cls}`}>{meta.tag}</div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold border bg-slate-100 text-slate-700 border-slate-200 uppercase font-mono">
                  {tmpl.format || 'STANDARD'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-3 truncate" title={tmpl.name}>{tmpl.name}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate" title={tmpl.subject || 'Standard alert payload'}>
                {tmpl.subject || 'Standard alert payload'}
              </p>
              <div className="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-mono text-slate-600 line-clamp-2 min-h-[38px]" title={tmpl.body}>
                {tmpl.body || 'No template body defined'}
              </div>
            </div>

            <div className="mt-3.5 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Vars: <strong className="text-slate-700 font-semibold">{varCount} dynamic</strong></span>
              <div className="flex items-center gap-2">
                <button type="button" id={`template-edit-${tmpl.id}`} onClick={() => onEdit(tmpl)} className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] cursor-pointer">
                  Configure
                </button>
                <button type="button" id={`template-delete-${tmpl.id}`} onClick={() => onDelete(tmpl)} className="text-slate-400 hover:text-rose-600 transition-colors p-1" title="Delete Template">
                  <i className="fa-solid fa-trash-can text-[11px]" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotifyHubTemplateList;
