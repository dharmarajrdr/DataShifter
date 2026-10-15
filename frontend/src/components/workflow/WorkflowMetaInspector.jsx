import React from 'react';

const WorkflowMetaInspector = ({
  workflowMeta = { name: '', description: '', namespaceId: '', status: 'DRAFT' },
  onChangeWorkflowMeta,
  namespaces = [],
  topologyInfo = { chainCount: 0, singleChainReady: false, validationErrors: [] },
  readOnly = false,
}) => {
  return (
    <div id="workflow-meta-inspector" className="p-5 space-y-4">
      <div id="workflow-meta-name-group" className="space-y-1.5">
        <label id="workflow-meta-name-label" htmlFor="workflow-meta-name-input" className="block text-xs font-semibold uppercase text-slate-500 tracking-wider">
          Workflow Name *
        </label>
        <input
          id="workflow-meta-name-input"
          type="text"
          disabled={readOnly}
          value={workflowMeta.name || ''}
          onChange={(e) => onChangeWorkflowMeta?.((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="e.g. Daily Data Lakehouse ETL"
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-50"
        />
      </div>

      <div id="workflow-meta-desc-group" className="space-y-1.5">
        <label id="workflow-meta-desc-label" htmlFor="workflow-meta-desc-input" className="block text-xs font-semibold uppercase text-slate-500 tracking-wider">
          Description
        </label>
        <textarea
          id="workflow-meta-desc-input"
          rows={3}
          disabled={readOnly}
          value={workflowMeta.description || ''}
          onChange={(e) => onChangeWorkflowMeta?.((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Optional workflow description..."
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-50 resize-none"
        />
      </div>

      <div id="workflow-meta-namespace-group" className="space-y-1.5">
        <label id="workflow-meta-namespace-label" htmlFor="workflow-meta-namespace-select" className="block text-xs font-semibold uppercase text-slate-500 tracking-wider">
          Namespace
        </label>
        <select
          id="workflow-meta-namespace-select"
          disabled={readOnly}
          value={workflowMeta.namespaceId || ''}
          onChange={(e) => onChangeWorkflowMeta?.((prev) => ({ ...prev, namespaceId: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Default Namespace</option>
          {namespaces.map((ns) => (
            <option key={ns.id} value={ns.id}>{ns.name}</option>
          ))}
        </select>
      </div>

      <div id="workflow-meta-trigger-info" className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
        <div id="workflow-meta-trigger-header" className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <i className="fa-solid fa-bolt text-indigo-600" aria-hidden="true" />
          <span>Start Trigger Settings</span>
        </div>
        <p id="workflow-meta-trigger-text" className="text-xs text-slate-500">
          Workflow triggers manually on run or via API webhook. Downstream pipelines execute in parallel stages according to the DAG topology.
        </p>
      </div>

      {topologyInfo?.validationErrors?.length > 0 && (
        <div id="workflow-meta-validation-box" className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
          <div id="workflow-meta-validation-title" className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            <span>Workflow Validation Issues</span>
          </div>
          <ul id="workflow-meta-validation-list" className="list-disc list-inside text-xs text-amber-700 space-y-0.5">
            {topologyInfo.validationErrors.map((err, i) => (
              <li key={`val-err-${i}`}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default WorkflowMetaInspector;
