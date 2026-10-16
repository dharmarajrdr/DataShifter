import React from 'react';
import { Card, Button } from '../common';

const FORMAT_META = {
  HTML: { tag: 'HTML', cls: 'bg-purple-50 text-purple-700 border-purple-100' },
  MARKDOWN: { tag: 'MD', cls: 'bg-blue-50 text-blue-700 border-blue-100' },
  JSON: { tag: 'JSON', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  STANDARD: { tag: 'TXT', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
};

export const NotifyHubTemplateList = ({
  templates = [], onEdit, onDelete, onNewTemplate,
}) => {
  if (templates.length === 0) {
    return (
      <Card id="templates-empty-card" variant="outlined" className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
        <p className="font-semibold text-slate-700">No alert templates configured</p>
        <p className="text-xs mt-1 text-slate-500">Create parameterized message templates with variables like {"{{pipelineName}}"} and {"{{status}}"}.</p>
        <Button variant="primary" size="sm" className="mt-4" onClick={onNewTemplate}>+ Create Template</Button>
      </Card>
    );
  }

  return (
    <div id="templates-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {templates.map((tmpl) => {
        const fmtKey = (tmpl.format || 'STANDARD').toUpperCase();
        const meta = FORMAT_META[fmtKey] || FORMAT_META.STANDARD;
        const varMatches = tmpl.body?.match(/\{\{([^}]+)\}\}/g) || [];
        const varCount = varMatches.length;

        return (
          <Card
            key={tmpl.id}
            id={`template-card-${tmpl.id}`}
            variant="elevated"
            padding={false}
            className="p-4 flex flex-col justify-between transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card bg-white border border-slate-200 ring-1 ring-slate-100"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs select-none border ${meta.cls}`}>
                  {meta.tag}
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wide bg-slate-100 text-slate-700 border-slate-200 uppercase font-mono">
                  {tmpl.format || 'STANDARD'}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 truncate" title={tmpl.name}>{tmpl.name}</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate" title={tmpl.subject || 'Default Subject'}>
                  {tmpl.subject || 'Standard Incident Notification'}
                </p>
                <div className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed font-mono bg-slate-50 p-2 rounded-lg border border-slate-100" title={tmpl.body}>
                  {tmpl.body || 'No template body defined'}
                </div>
              </div>
            </div>

            <div className="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {varCount} Variables
              </span>
              <div className="flex items-center gap-1.5">
                <Button id={`template-edit-${tmpl.id}`} variant="ghost" size="sm" onClick={() => onEdit(tmpl)}>
                  Configure
                </Button>
                <button
                  type="button"
                  id={`template-delete-${tmpl.id}`}
                  onClick={() => onDelete(tmpl)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                  title="Delete Template"
                >
                  <i className="fa-solid fa-trash-can text-xs" />
                </button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default NotifyHubTemplateList;
