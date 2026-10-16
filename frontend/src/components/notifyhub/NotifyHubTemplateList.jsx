import React from 'react';
import { Button } from '../common';

export const NotifyHubTemplateList = ({
  templates = [],
  onEdit,
  onDelete,
  onNewTemplate,
}) => {
  if (templates.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center shadow-xs">
        <i className="fa-solid fa-envelope-open-text text-3xl text-slate-300 mb-3 block" />
        <p className="text-base font-bold text-slate-800 mb-1">No notification templates configured</p>
        <p className="text-xs text-slate-500 mb-4">Create reusable templates with dynamic variables like {'{{pipelineName}}'}, {'{{status}}'}, etc.</p>
        <Button variant="primary" onClick={onNewTemplate}>+ Create Notification Template</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((tmpl) => (
        <div key={tmpl.id} id={`template-card-${tmpl.id}`} className="ds-template-card bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase font-mono">
                {tmpl.format || 'STANDARD'}
              </span>
              <span className="text-[10px] font-mono text-slate-400">ID: {tmpl.id.slice(0, 8)}</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-2 truncate" title={tmpl.name}>{tmpl.name}</h3>
            {tmpl.subject && (
              <div className="text-xs text-slate-700 mb-2 bg-slate-50 p-2 rounded border border-slate-100">
                <strong className="text-slate-500 block text-[10px] uppercase">Subject:</strong>
                <span className="font-mono text-[11px] truncate block">{tmpl.subject}</span>
              </div>
            )}
            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 font-mono text-[11px] line-clamp-3 mb-3">
              {tmpl.body || 'No template body defined'}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => onEdit(tmpl)}>Edit</Button>
            <Button variant="danger" size="sm" onClick={() => onDelete(tmpl)}>Delete</Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotifyHubTemplateList;
