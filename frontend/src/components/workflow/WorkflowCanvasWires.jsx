import React from 'react';
import { CARD_HEIGHT, CARD_WIDTH, TRIGGER_Y } from './workflowLayout';

export const buildBezierPath = (x1, y1, x2, y2) => {
  if (Math.abs(x1 - x2) < 4 && y2 > y1) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
};

const WorkflowCanvasWires = ({
  nodes = [], edges = [], primaryHead = null, leafNodes = [],
  triggerX = 360, mode = 'builder', selectedItem = null, connectingFrom = null, canvasHeight = 680,
}) => {
  return (
    <svg id="workflow-canvas-svg-layer" width="100%" height={canvasHeight} className="absolute top-0 left-0 pointer-events-none z-[1]">
      <defs id="workflow-svg-defs">
        <marker id="wf-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path id="wf-arrow-path" d="M0,0 L8,4 L0,8 Z" fill="#94A3B8" />
        </marker>
        <marker id="wf-arrow-active" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path id="wf-arrow-active-path" d="M0,0 L8,4 L0,8 Z" fill="#4F46E5" />
        </marker>
      </defs>

      {primaryHead && (
        <path
          id="wire-trigger-to-head"
          d={buildBezierPath(triggerX + CARD_WIDTH / 2, TRIGGER_Y + 62, (primaryHead.positionX ?? triggerX) + CARD_WIDTH / 2, (primaryHead.positionY ?? 170) - 6)}
          stroke="#94A3B8" strokeWidth="1.6" fill="none" markerEnd="url(#wf-arrow)"
        />
      )}

      {edges.map((edge) => {
        const src = nodes.find((n) => n.pipelineId === edge.sourcePipelineId);
        const tgt = nodes.find((n) => n.pipelineId === edge.targetPipelineId);
        if (!src || !tgt) return null;
        const srcH = mode === 'monitor' ? 78 : CARD_HEIGHT;
        const x1 = (src.positionX ?? triggerX) + CARD_WIDTH / 2;
        const y1 = (src.positionY ?? 170) + srcH;
        const x2 = (tgt.positionX ?? triggerX) + CARD_WIDTH / 2;
        const y2 = (tgt.positionY ?? 170) - 6;
        const isSel = selectedItem?.type === 'edge' && selectedItem?.sourcePipelineId === edge.sourcePipelineId && selectedItem?.targetPipelineId === edge.targetPipelineId;
        return (
          <path
            key={`wire-${edge.sourcePipelineId}-${edge.targetPipelineId}`}
            id={`wire-${edge.sourcePipelineId}-${edge.targetPipelineId}`}
            d={buildBezierPath(x1, y1, x2, y2)}
            stroke={isSel ? '#4F46E5' : '#94A3B8'}
            strokeWidth={isSel ? '2.2' : '1.6'}
            fill="none"
            markerEnd={isSel ? 'url(#wf-arrow-active)' : 'url(#wf-arrow)'}
          />
        );
      })}

      {mode === 'builder' && (leafNodes.length > 0 ? (
        leafNodes.map((leaf) => {
          const cx = (leaf.positionX ?? triggerX) + CARD_WIDTH / 2;
          const by = (leaf.positionY ?? 170) + CARD_HEIGHT;
          return (
            <path
              key={`wire-leaf-${leaf.pipelineId}`}
              id={`wire-leaf-${leaf.pipelineId}`}
              d={buildBezierPath(cx, by, cx, by + 54)}
              stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4 3" fill="none" markerEnd="url(#wf-arrow)"
            />
          );
        })
      ) : (
        <path
          id="wire-trigger-to-add-pill"
          d={buildBezierPath(triggerX + CARD_WIDTH / 2, TRIGGER_Y + 62, triggerX + CARD_WIDTH / 2, TRIGGER_Y + CARD_HEIGHT + 54)}
          stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4 3" fill="none" markerEnd="url(#wf-arrow)"
        />
      ))}

      {connectingFrom && (() => {
        const src = nodes.find((n) => n.pipelineId === connectingFrom.sourcePipelineId);
        if (!src) return null;
        const x1 = (src.positionX ?? triggerX) + CARD_WIDTH / 2;
        const y1 = (src.positionY ?? 170) + CARD_HEIGHT;
        return (
          <path
            id="wire-active-connecting"
            d={buildBezierPath(x1, y1, connectingFrom.mouseX, connectingFrom.mouseY)}
            stroke="#4F46E5" strokeWidth="2" strokeDasharray="5 3" fill="none" markerEnd="url(#wf-arrow-active)"
          />
        );
      })()}
    </svg>
  );
};

export default WorkflowCanvasWires;
