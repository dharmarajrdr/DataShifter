import React from 'react';
import { ProgressBar, StatusBadge } from '../../common';

export const WorkflowCard = ({
  id,
  workflow,
  navigate,
  className = '',
}) => {
  const cardId = id || `workflow-card-${workflow?.id}`;
  const progressVal = workflow?.overallProgress ?? workflow?.progress ?? 0;
  const ownerName = workflow?.ownerName || 'User';
  const ownerInitials = workflow?.ownerInitials || ownerName.slice(0, 2).toUpperCase();
  const stepCount = workflow?.pipelineCount || 0;

  return (
    <div
      id={cardId}
      onClick={() => navigate(`/workflows/${workflow.id}/monitor`)}
      className={`ds-workflow-card bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-2xs cursor-pointer transition-all duration-200 ease-in-out hover:border-indigo-400 hover:shadow-md select-none ${className}`}
    >
      <div id={`${cardId}-top`} className="ds-wf-card-top flex flex-col gap-2">
        <div id={`${cardId}-header`} className="flex items-start justify-between gap-2.5">
          <div id={`${cardId}-title-group`} className="flex items-center gap-2.5 min-w-0">
            <div
              id={`${cardId}-icon-box`}
              className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0"
            >
              <i id={`${cardId}-icon`} className="fa-solid fa-diagram-project text-xs" />
            </div>
            <div id={`${cardId}-text-group`} className="min-w-0">
              <h3 id={`${cardId}-name`} className="text-sm font-semibold text-slate-900 truncate" title={workflow.name}>
                {workflow.name}
              </h3>
              <div id={`${cardId}-meta`} className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span id={`${cardId}-ns`} className="font-medium text-indigo-600">{workflow.namespaceName || 'Default'}</span>
                <span>•</span>
                <span id={`${cardId}-count`}>{stepCount} {stepCount === 1 ? 'pipeline' : 'pipelines'}</span>
              </div>
            </div>
          </div>
          <StatusBadge id={`${cardId}-status`} status={workflow.status} />
        </div>

        {workflow.description && (
          <p id={`${cardId}-desc`} className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {workflow.description}
          </p>
        )}
      </div>

      <div id={`${cardId}-bottom`} className="flex flex-col gap-2.5 pt-2 border-t border-slate-100">
        <div id={`${cardId}-progress-group`} className="flex flex-col gap-1">
          <div id={`${cardId}-progress-meta`} className="flex justify-between text-[11px] text-slate-500">
            <span>Execution Progress</span>
            <span className="font-semibold text-slate-800">{Math.round(progressVal)}%</span>
          </div>
          <ProgressBar id={`${cardId}-prog-bar`} value={progressVal} status={workflow.status} showLabel={false} />
        </div>

        <div id={`${cardId}-footer`} className="flex items-center justify-between text-xs text-slate-500">
          <div id={`${cardId}-steps-badge`} className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
            <i className="fa-solid fa-layer-group text-slate-400 text-[10px]" />
            <span className="font-medium text-[11px]">{stepCount} {stepCount === 1 ? 'Pipeline Step' : 'Pipeline Steps'}</span>
          </div>
          <div id={`${cardId}-monitor-link`} className="flex items-center gap-1 text-indigo-600 font-semibold text-[11.5px] hover:translate-x-0.5 transition-transform">
            <span>Monitor</span>
            <i className="fa-solid fa-arrow-right text-[10px]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowCard;
