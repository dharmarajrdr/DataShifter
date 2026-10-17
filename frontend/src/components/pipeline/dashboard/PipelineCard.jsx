import React from 'react';
import { ProgressBar, StatusBadge } from '../../common';
import PipelineConnectorBadge from './PipelineConnectorBadge';

export const PipelineCard = ({
  id,
  pipeline,
  navigate,
  onDragStart,
  className = '',
}) => {
  const cardId = id || `pipeline-card-${pipeline?.id}`;
  const progressVal = pipeline?.progress >= 0 && pipeline?.progress <= 100 ? pipeline.progress : 0;
  const ownerName = pipeline?.ownerName || 'User';
  const ownerInitials = pipeline?.ownerInitials || ownerName.slice(0, 2).toUpperCase();

  return (
    <div
      id={cardId}
      draggable
      onClick={() => navigate(`/pipelines/${pipeline.id}/monitor`)}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', pipeline.id);
        if (onDragStart) onDragStart(pipeline.id);
      }}
      className={`ds-pipeline-card bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-2xs cursor-pointer transition-all duration-200 ease-in-out hover:border-indigo-400 hover:shadow-md select-none ${className}`}
    >
      <div id={`${cardId}-top`} className="ds-card-top flex flex-col gap-2.5">
        <div id={`${cardId}-header`} className="flex items-start justify-between gap-2.5">
          <div id={`${cardId}-title-group`} className="flex items-center gap-2.5 min-w-0">
            <div
              id={`${cardId}-icon-box`}
              className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0"
            >
              <i id={`${cardId}-icon`} className="fa-solid fa-bolt text-xs" />
            </div>
            <div id={`${cardId}-text-group`} className="min-w-0">
              <h3 id={`${cardId}-name`} className="text-sm font-semibold text-slate-900 truncate" title={pipeline.name}>
                {pipeline.name}
              </h3>
              <div id={`${cardId}-meta`} className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span id={`${cardId}-ns`} className="font-medium text-indigo-600">{pipeline.namespaceName || 'Default'}</span>
                <span>•</span>
                <span id={`${cardId}-tables`}>{pipeline.tableCount || 1} {pipeline.tableCount === 1 ? 'table' : 'tables'}</span>
              </div>
            </div>
          </div>
          <StatusBadge id={`${cardId}-status`} status={pipeline.status} />
        </div>

        <div id={`${cardId}-route`} className="flex items-center gap-1.5 flex-wrap">
          <PipelineConnectorBadge id={`${cardId}-src`} name={pipeline.sourceName || pipeline.source || 'Source'} />
          <i id={`${cardId}-arrow`} className="fa-solid fa-arrow-right text-[10px] text-slate-400 shrink-0" />
          <PipelineConnectorBadge id={`${cardId}-tgt`} name={pipeline.targetName || pipeline.target || 'Target'} />
          {pipeline.workflowId && (
            <span
              id={`${cardId}-wf-lock`}
              onClick={(e) => { e.stopPropagation(); navigate(`/workflows/${pipeline.workflowId}/monitor`); }}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1"
              title={`Locked to workflow ${pipeline.workflowName || ''}`}
            >
              <i className="fa-solid fa-lock text-[8px]" />
              <span>Workflow Locked</span>
            </span>
          )}
        </div>
      </div>

      <div id={`${cardId}-bottom`} className="flex flex-col gap-2.5 pt-2 border-t border-slate-100">
        <div id={`${cardId}-progress-group`} className="flex flex-col gap-1">
          <div id={`${cardId}-progress-meta`} className="flex justify-between text-[11px] text-slate-500">
            <span>Progress / Rate</span>
            <span className="font-semibold text-slate-800">{Math.round(progressVal)}%</span>
          </div>
          <ProgressBar id={`${cardId}-prog-bar`} value={progressVal} status={pipeline.status} showLabel={false} />
        </div>

        <div id={`${cardId}-footer`} className="flex items-center justify-between text-xs text-slate-500">
          <div id={`${cardId}-owner`} className="flex items-center gap-1.5 min-w-0">
            <span id={`${cardId}-avatar`} className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
              {ownerInitials}
            </span>
            <span id={`${cardId}-owner-name`} className="truncate text-[11.5px] font-medium text-slate-700">{ownerName}</span>
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

export default PipelineCard;
