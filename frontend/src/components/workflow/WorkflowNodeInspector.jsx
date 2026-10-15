import React, { useState } from 'react';

const FAILURE_ACTIONS = [
  { value: 'STOP_WORKFLOW', label: 'Stop workflow' },
  { value: 'STOP_PIPELINE', label: 'Stop pipeline' },
  { value: 'CONTINUE_PIPELINE', label: 'Continue pipeline' },
];

const WorkflowNodeInspector = ({
  node, nodes = [], edges = [], onUpdateNodeLinks, onNavigatePipeline, onRemoveNode,
}) => {
  const inEdges = edges.filter((e) => e.targetPipelineId === node?.pipelineId);
  const outEdges = edges.filter((e) => e.sourcePipelineId === node?.pipelineId);
  const [draftActions, setDraftActions] = useState(() => {
    const map = {};
    inEdges.forEach((e) => { map[e.sourcePipelineId] = e.onFailureAction || 'STOP_WORKFLOW'; });
    return map;
  });

  const handleActionChange = (srcId, val) => {
    const next = { ...draftActions, [srcId]: val };
    setDraftActions(next);
    onUpdateNodeLinks?.(node.pipelineId, next);
  };
  if (!node) return null;

  return (
    <div id={`workflow-node-inspector-${node.pipelineId}`} className="p-5 space-y-4">
      <div id="workflow-node-inspector-summary" className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
        <div id="workflow-node-inspector-header" className="flex items-center justify-between gap-2">
          <span id="workflow-node-inspector-step-badge" className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
            Step #{node.stepNumber}
          </span>
          <span id="workflow-node-inspector-status" className="text-xs font-semibold text-slate-700">{node.pipelineStatus || 'VALIDATED'}</span>
        </div>
        <h3 id="workflow-node-inspector-title" className="text-sm font-semibold text-slate-900 truncate">{node.pipelineName}</h3>
        <div id="workflow-node-inspector-route" className="text-xs text-slate-500 font-mono flex items-center gap-1.5 truncate">
          <span>{node.sourceName || 'Source'}</span>
          <i className="fa-solid fa-arrow-right text-[10px]" aria-hidden="true" />
          <span>{node.targetName || 'Target'}</span>
        </div>
      </div>

      <div id="workflow-node-inspector-predecessors" className="space-y-2">
        <label id="workflow-node-predecessors-label" className="block text-xs font-semibold uppercase text-slate-500 tracking-wider">
          Predecessor Links ({inEdges.length})
        </label>
        {inEdges.length === 0 ? (
          <p id="workflow-node-no-predecessors" className="text-xs text-slate-500 italic bg-white p-2 rounded-lg border border-slate-200">
            Initial root step connected to Workflow Start Trigger.
          </p>
        ) : inEdges.map((e) => (
          <div key={e.sourcePipelineId} id={`workflow-predecessor-${e.sourcePipelineId}`} className="p-2 bg-white border border-slate-200 rounded-lg space-y-1">
            <span id={`workflow-predecessor-name-${e.sourcePipelineId}`} className="text-xs font-medium text-slate-800 truncate block">
              From: {nodes.find((n) => n.pipelineId === e.sourcePipelineId)?.pipelineName || e.sourcePipelineId}
            </span>
            <select id={`workflow-predecessor-action-${e.sourcePipelineId}`} value={draftActions[e.sourcePipelineId] || 'STOP_WORKFLOW'}
              onChange={(ev) => handleActionChange(e.sourcePipelineId, ev.target.value)}
              className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500">
              {FAILURE_ACTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div id="workflow-node-inspector-successors" className="space-y-1">
        <label id="workflow-node-successors-label" className="block text-xs font-semibold uppercase text-slate-500 tracking-wider">
          Successor Steps ({outEdges.length})
        </label>
        {outEdges.length === 0 ? (
          <p id="workflow-node-no-successors" className="text-xs text-slate-500 italic bg-white p-2 rounded-lg border border-slate-200">
            Leaf step. No downstream pipelines linked.
          </p>
        ) : outEdges.map((e) => (
          <div key={e.targetPipelineId} id={`workflow-successor-${e.targetPipelineId}`} className="text-xs font-medium text-slate-700 bg-white p-2 rounded border border-slate-200 flex items-center gap-1.5 truncate">
            <i className="fa-solid fa-arrow-turn-down text-[10px] text-slate-400 rotate-[-90deg]" aria-hidden="true" />
            <span className="truncate">{nodes.find((n) => n.pipelineId === e.targetPipelineId)?.pipelineName || e.targetPipelineId}</span>
          </div>
        ))}
      </div>

      <div id="workflow-node-inspector-actions" className="pt-2 flex flex-col gap-2 border-t border-slate-200">
        <button id="workflow-node-inspect-pipeline-btn" type="button" onClick={() => onNavigatePipeline?.(node.pipelineId)}
          className="w-full py-2 px-3 rounded-lg border border-slate-300 hover:border-indigo-500 text-xs font-medium text-slate-700 hover:text-indigo-600 bg-white flex items-center justify-center gap-1.5 cursor-pointer">
          <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" aria-hidden="true" />
          <span>View Pipeline Details</span>
        </button>
        <button id="workflow-node-delete-step-btn" type="button" onClick={() => onRemoveNode?.(node.pipelineId)}
          className="w-full py-2 px-3 rounded-lg border border-rose-200 hover:bg-rose-50 text-xs font-medium text-rose-600 flex items-center justify-center gap-1.5 cursor-pointer">
          <i className="fa-solid fa-trash-can text-[10px]" aria-hidden="true" />
          <span>Remove Step from Workflow</span>
        </button>
      </div>
    </div>
  );
};

export default WorkflowNodeInspector;
