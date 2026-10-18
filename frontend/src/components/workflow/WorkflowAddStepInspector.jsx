import React, { useState } from 'react';

const FAILURE_OPTIONS = [
  { value: 'STOP_WORKFLOW', label: 'Stop workflow' },
  { value: 'STOP_PIPELINE', label: 'Stop pipeline' },
  { value: 'CONTINUE_PIPELINE', label: 'Continue pipeline' },
];

const WorkflowAddStepInspector = ({
  defaultAfterPipelineId = null, defaultConnectionMode = 'PARALLEL',
  nodes = [], eligiblePipelines = [], onAddStep,
}) => {
  const [selectedPid, setSelectedPid] = useState('');
  const [attachAfter, setAttachAfter] = useState(defaultAfterPipelineId || '__TRIGGER__');
  const [connMode, setConnMode] = useState(defaultConnectionMode);
  const [failureAction, setFailureAction] = useState('STOP_WORKFLOW');
  const [search, setSearch] = useState('');

  const available = eligiblePipelines.filter(
    (p) => !nodes.some((n) => n.pipelineId === p.id) && (p.name?.toLowerCase().includes(search.toLowerCase()) || !search)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const pSummary = eligiblePipelines.find((p) => p.id === selectedPid);
    if (pSummary) onAddStep?.(pSummary, attachAfter, failureAction, connMode);
  };

  return (
    <form id="workflow-add-step-form" onSubmit={handleSubmit} className="p-5 space-y-4">
      <div id="workflow-add-step-attach-group" className="space-y-1.5">
        <label id="workflow-add-step-attach-label" htmlFor="workflow-add-step-attach-select" className="block text-xs font-semibold uppercase text-slate-500 tracking-wider">
          Attach After Predecessor
        </label>
        <select id="workflow-add-step-attach-select" value={attachAfter || '__TRIGGER__'} onChange={(e) => setAttachAfter(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="__TRIGGER__">Start Trigger (Initial Step)</option>
          {nodes.map((n) => <option key={n.pipelineId} value={n.pipelineId}>Step #{n.stepNumber}: {n.pipelineName}</option>)}
        </select>
      </div>

      <div id="workflow-add-step-pipeline-group" className="space-y-1.5">
        <label id="workflow-add-step-pipeline-label" htmlFor="workflow-add-step-pipeline-select" className="block text-xs font-semibold uppercase text-slate-500 tracking-wider">
          Select Pipeline *
        </label>
        <input id="workflow-add-step-search-input" type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter pipelines..."
          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 mb-1 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        <select id="workflow-add-step-pipeline-select" value={selectedPid} onChange={(e) => setSelectedPid(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">-- Choose Pipeline ({available.length} available) --</option>
          {available.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.pipelineMode || 'INITIAL_LOAD'})</option>)}
        </select>
      </div>

      <div id="workflow-add-step-mode-group" className="space-y-1.5">
        <label id="workflow-add-step-mode-label" className="block text-xs font-semibold uppercase text-slate-500 tracking-wider">Execution Mode</label>
        <div id="workflow-add-step-mode-toggle" className="grid grid-cols-2 gap-2">
          <button id="workflow-add-step-mode-parallel" type="button" onClick={() => setConnMode('PARALLEL')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${connMode === 'PARALLEL' ? 'bg-indigo-50 border-indigo-600 text-indigo-700 ring-1 ring-indigo-500' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            Parallel Branch
          </button>
          <button id="workflow-add-step-mode-series" type="button" onClick={() => setConnMode('SERIES')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${connMode === 'SERIES' ? 'bg-indigo-50 border-indigo-600 text-indigo-700 ring-1 ring-indigo-500' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            Series Spliced
          </button>
        </div>
      </div>

      <div id="workflow-add-step-failure-group" className="space-y-1.5">
        <label id="workflow-add-step-failure-label" htmlFor="workflow-add-step-failure-select" className="block text-xs font-semibold uppercase text-slate-500 tracking-wider">
          On Predecessor Failure
        </label>
        <select id="workflow-add-step-failure-select" value={failureAction} onChange={(e) => setFailureAction(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {FAILURE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>

      <button id="workflow-add-step-submit-btn" type="submit" disabled={!selectedPid}
        className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs tracking-wide uppercase transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
        + Add Step to Workflow
      </button>
    </form>
  );
};

export default WorkflowAddStepInspector;
