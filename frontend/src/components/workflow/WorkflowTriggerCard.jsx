import React from 'react';

const WorkflowTriggerCard = ({ selected = false, onClick }) => {
  return (
    <div
      id="workflow-trigger-card"
      className={`w-[310px] bg-white rounded-xl border flex items-stretch overflow-hidden cursor-pointer select-none transition-all duration-150 ${
        selected
          ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
          : 'border-slate-200 hover:border-slate-300 shadow-sm'
      }`}
      onClick={onClick}
    >
      <div
        id="workflow-trigger-icon-well"
        className="w-[54px] bg-indigo-50 border-r border-slate-200 flex items-center justify-center shrink-0"
      >
        <i
          id="workflow-trigger-icon"
          className="fa-solid fa-bolt text-indigo-600 text-base"
          aria-hidden="true"
        />
      </div>
      <div id="workflow-trigger-body" className="p-3 flex-1 min-w-0">
        <div id="workflow-trigger-title-row" className="flex items-center justify-between gap-2">
          <span
            id="workflow-trigger-title"
            className="text-sm font-semibold text-slate-900 tracking-tight"
          >
            Workflow Start Trigger
          </span>
          <span
            id="workflow-trigger-badge"
            className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full"
          >
            Trigger
          </span>
        </div>
        <p
          id="workflow-trigger-desc"
          className="text-xs text-slate-500 mt-1 truncate"
        >
          Executes linked pipelines in series &amp; parallel
        </p>
      </div>
    </div>
  );
};

export default WorkflowTriggerCard;
