import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BORDER_RADIUS, COLORS, FONT, SHADOWS } from '../../constants/design';
import AddWorkflowStepPill from './AddWorkflowStepPill';
import WorkflowNodeCard from './WorkflowNodeCard';

const CARD_WIDTH = 310;
const CARD_HEIGHT = 56;
const TRIGGER_X = 360;
const TRIGGER_Y = 44;
const CANVAS_PAD_X = 480;
const CANVAS_PAD_Y = 320;
const BASE_SCALE = 0.8;

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
  onRemoveNode,
  onAutoArrange,
}) => {
  const scrollContainerRef = useRef(null);
  const containerRef = useRef(null);
  const hasInitializedScroll = useRef(false);
  const [zoom, setZoom] = useState(1);
  const effectiveScale = zoom * BASE_SCALE;
  const [draggingNode, setDraggingNode] = useState(null); // { pipelineId, startMouseX, startMouseY, origX, origY, moved }
  const [connectingFrom, setConnectingFrom] = useState(null); // { sourcePipelineId, mouseX, mouseY }

  // Build multi-edge maps for DAG
  const incomingByTarget = {};
  const outgoingBySource = {};
  edges.forEach((e) => {
    if (!incomingByTarget[e.targetPipelineId]) incomingByTarget[e.targetPipelineId] = [];
    incomingByTarget[e.targetPipelineId].push(e);
    if (!outgoingBySource[e.sourcePipelineId]) outgoingBySource[e.sourcePipelineId] = [];
    outgoingBySource[e.sourcePipelineId].push(e);
  });

  const headNodes = nodes.filter((n) => !(incomingByTarget[n.pipelineId]?.length > 0));
  const primaryHead = headNodes[0] || null;
  const leafNodes = nodes.filter((n) => !(outgoingBySource[n.pipelineId]?.length > 0));

  const triggerX = primaryHead ? (primaryHead.positionX ?? TRIGGER_X) : TRIGGER_X;

  const centerOnCanvasCoords = useCallback(
    (x, y, width = CARD_WIDTH, height = CARD_HEIGHT, behavior = 'smooth') => {
      requestAnimationFrame(() => {
        const scrollEl = scrollContainerRef.current;
        if (!scrollEl) return;
        const centerX = CANVAS_PAD_X + (x + width / 2) * effectiveScale;
        const centerY = CANVAS_PAD_Y + (y + height / 2) * effectiveScale;
        const targetLeft = Math.max(0, centerX - scrollEl.clientWidth / 2);
        const targetTop = Math.max(0, centerY - scrollEl.clientHeight / 2);
        scrollEl.scrollTo({
          left: targetLeft,
          top: targetTop,
          behavior,
        });
      });
    },
    [effectiveScale]
  );

  const centerOnNode = useCallback(
    (pipelineId, behavior = 'smooth') => {
      const idx = nodes.findIndex((n) => n.pipelineId === pipelineId);
      if (idx === -1) return;
      const targetNode = nodes[idx];
      const posX = targetNode.positionX ?? triggerX;
      const posY = targetNode.positionY ?? 170 + idx * 145;
      const cardH = mode === 'monitor' ? 78 : CARD_HEIGHT;
      centerOnCanvasCoords(posX, posY, CARD_WIDTH, cardH, behavior);
    },
    [nodes, triggerX, mode, centerOnCanvasCoords]
  );

  // Initialize scroll position so the workflow chain starts centered horizontally near the top
  useEffect(() => {
    if (hasInitializedScroll.current) return;
    const scrollEl = scrollContainerRef.current;
    if (!scrollEl) return;
    hasInitializedScroll.current = true;
    const initialCenterX = CANVAS_PAD_X + (triggerX + CARD_WIDTH / 2) * effectiveScale;
    const initialLeft = Math.max(0, initialCenterX - scrollEl.clientWidth / 2);
    const initialTop = Math.max(0, CANVAS_PAD_Y - 24);
    scrollEl.scrollTo({ left: initialLeft, top: initialTop, behavior: 'auto' });
  }, [triggerX, effectiveScale]);

  const handleNodeMouseDown = (pipelineId, e) => {
    if (mode !== 'builder' || e.button !== 0) return;
    e.preventDefault();
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
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    const x = rect ? (e.clientX - rect.left) / effectiveScale : 0;
    const y = rect ? (e.clientY - rect.top) / effectiveScale : 0;
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
    // Safety guard: if primary mouse button is no longer pressed, end any active drag immediately
    if ((draggingNode || connectingFrom) && typeof e.buttons === 'number' && (e.buttons & 1) === 0) {
      setDraggingNode(null);
      setConnectingFrom(null);
      return;
    }

    if (draggingNode && onMoveNode) {
      const dx = (e.clientX - draggingNode.startMouseX) / effectiveScale;
      const dy = (e.clientY - draggingNode.startMouseY) / effectiveScale;
      const moved = Math.abs(dx) > 3 || Math.abs(dy) > 3 || draggingNode.moved;
      if (moved) {
        setDraggingNode((prev) => (prev ? { ...prev, moved: true } : null));
        onMoveNode(
          draggingNode.pipelineId,
          Math.max(24, Math.round(draggingNode.origX + dx)),
          Math.max(24, Math.round(draggingNode.origY + dy))
        );
      }
    } else if (connectingFrom && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setConnectingFrom((prev) =>
        prev
          ? {
              ...prev,
              mouseX: (e.clientX - rect.left) / effectiveScale,
              mouseY: (e.clientY - rect.top) / effectiveScale,
            }
          : null
      );
    }
  };

  const handleMouseUp = () => {
    if (draggingNode) {
      if (!draggingNode.moved) {
        centerOnNode(draggingNode.pipelineId, 'smooth');
        if (onSelectNode) {
          onSelectNode(draggingNode.pipelineId);
        }
      }
      setDraggingNode(null);
    }
    if (connectingFrom) {
      setConnectingFrom(null);
    }
  };

  useEffect(() => {
    if (!draggingNode && !connectingFrom) return;
    const handleWindowMouseUp = () => {
      setDraggingNode((prev) => {
        if (prev && !prev.moved) {
          centerOnNode(prev.pipelineId, 'smooth');
          if (onSelectNode) {
            onSelectNode(prev.pipelineId);
          }
        }
        return null;
      });
      setConnectingFrom(null);
    };
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('blur', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('blur', handleWindowMouseUp);
    };
  }, [draggingNode, connectingFrom, onSelectNode, centerOnNode]);

  const maxNodeY =
    nodes.length > 0 ? Math.max(...nodes.map((n) => n.positionY ?? 170)) : TRIGGER_Y;
  const maxAddPillY =
    nodes.length > 0 ? maxNodeY + CARD_HEIGHT + 58 : TRIGGER_Y + CARD_HEIGHT + 58;

  const canvasWidth = Math.max(
    920,
    ...nodes.map((n) => (n.positionX ?? TRIGGER_X) + CARD_WIDTH + 80),
    triggerX + CARD_WIDTH + 80
  );
  const canvasHeight = Math.max(
    680,
    ...nodes.map((n) => (n.positionY ?? 170) + 240),
    maxAddPillY + 120
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
      ref={scrollContainerRef}
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
              title="Auto-align workflow stages (series & parallel)"
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
              : topologyInfo.chainCount > 1
                ? `${topologyInfo.chainCount} Disconnected Chains — Link into 1 chain before running`
                : `${topologyInfo.chainCount || 1} Not Validated Chains — Validate the chain before running`}
        </div>
      </div>

      {/* Padded Scrollable Canvas Wrapper */}
      <div
        onClick={() => onSelectTrigger && onSelectTrigger()}
        style={{
          position: 'relative',
          width: canvasWidth * effectiveScale + CANVAS_PAD_X * 2,
          height: canvasHeight * effectiveScale + CANVAS_PAD_Y * 2,
        }}
      >
        {/* Scalable Canvas Surface */}
        <div
          ref={containerRef}
          style={{
            position: 'absolute',
            left: CANVAS_PAD_X,
            top: CANVAS_PAD_Y,
            width: canvasWidth,
            height: canvasHeight,
            transform: `scale(${effectiveScale})`,
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
                triggerX + CARD_WIDTH / 2,
                TRIGGER_Y + 62,
                (primaryHead.positionX ?? triggerX) + CARD_WIDTH / 2,
                (primaryHead.positionY ?? 170) - 6
              )}
              stroke={COLORS.text.secondary}
              strokeWidth="1.6"
              fill="none"
              markerEnd="url(#wf-arrow)"
            />
          )}

          {/* Arrows for Series & Parallel DAG Edges */}
          {edges.map((edge) => {
            const srcNode = nodes.find((n) => n.pipelineId === edge.sourcePipelineId);
            const tgtNode = nodes.find((n) => n.pipelineId === edge.targetPipelineId);
            if (!srcNode || !tgtNode) return null;

            const srcHeight = mode === 'monitor' ? 78 : CARD_HEIGHT;
            const x1 = (srcNode.positionX ?? triggerX) + CARD_WIDTH / 2;
            const y1 = (srcNode.positionY ?? 170) + srcHeight;
            const x2 = (tgtNode.positionX ?? triggerX) + CARD_WIDTH / 2;
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

          {/* Dashed Arrow(s) from Each Leaf Node (or Trigger) to its own "+ Add Workflow Steps" Pill */}
          {mode === 'builder' &&
            (leafNodes.length > 0 ? (
              leafNodes.map((leaf) => {
                const leafCenterX = (leaf.positionX ?? triggerX) + CARD_WIDTH / 2;
                const leafBottomY = (leaf.positionY ?? 170) + CARD_HEIGHT;
                const pillTopY = leafBottomY + 58 - 4;
                return (
                  <path
                    key={`leaf-to-add-${leaf.pipelineId}`}
                    d={buildBezierPath(leafCenterX, leafBottomY, leafCenterX, pillTopY)}
                    stroke={COLORS.text.secondary}
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    fill="none"
                    markerEnd="url(#wf-arrow)"
                  />
                );
              })
            ) : (
              <path
                d={buildBezierPath(
                  triggerX + CARD_WIDTH / 2,
                  TRIGGER_Y + 62,
                  triggerX + CARD_WIDTH / 2,
                  TRIGGER_Y + CARD_HEIGHT + 58 - 4
                )}
                stroke={COLORS.text.secondary}
                strokeWidth="1.5"
                strokeDasharray="4 3"
                fill="none"
                markerEnd="url(#wf-arrow)"
              />
            ))}

          {/* Active Drag-to-Connect Line */}
          {connectingFrom && (() => {
            const srcNode = nodes.find((n) => n.pipelineId === connectingFrom.sourcePipelineId);
            if (!srcNode) return null;
            const x1 = (srcNode.positionX ?? triggerX) + CARD_WIDTH / 2;
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

        {/* '+' Icon on Trigger -> Primary Head Edge (Insert at Start of Chain) */}
        {mode === 'builder' && primaryHead && (() => {
          const x1 = triggerX + CARD_WIDTH / 2;
          const y1 = TRIGGER_Y + 62;
          const x2 = (primaryHead.positionX ?? triggerX) + CARD_WIDTH / 2;
          const y2 = (primaryHead.positionY ?? 170) - 6;
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const isAddTriggerSelected =
            selectedItem?.type === 'add' && selectedItem?.afterPipelineId === '__TRIGGER__';

          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenAddStep) onOpenAddStep('__TRIGGER__', 'SERIES');
              }}
              title="Add pipeline step at start of chain"
              style={{
                position: 'absolute',
                left: midX,
                top: midY,
                transform: 'translate(-50%, -50%)',
                zIndex: 4,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: isAddTriggerSelected ? COLORS.brand.primary : COLORS.background.primary,
                color: isAddTriggerSelected ? '#fff' : COLORS.brand.primary,
                border: `1.5px solid ${COLORS.brand.primary}`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                cursor: 'pointer',
                boxShadow: SHADOWS.sm,
                transition: 'all 0.12s ease',
              }}
            >
              <i className="fa-solid fa-plus" style={{ fontSize: 10, lineHeight: 1 }} />
            </button>
          );
        })()}

        {/* Clickable Failure-Action Badges & '+' Insert Icon on Each Edge Midpoint */}
        {edges.map((edge) => {
          const srcNode = nodes.find((n) => n.pipelineId === edge.sourcePipelineId);
          const tgtNode = nodes.find((n) => n.pipelineId === edge.targetPipelineId);
          if (!srcNode || !tgtNode) return null;

          const srcHeight = mode === 'monitor' ? 78 : CARD_HEIGHT;
          const x1 = (srcNode.positionX ?? triggerX) + CARD_WIDTH / 2;
          const y1 = (srcNode.positionY ?? 170) + srcHeight;
          const x2 = (tgtNode.positionX ?? triggerX) + CARD_WIDTH / 2;
          const y2 = (tgtNode.positionY ?? 170) - 6;

          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const badgeCfg = EDGE_BADGE_MAP[edge.onFailureAction || 'STOP_WORKFLOW'];
          const isAddEdgeSelected =
            selectedItem?.type === 'add' && selectedItem?.afterPipelineId === edge.sourcePipelineId;

          return (
            <div
              key={`badge-${edge.sourcePipelineId}-${edge.targetPipelineId}`}
              style={{
                position: 'absolute',
                left: midX,
                top: midY,
                transform: 'translate(-50%, -50%)',
                zIndex: 4,
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectEdge) onSelectEdge(edge.sourcePipelineId, edge.targetPipelineId);
                }}
                title="Click to configure failure behavior on this link"
                style={{
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

              {mode === 'builder' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenAddStep) onOpenAddStep(edge.sourcePipelineId, 'PARALLEL');
                  }}
                  title={`Add pipeline step after ${srcNode.pipelineName} (parallel or series)`}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: isAddEdgeSelected ? COLORS.brand.primary : COLORS.background.primary,
                    color: isAddEdgeSelected ? '#fff' : COLORS.brand.primary,
                    border: `1.5px solid ${COLORS.brand.primary}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    cursor: 'pointer',
                    boxShadow: SHADOWS.sm,
                    flexShrink: 0,
                    transition: 'all 0.12s ease',
                  }}
                >
                  <i className="fa-solid fa-plus" style={{ fontSize: 10, lineHeight: 1 }} />
                </button>
              )}
            </div>
          );
        })}

        {/* Trigger Card */}
        <div
          style={{
            position: 'absolute',
            left: triggerX,
            top: TRIGGER_Y,
            zIndex: 2,
          }}
          onClick={(e) => {
            e.stopPropagation();
            centerOnCanvasCoords(triggerX, TRIGGER_Y, CARD_WIDTH, CARD_HEIGHT, 'smooth');
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
          const posX = node.positionX ?? triggerX;
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
                stepNumber={node.stepNumber || index + 1}
                selected={isSelected}
                isRunningNode={isRunning}
                incomingEdge={incomingByTarget[node.pipelineId]?.[0]}
                mode={mode}
                isConnecting={Boolean(connectingFrom)}
                onMouseDown={(e) => handleNodeMouseDown(node.pipelineId, e)}
                onClick={() => {
                  centerOnNode(node.pipelineId, 'smooth');
                  if (onSelectNode) onSelectNode(node.pipelineId);
                }}
                onStartConnect={handleStartConnect}
                onCompleteConnect={handleCompleteConnect}
                onRemove={onRemoveNode}
              />
            </div>
          );
        })}

        {/* "+ Add Workflow Steps" Pill Button(s) — one per leaf branch (or one below Trigger when empty) */}
        {mode === 'builder' &&
          (leafNodes.length > 0 ? (
            leafNodes.map((leaf) => {
              const leafCenterX = (leaf.positionX ?? triggerX) + CARD_WIDTH / 2;
              const pillTopY = (leaf.positionY ?? 170) + CARD_HEIGHT + 58;
              return (
                <div
                  key={`add-pill-${leaf.pipelineId}`}
                  style={{
                    position: 'absolute',
                    left: leafCenterX,
                    top: pillTopY,
                    transform: 'translateX(-50%)',
                    zIndex: 3,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <AddWorkflowStepPill
                    active={
                      selectedItem?.type === 'add' &&
                      selectedItem?.afterPipelineId === leaf.pipelineId
                    }
                    onClick={() => {
                      centerOnCanvasCoords(leafCenterX - 90, pillTopY, 180, 34, 'smooth');
                      if (onOpenAddStep) onOpenAddStep(leaf.pipelineId, 'PARALLEL');
                    }}
                  />
                </div>
              );
            })
          ) : (
            <div
              style={{
                position: 'absolute',
                left: triggerX + CARD_WIDTH / 2,
                top: TRIGGER_Y + CARD_HEIGHT + 58,
                transform: 'translateX(-50%)',
                zIndex: 3,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <AddWorkflowStepPill
                active={
                  selectedItem?.type === 'add' &&
                  selectedItem?.afterPipelineId === null
                }
                onClick={() => {
                  centerOnCanvasCoords(
                    triggerX + CARD_WIDTH / 2 - 90,
                    TRIGGER_Y + CARD_HEIGHT + 58,
                    180,
                    34,
                    'smooth'
                  );
                  if (onOpenAddStep) onOpenAddStep(null, 'PARALLEL');
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkflowCanvas;

