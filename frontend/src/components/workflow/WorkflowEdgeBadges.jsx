import React from 'react';
import { CARD_HEIGHT, CARD_WIDTH, TRIGGER_Y } from './workflowLayout';

const BADGE_MAP = {
  STOP_WORKFLOW: { text: 'If failed: Stop workflow', cls: 'bg-rose-50 text-rose-700 border-rose-300' },
  STOP_PIPELINE: { text: 'If failed: Stop pipeline', cls: 'bg-amber-50 text-amber-700 border-amber-300' },
  CONTINUE_PIPELINE: { text: 'If failed: Continue', cls: 'bg-blue-50 text-blue-700 border-blue-300' },
};

const WorkflowEdgeBadges = ({
  nodes = [],
  edges = [],
  triggerX = 360,
  primaryHead = null,
  mode = 'builder',
  selectedItem = null,
  onOpenAddStep,
  onSelectEdge,
}) => {
  return (
    <>
      {mode === 'builder' && primaryHead && (
        <button
          id="workflow-add-step-at-trigger-btn"
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenAddStep?.('__TRIGGER__', 'SERIES'); }}
          title="Add pipeline step at start of chain"
          className="absolute z-10 w-5 h-5 rounded-full bg-white text-indigo-600 border-2 border-indigo-600 flex items-center justify-center p-0 cursor-pointer shadow-sm hover:bg-indigo-600 hover:text-white transition-all -translate-x-1/2 -translate-y-1/2"
          style={{
            left: ((triggerX + CARD_WIDTH / 2) + ((primaryHead.positionX ?? triggerX) + CARD_WIDTH / 2)) / 2,
            top: ((TRIGGER_Y + 62) + ((primaryHead.positionY ?? 170) - 6)) / 2,
          }}
        >
          <i className="fa-solid fa-plus text-[9px]" aria-hidden="true" />
        </button>
      )}

      {edges.map((edge) => {
        const srcNode = nodes.find((n) => n.pipelineId === edge.sourcePipelineId);
        const tgtNode = nodes.find((n) => n.pipelineId === edge.targetPipelineId);
        if (!srcNode || !tgtNode) return null;

        const srcH = mode === 'monitor' ? 78 : CARD_HEIGHT;
        const x1 = (srcNode.positionX ?? triggerX) + CARD_WIDTH / 2;
        const y1 = (srcNode.positionY ?? 170) + srcH;
        const x2 = (tgtNode.positionX ?? triggerX) + CARD_WIDTH / 2;
        const y2 = (tgtNode.positionY ?? 170) - 6;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        const badgeCfg = BADGE_MAP[edge.onFailureAction || 'STOP_WORKFLOW'] || BADGE_MAP.STOP_WORKFLOW;
        const isAddSelected = selectedItem?.type === 'add' && selectedItem?.afterPipelineId === edge.sourcePipelineId;

        return (
          <div
            key={`edge-badge-${edge.sourcePipelineId}-${edge.targetPipelineId}`}
            id={`workflow-edge-badge-${edge.sourcePipelineId}-${edge.targetPipelineId}`}
            className="absolute z-10 inline-flex flex-col items-center gap-1.5 -translate-x-1/2 -translate-y-1/2"
            style={{ left: midX, top: midY }}
          >
            <div
              id={`workflow-edge-action-pill-${edge.sourcePipelineId}-${edge.targetPipelineId}`}
              onClick={(e) => { e.stopPropagation(); onSelectEdge?.(edge.sourcePipelineId, edge.targetPipelineId); }}
              title="Click to configure failure behavior on this link"
              className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold cursor-pointer whitespace-nowrap shadow-sm hover:brightness-95 transition-all ${badgeCfg.cls}`}
            >
              {badgeCfg.text}
            </div>

            {mode === 'builder' && (
              <button
                id={`workflow-edge-add-step-btn-${edge.sourcePipelineId}-${edge.targetPipelineId}`}
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpenAddStep?.(edge.sourcePipelineId, 'PARALLEL'); }}
                title={`Add pipeline step after ${srcNode.pipelineName}`}
                className={`w-5 h-5 rounded-full border-2 border-indigo-600 flex items-center justify-center p-0 cursor-pointer shadow-sm transition-all ${
                  isAddSelected ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-plus text-[9px]" aria-hidden="true" />
              </button>
            )}
          </div>
        );
      })}
    </>
  );
};

export default WorkflowEdgeBadges;
