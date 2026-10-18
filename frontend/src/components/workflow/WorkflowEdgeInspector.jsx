import React, { useState } from 'react';

export const FAILURE_OPTIONS = [
  { value: 'STOP_WORKFLOW', title: 'Stop the workflow', desc: 'Abort entire workflow if predecessor fails', icon: 'fa-circle-stop', color: 'text-rose-600' },
  { value: 'STOP_PIPELINE', title: 'Stop this pipeline', desc: 'Halt this pipeline and downstream steps', icon: 'fa-ban', color: 'text-amber-600' },
  { value: 'CONTINUE_PIPELINE', title: 'Continue pipeline', desc: 'Execute regardless of predecessor failure', icon: 'fa-forward-step', color: 'text-blue-600' },
];

const WorkflowEdgeInspector = ({
  sourcePipelineId, targetPipelineId, nodes = [], edges = [], onUpdateEdge, onDeleteEdge,
}) => {
  const currentEdge = edges.find((e) => e.sourcePipelineId === sourcePipelineId && e.targetPipelineId === targetPipelineId);
  const [selectedAction, setSelectedAction] = useState(currentEdge?.onFailureAction || 'STOP_WORKFLOW');
  const src = nodes.find((n) => n.pipelineId === sourcePipelineId);
  const tgt = nodes.find((n) => n.pipelineId === targetPipelineId);

  const handleSelect = (action) => {
    setSelectedAction(action);
    onUpdateEdge?.(sourcePipelineId, targetPipelineId, action);
  };

  return (
    <div id={`workflow-edge-inspector-${sourcePipelineId}-${targetPipelineId}`} className="p-5 space-y-4">
      <div id="workflow-edge-route-card" className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <span id="workflow-edge-route-label" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Connected Pipelines</span>
        <div id="workflow-edge-route-display" className="space-y-1.5 text-xs font-semibold text-slate-800">
          <div id="workflow-edge-src-node" className="flex items-center gap-1.5 truncate">
            <span className="text-slate-500 font-normal">From:</span>
            <span className="truncate">{src?.pipelineName || sourcePipelineId}</span>
          </div>
          <div id="workflow-edge-tgt-node" className="flex items-center gap-1.5 truncate">
            <span className="text-slate-500 font-normal">To:</span>
            <span className="truncate">{tgt?.pipelineName || targetPipelineId}</span>
          </div>
        </div>
      </div>

      <div id="workflow-edge-failure-options" className="space-y-2">
        <label id="workflow-edge-failure-label" className="block text-xs font-semibold uppercase text-slate-500 tracking-wider">
          On Predecessor Failure Strategy
        </label>
        {FAILURE_OPTIONS.map((opt) => {
          const isSelected = selectedAction === opt.value;
          return (
            <div
              key={opt.value}
              id={`workflow-edge-option-${opt.value}`}
              onClick={() => handleSelect(opt.value)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                isSelected ? 'bg-indigo-50/60 border-indigo-600 ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <i className={`fa-solid ${opt.icon} ${opt.color} text-sm`} aria-hidden="true" />
                <span className="text-xs font-semibold text-slate-900">{opt.title}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 ml-6">{opt.desc}</p>
            </div>
          );
        })}
      </div>

      <div id="workflow-edge-actions" className="pt-2 border-t border-slate-200">
        <button
          id="workflow-edge-delete-btn"
          type="button"
          onClick={() => onDeleteEdge?.(sourcePipelineId, targetPipelineId)}
          className="w-full py-2 px-3 rounded-lg border border-rose-200 hover:bg-rose-50 text-xs font-medium text-rose-600 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <i className="fa-solid fa-link-slash text-[10px]" aria-hidden="true" />
          <span>Delete Connection Link</span>
        </button>
      </div>
    </div>
  );
};

export default WorkflowEdgeInspector;
