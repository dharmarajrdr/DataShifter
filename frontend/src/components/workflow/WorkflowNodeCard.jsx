import React from 'react';
import WorkflowTriggerCard from './WorkflowTriggerCard';

const STATUS_ICONS = {
  RUNNING: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'fa-spinner fa-spin' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'fa-circle-check' },
  ERRORED: { bg: 'bg-rose-50', text: 'text-rose-700', icon: 'fa-triangle-exclamation' },
  FAILED: { bg: 'bg-rose-50', text: 'text-rose-700', icon: 'fa-triangle-exclamation' },
  INVALID: { bg: 'bg-rose-50', text: 'text-rose-700', icon: 'fa-triangle-exclamation' },
  NOT_VALIDATED: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'fa-circle-exclamation' },
  PAUSED: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'fa-ban' }, STOPPED: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'fa-ban' },
  DRAFT: { bg: 'bg-slate-100', text: 'text-slate-600', icon: 'fa-circle-dot' }, VALIDATED: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'fa-diagram-project' },
};

const WorkflowNodeCard = ({
  node, stepNumber, isTrigger = false, selected = false, isRunningNode = false, mode = 'builder',
  onClick, onMouseDown, onStartConnect, onCompleteConnect, onRemove, isConnecting = false,
}) => {
  if (isTrigger) return <WorkflowTriggerCard selected={selected} onClick={onClick} />;

  const statusKey = isRunningNode ? 'RUNNING' : (node?.pipelineStatus || 'VALIDATED');
  const cfg = STATUS_ICONS[statusKey] || STATUS_ICONS.VALIDATED;
  const isCdc = node?.pipelineMode === 'CDC' || node?.isCdc;

  return (
    <div
      id={`workflow-node-card-${node?.pipelineId}`}
      onClick={onClick}
      onMouseDown={onMouseDown}
      className={`relative w-[310px] bg-white rounded-xl select-none transition-all duration-150 ${
        mode === 'builder' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${selected ? 'ring-2 ring-indigo-500 shadow-md border-2 border-indigo-600' : 'border border-slate-200 hover:border-slate-300 shadow-sm'}`}
    >
      {mode === 'builder' && selected && onRemove && (
        <button
          id={`workflow-node-remove-btn-${node.pipelineId}`}
          type="button"
          title="Remove step from workflow"
          onClick={(e) => { e.stopPropagation(); onRemove(node.pipelineId); }}
          className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-white border border-slate-300 hover:bg-rose-500 hover:text-white hover:border-rose-500 text-slate-500 flex items-center justify-center text-[10px] shadow-sm z-10"
        >
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      )}

      {mode === 'builder' && (
        <div
          id={`workflow-node-in-port-${node.pipelineId}`}
          title="Drop link here to set as successor"
          onMouseUp={() => onCompleteConnect?.(node.pipelineId)}
          className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-indigo-600 z-10 cursor-pointer ${
            isConnecting ? 'bg-indigo-600 ring-2 ring-indigo-300' : 'bg-white'
          }`}
        />
      )}

      <div id={`workflow-node-inner-${node.pipelineId}`} className="flex items-stretch min-h-[54px] rounded-xl overflow-hidden">
        <div id={`workflow-node-icon-well-${node.pipelineId}`} className={`w-[54px] ${cfg.bg} border-r border-slate-200 flex flex-col items-center justify-center gap-0.5 shrink-0`}>
          <i id={`workflow-node-icon-${node.pipelineId}`} className={`fa-solid ${cfg.icon} text-sm ${cfg.text}`} aria-hidden="true" />
          {stepNumber != null && <span id={`workflow-node-step-${node.pipelineId}`} className={`text-[10px] font-semibold ${cfg.text}`}>#{stepNumber}</span>}
        </div>
        <div id={`workflow-node-details-${node.pipelineId}`} className="p-2.5 flex-1 min-w-0 flex flex-col justify-center">
          <div id={`workflow-node-title-row-${node.pipelineId}`} className="flex items-center justify-between gap-1.5">
            <span id={`workflow-node-name-${node.pipelineId}`} className="text-sm font-semibold text-slate-900 truncate flex-1" title={node?.pipelineName}>
              {node?.pipelineName}
            </span>
            {isCdc && (
              <span id={`workflow-node-cdc-badge-${node.pipelineId}`} data-testid="workflow-node-cdc-badge" className="text-[9px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <i className="fa-solid fa-bolt text-[8px]" aria-hidden="true" />CDC
              </span>
            )}
          </div>
          {mode === 'monitor' && (
            <div id={`workflow-node-monitor-stats-${node.pipelineId}`} className="mt-1.5">
              <div id={`workflow-node-progress-bar-${node.pipelineId}`} className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div id={`workflow-node-progress-fill-${node.pipelineId}`} className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, node?.progress || 0))}%` }} />
              </div>
              <div id={`workflow-node-progress-labels-${node.pipelineId}`} className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>{(node?.rowsProcessed || 0).toLocaleString()} rows</span>
                <span>{Math.round(node?.progress || 0)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {mode === 'builder' && (
        <div
          id={`workflow-node-out-port-${node.pipelineId}`}
          title="Drag or click to link successor pipeline"
          onMouseDown={(e) => { e.stopPropagation(); onStartConnect?.(node.pipelineId, e); }}
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-indigo-600 z-10 cursor-crosshair hover:bg-indigo-600"
        />
      )}
    </div>
  );
};

export default WorkflowNodeCard;
