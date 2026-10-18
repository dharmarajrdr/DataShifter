import React from 'react';
import StatusBadge from '../common/StatusBadge';

const WorkflowBuilderHeader = ({
  isEditMode = false,
  workflowId,
  workflowMeta = { name: '' },
  onChangeName,
  singleChainReady = false,
  saving = false,
  onCancel,
  onSave,
  onNavigateMonitor,
}) => {
  return (
    <header
      id="workflow-builder-header"
      className="h-14 min-h-[56px] px-6 border-b border-slate-200 bg-white flex items-center justify-between gap-4 z-20 shrink-0"
    >
      <div id="workflow-builder-header-left" className="flex items-center gap-3">
        <button
          id="workflow-builder-back-btn"
          type="button"
          onClick={onCancel}
          className="bg-transparent border-none cursor-pointer text-slate-800 hover:text-indigo-600 inline-flex items-center gap-2 text-base font-semibold p-1 rounded transition-colors"
        >
          <i className="fa-solid fa-chevron-left text-xs" aria-hidden="true" />
          <span>{isEditMode ? 'Edit Workflow' : 'Create Workflow'}</span>
        </button>

        <div className="w-px h-4 bg-slate-200" aria-hidden="true" />

        {isEditMode ? (
          <span id="workflow-builder-name-display" className="text-sm font-semibold text-slate-900 truncate max-w-[260px]">
            {workflowMeta.name}
          </span>
        ) : (
          <input
            id="workflow-builder-name-input"
            type="text"
            value={workflowMeta.name || ''}
            onChange={(e) => onChangeName?.(e.target.value)}
            placeholder="Enter workflow name..."
            className="border border-slate-300 rounded-lg px-2.5 py-1 text-sm font-medium text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[220px]"
          />
        )}

        <StatusBadge status={singleChainReady ? 'READY' : 'DRAFT'} />
      </div>

      <div id="workflow-builder-header-actions" className="flex items-center gap-2.5">
        {isEditMode && (
          <button
            id="workflow-builder-monitor-btn"
            type="button"
            onClick={onNavigateMonitor}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 transition-colors"
          >
            <i className="fa-solid fa-chart-line text-[11px]" aria-hidden="true" />
            <span>Monitor</span>
          </button>
        )}

        <button
          id="workflow-builder-cancel-btn"
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer transition-colors"
        >
          Cancel
        </button>

        <button
          id="workflow-builder-save-btn"
          type="button"
          disabled={saving}
          onClick={onSave}
          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait"
        >
          {saving ? 'Saving...' : isEditMode ? 'Apply & Save' : 'Apply & Create'}
        </button>
      </div>
    </header>
  );
};

export default WorkflowBuilderHeader;
