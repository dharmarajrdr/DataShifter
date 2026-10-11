import React, { useRef, useState } from 'react';
import { BORDER_RADIUS, COLORS, FONT, SHADOWS } from '../../constants/design';
import AddWorkflowStepPill from './AddWorkflowStepPill';
import WorkflowNodeCard from './WorkflowNodeCard';

const CARD_WIDTH = 310;
const CARD_HEIGHT = 76;
const TRIGGER_X = 260;
const TRIGGER_Y = 44;

const EDGE_BADGE_MAP = {
  STOP_WORKFLOW: {
    text: 'If failed: Stop workflow',
    bg: COLORS.status.errorLight,
    color: COLORS.status.errorText,
    border: COLORS.status.error,
  },
  STOP_PIPELINE: {
    text: 'If failed: Stop pipeline',
    bg: COLORS.status.warningLight,
    color: COLORS.status.warningText,
    border: COLORS.status.warning,
  },
  CONTINUE_PIPELINE: {
    text: 'If failed: Continue',
    bg: COLORS.status.infoLight,
    color: COLORS.status.infoText,
    border: COLORS.status.info,
  },
};

const WorkflowCanvas = ({
  nodes = [],
  edges = [],
  mode = 'builder', // 'builder' | 'monitor'
  currentPipelineId = null,
  selectedItem = null, // { type: 'trigger' | 'node' | 'edge' | 'add', pipelineId?, sourcePipelineId?, targetPipelineId? }
  topologyInfo = { chainCount: 0, singleChainReady: false },
  onSelectTrigger,
  onSelectNode,
  onSelectEdge,
  onOpenAddStep,
  onMoveNode,
  onConnectNodes,
  onAutoArrange,
}) => {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [draggingNode, setDraggingNode] = useState(null); // { pipelineId, startMouseX, startMouseY, origX, origY, moved }
  const [connectingFrom, setConnectingFrom] = useState(null); // { sourcePipelineId, mouseX, mouseY }

  const handleNodeMouseDown = (pipelineId, e) => {
    if (mode !== 'builder' || e.button !== 0) return;
    e.stopPropagation();
    const targetNode = nodes.find((n) => n.pipelineId === pipelineId);
    if (!targetNode) return;
    setDraggingNode({
      pipelineId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      origX: targetNode.positionX ?? TRIGGER_X,
      origY: targetNode.positionY ?? 170,
      moved: false,
    });
  };

  const handleStartConnect = (sourcePipelineId, e) => {
    if (mode !== 'builder') return;
    const rect = containerRef.current?.getBoundingClientRect();
    const x = rect ? (e.clientX - rect.left) / zoom : 0;
    const y = rect ? (e.clientY - rect.top) / zoom : 0;
    setConnectingFrom({ sourcePipelineId, mouseX: x, mouseY: y });
  };

  const handleCompleteConnect = (targetPipelineId) => {
    if (connectingFrom && connectingFrom.sourcePipelineId !== targetPipelineId) {
      if (onConnectNodes) {
        onConnectNodes(connectingFrom.sourcePipelineId, targetPipelineId);
      }
    }
    setConnectingFrom(null);
  };

  const handleMouseMove = (e) => {
    if (draggingNode && onMoveNode) {
      const dx = (e.clientX - draggingNode.startMouseX) / zoom;
      const dy = (e.clientY - draggingNode.startMouseY) / zoom;
      const moved = Math.abs(dx) > 3 || Math.abs(dy) > 3 || draggingNode.moved;
      if (moved) {
        setDraggingNode((prev) => ({ ...prev, moved: true }));
        onMoveNode(
          draggingNode.pipelineId,
          Math.max(24, Math.round(draggingNode.origX + dx)),
          Math.max(24, Math.round(draggingNode.origY + dy))
        );
      }
    } else if (connectingFrom && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setConnectingFrom((prev) => ({
        ...prev,
        mouseX: (e.clientX - rect.left) / zoom,
        mouseY: (e.clientY - rect.top) / zoom,
      }));
    }
  };

  const handleMouseUp = () => {
    if (draggingNode) {
      if (!draggingNode.moved && onSelectNode) {
        onSelectNode(draggingNode.pipelineId);
      }
      setDraggingNode(null);
    }
    if (connectingFrom) {
      setConnectingFrom(null);
    }
  };

  // Determine head node (first node with no incoming edge) and tail node (last node with no outgoing edge)
  const incomingByTarget = {};
  const outgoingBySource = {};
  edges.forEach((e) => {
    incomingByTarget[e.targetPipelineId] = e;
    outgoingBySource[e.sourcePipelineId] = e;
  });

  const headNodes = nodes.filter((n) => !incomingByTarget[n.pipelineId]);
  const primaryHead = headNodes[0] || null;
  const tailNode =
    nodes.length > 0
      ? [...nodes].reverse().find((n) => !outgoingBySource[n.pipelineId]) || nodes[nodes.length - 1]
      : null;

  // Position for "+ Add Workflow Steps" pill
  const addPillX = tailNode ? (tailNode.positionX ?? TRIGGER_X) : TRIGGER_X;
  const addPillY = tailNode ? (tailNode.positionY ?? 170) + CARD_HEIGHT + 58 : TRIGGER_Y + CARD_HEIGHT + 58;

  const canvasHeight = Math.max(
    680,
    ...nodes.map((n) => (n.positionY ?? 170) + 240),
    addPillY + 120
  );

  const buildBezierPath = (x1, y1, x2, y2) => {
    if (Math.abs(x1 - x2) < 4 && y2 > y1) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    const midY = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  };

  return (
    <div
      style={{
        flex: 1,
        height: '100%',
        position: 'relative',
        overflow: 'auto',
        backgroundColor: '#F9F9F7',
        backgroundImage: 'radial-gradient(#D4D4D0 1.25px, transparent 1.25px)',
        backgroundSize: '20px 20px',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Top Floating Canvas Toolbar */}
      <div
        style={{
          position: 'sticky',
          top: 14,
          left: 16,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: COLORS.background.primary,
            border: `1px solid ${COLORS.border.light}`,
            borderRadius: BORDER_RADIUS.md,
            padding: '5px 10px',
            boxShadow: SHADOWS.sm,
            pointerEvents: 'auto',
          }}
        >
          {mode === 'builder' && onAutoArrange && (
            <button
              type="button"
              onClick={onAutoArrange}
              title="Auto-align workflow chain vertically"
              style={{
                border: 'none',
                background: 'transparent',
                color: COLORS.text.secondary,
                fontSize: FONT.size.xs,
                fontWeight: FONT.weight.medium,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 6px',
              }}
            >
              <i className="fa-solid fa-wand-magic-sparkles" style={{ color: COLORS.brand.primary }} />
              Auto-Align
            </button>
          )}
          <div style={{ width: 1, height: 14, background: COLORS.border.light }} />
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.1).toFixed(2)))}
            style={{
              border: 'none',
              background: 'transparent',
              color: COLORS.text.secondary,
              cursor: 'pointer',
              padding: '2px 5px',
            }}
            title="Zoom Out"
          >
            <i className="fa-solid fa-minus" style={{ fontSize: 11 }} />
          </button>
          <span style={{ fontSize: '11px', color: COLORS.text.secondary, minWidth: 36, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.3, +(z + 0.1).toFixed(2)))}
            style={{
              border: 'none',
              background: 'transparent',
              color: COLORS.text.secondary,
              cursor: 'pointer',
              padding: '2px 5px',
            }}
            title="Zoom In"
          >
            <i className="fa-solid fa-plus" style={{ fontSize: 11 }} />
          </button>
        </div>

        {/* Chain Topology Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: BORDER_RADIUS.pill,
            background: topologyInfo.singleChainReady
              ? COLORS.status.successLight
              : nodes.length === 0
                ? COLORS.background.primary
                : COLORS.status.warningLight,
            border: `1px solid ${
              topologyInfo.singleChainReady
                ? COLORS.status.success
                : nodes.length === 0
                  ? COLORS.border.light
                  : COLORS.status.warning
            }`,
            color: topologyInfo.singleChainReady
              ? COLORS.status.successText
              : nodes.length === 0
                ? COLORS.text.secondary
                : COLORS.status.warningText,
            fontSize: FONT.size.xs,
            fontWeight: FONT.weight.medium,
            boxShadow: SHADOWS.sm,
            pointerEvents: 'auto',
          }}
        >
          <i
            className={
              topologyInfo.singleChainReady
                ? 'fa-solid fa-link'
                : nodes.length === 0
                  ? 'fa-solid fa-circle-info'
                  : 'fa-solid fa-triangle-exclamation'
            }
          />
          {nodes.length === 0
            ? 'No pipeline steps added yet'
            : topologyInfo.singleChainReady
              ? `Single Chain Ready (${nodes.length} ${nodes.length === 1 ? 'step' : 'steps'})`
              : `${topologyInfo.chainCount} Disconnected Chains — Link into 1 chain before running`}
        </div>
      </div>

      {/* Scalable Canvas Surface */}
      <div
        ref={containerRef}
        onClick={() => onSelectTrigger && onSelectTrigger()}
        style={{
          position: 'relative',
          minWidth: 860,
          height: canvasHeight,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }}
      >
        {/* SVG Edges Layer */}
        <svg
          width="100%"
          height={canvasHeight}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <defs>
            <marker
              id="wf-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill={COLORS.text.secondary} />
            </marker>
            <marker
              id="wf-arrow-active"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill={COLORS.brand.primary} />
            </marker>
          </defs>

          {/* Arrow from Trigger to Primary Head Node */}
          {primaryHead && (
            <path
              d={buildBezierPath(
                TRIGGER_X + CARD_WIDTH / 2,
                TRIGGER_Y + 62,
                (primaryHead.positionX ?? TRIGGER_X) + CARD_WIDTH / 2,
                (primaryHead.positionY ?? 170) - 6
              )}
              stroke={COLORS.text.secondary}
              strokeWidth="1.6"
              fill="none"
              markerEnd="url(#wf-arrow)"
            />
          )}

          {/* Arrows for Series Edges */}
          {edges.map((edge) => {
            const srcNode = nodes.find((n) => n.pipelineId === edge.sourcePipelineId);
            const tgtNode = nodes.find((n) => n.pipelineId === edge.targetPipelineId);
            if (!srcNode || !tgtNode) return null;

            const srcHeight = mode === 'monitor' ? 104 : incomingByTarget[srcNode.pipelineId] ? 94 : CARD_HEIGHT;
            const x1 = (srcNode.positionX ?? TRIGGER_X) + CARD_WIDTH / 2;
            const y1 = (srcNode.positionY ?? 170) + srcHeight;
            const x2 = (tgtNode.positionX ?? TRIGGER_X) + CARD_WIDTH / 2;
            const y2 = (tgtNode.positionY ?? 170) - 6;

            const isEdgeSelected =
              selectedItem?.type === 'edge' &&
              selectedItem?.sourcePipelineId === edge.sourcePipelineId &&
              selectedItem?.targetPipelineId === edge.targetPipelineId;

            return (
              <g key={`${edge.sourcePipelineId}->${edge.targetPipelineId}`}>
                <path
                  d={buildBezierPath(x1, y1, x2, y2)}
                  stroke={isEdgeSelected ? COLORS.brand.primary : COLORS.text.secondary}
                  strokeWidth={isEdgeSelected ? '2.2' : '1.6'}
                  fill="none"
                  markerEnd={isEdgeSelected ? 'url(#wf-arrow-active)' : 'url(#wf-arrow)'}
                />
              </g>
            );
          })}

          {/* Arrow from Tail Node (or Trigger) to "+ Add Workflow Steps" Pill */}
          {mode === 'builder' && (
            <path
              d={buildBezierPath(
                tailNode
                  ? (tailNode.positionX ?? TRIGGER_X) + CARD_WIDTH / 2
                  : TRIGGER_X + CARD_WIDTH / 2,
                tailNode
                  ? (tailNode.positionY ?? 170) +
                      (incomingByTarget[tailNode.pipelineId] ? 94 : CARD_HEIGHT)
                  : TRIGGER_Y + 62,
                addPillX + CARD_WIDTH / 2,
                addPillY - 4
              )}
              stroke={COLORS.text.secondary}
              strokeWidth="1.5"
              strokeDasharray="4 3"
              fill="none"
              markerEnd="url(#wf-arrow)"
            />
          )}

          {/* Active Drag-to-Connect Line */}
          {connectingFrom && (() => {
            const srcNode = nodes.find((n) => n.pipelineId === connectingFrom.sourcePipelineId);
            if (!srcNode) return null;
            const x1 = (srcNode.positionX ?? TRIGGER_X) + CARD_WIDTH / 2;
            const y1 = (srcNode.positionY ?? 170) + CARD_HEIGHT;
            return (
              <path
                d={buildBezierPath(x1, y1, connectingFrom.mouseX, connectingFrom.mouseY)}
                stroke={COLORS.brand.primary}
                strokeWidth="2"
                strokeDasharray="5 3"
                fill="none"
                markerEnd="url(#wf-arrow-active)"
              />
            );
          })()}
        </svg>

        {/* Clickable Failure-Action Badges on Each Edge Midpoint */}
        {edges.map((edge) => {
          const srcNode = nodes.find((n) => n.pipelineId === edge.sourcePipelineId);
          const tgtNode = nodes.find((n) => n.pipelineId === edge.targetPipelineId);
          if (!srcNode || !tgtNode) return null;

          const srcHeight = mode === 'monitor' ? 104 : incomingByTarget[srcNode.pipelineId] ? 94 : CARD_HEIGHT;
          const x1 = (srcNode.positionX ?? TRIGGER_X) + CARD_WIDTH / 2;
          const y1 = (srcNode.positionY ?? 170) + srcHeight;
          const x2 = (tgtNode.positionX ?? TRIGGER_X) + CARD_WIDTH / 2;
          const y2 = (tgtNode.positionY ?? 170) - 6;

          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const badgeCfg = EDGE_BADGE_MAP[edge.onFailureAction || 'STOP_WORKFLOW'];

          return (
            <div
              key={`badge-${edge.sourcePipelineId}-${edge.targetPipelineId}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectEdge) onSelectEdge(edge.sourcePipelineId, edge.targetPipelineId);
              }}
              title="Click to configure failure behavior on this link"
              style={{
                position: 'absolute',
                left: midX,
                top: midY,
                transform: 'translate(-50%, -50%)',
                zIndex: 4,
                padding: '2px 9px',
                borderRadius: BORDER_RADIUS.pill,
                background: badgeCfg.bg,
                color: badgeCfg.color,
                border: `1px solid ${badgeCfg.border}`,
                fontSize: '10px',
                fontWeight: FONT.weight.semibold,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: SHADOWS.sm,
              }}
            >
              {badgeCfg.text}
            </div>
          );
        })}

        {/* Trigger Card */}
        <div
          style={{
            position: 'absolute',
            left: TRIGGER_X,
            top: TRIGGER_Y,
            zIndex: 2,
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectTrigger) onSelectTrigger();
          }}
        >
          <WorkflowNodeCard
            isTrigger
            selected={selectedItem?.type === 'trigger'}
          />
        </div>

        {/* Pipeline Step Node Cards */}
        {nodes.map((node, index) => {
          const posX = node.positionX ?? TRIGGER_X;
          const posY = node.positionY ?? 170 + index * 145;
          const isSelected =
            selectedItem?.type === 'node' && selectedItem?.pipelineId === node.pipelineId;
          const isRunning = currentPipelineId === node.pipelineId || node.pipelineStatus === 'RUNNING';

          return (
            <div
              key={node.pipelineId}
              style={{
                position: 'absolute',
                left: posX,
                top: posY,
                zIndex: isSelected ? 5 : 2,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <WorkflowNodeCard
                node={node}
                stepNumber={index + 1}
                selected={isSelected}
                isRunningNode={isRunning}
                incomingEdge={incomingByTarget[node.pipelineId]}
                mode={mode}
                isConnecting={Boolean(connectingFrom)}
                onMouseDown={(e) => handleNodeMouseDown(node.pipelineId, e)}
                onClick={() => onSelectNode && onSelectNode(node.pipelineId)}
                onStartConnect={handleStartConnect}
                onCompleteConnect={handleCompleteConnect}
              />
            </div>
          );
        })}

        {/* "+ Add Workflow Steps" Pill Button */}
        {mode === 'builder' && (
          <div
            style={{
              position: 'absolute',
              left: addPillX + CARD_WIDTH / 2,
              top: addPillY,
              transform: 'translateX(-50%)',
              zIndex: 3,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <AddWorkflowStepPill
              active={selectedItem?.type === 'add'}
              onClick={() =>
                onOpenAddStep && onOpenAddStep(tailNode ? tailNode.pipelineId : null)
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowCanvas;

