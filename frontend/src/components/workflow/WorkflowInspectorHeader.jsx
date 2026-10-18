import React from 'react';

const MODE_TITLES = {
  workflow_meta: { title: 'Workflow Settings', icon: 'fa-gear', desc: 'Metadata & trigger parameters' },
  add_step: { title: 'Add Pipeline Step', icon: 'fa-plus', desc: 'Attach pipeline to DAG' },
  inspect_node: { title: 'Pipeline Step Details', icon: 'fa-diagram-project', desc: 'Predecessor rules & info' },
  inspect_edge: { title: 'Connection Link Settings', icon: 'fa-link', desc: 'Execution failure behavior' },
};

const WorkflowInspectorHeader = ({ mode = 'workflow_meta', onClose }) => {
  const meta = MODE_TITLES[mode] || MODE_TITLES.workflow_meta;

  return (
    <div
      id="workflow-inspector-header"
      className="h-14 px-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white"
    >
      <div id="workflow-inspector-title-group" className="flex items-center gap-2.5 min-w-0">
        <div
          id="workflow-inspector-icon-box"
          className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0"
        >
          <i
            id="workflow-inspector-mode-icon"
            className={`fa-solid ${meta.icon} text-indigo-600 text-xs`}
            aria-hidden="true"
          />
        </div>
        <div id="workflow-inspector-text-box" className="min-w-0">
          <h2
            id="workflow-inspector-heading"
            className="text-sm font-semibold text-slate-900 truncate tracking-tight"
          >
            {meta.title}
          </h2>
          <p id="workflow-inspector-subtitle" className="text-[11px] text-slate-500 truncate">
            {meta.desc}
          </p>
        </div>
      </div>
      <button
        id="workflow-inspector-close-btn"
        type="button"
        onClick={onClose}
        title="Close Inspector"
        className="w-7 h-7 rounded-md hover:bg-slate-100 border border-transparent hover:border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
      >
        <i className="fa-solid fa-xmark text-xs" aria-hidden="true" />
      </button>
    </div>
  );
};

export default WorkflowInspectorHeader;
