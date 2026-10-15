import React, { useEffect, useRef, useState } from 'react';
import AddWorkflowStepPill from './AddWorkflowStepPill';
import WorkflowCanvasToolbar from './WorkflowCanvasToolbar';
import WorkflowCanvasWires from './WorkflowCanvasWires';
import WorkflowEdgeBadges from './WorkflowEdgeBadges';
import WorkflowNodeCard from './WorkflowNodeCard';
import { BASE_SCALE, CARD_HEIGHT, CARD_WIDTH, TRIGGER_X, TRIGGER_Y } from './workflowLayout';

const CANVAS_PAD_X = 480; const CANVAS_PAD_Y = 320;

const WorkflowCanvas = ({
  nodes = [], edges = [], mode = 'builder', currentPipelineId = null, selectedItem = null,
  topologyInfo = { chainCount: 0, singleChainReady: false }, onSelectTrigger, onSelectNode,
  onSelectEdge, onOpenAddStep, onMoveNode, onConnectNodes, onRemoveNode, onAutoArrange,
}) => {
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const hasInitScroll = useRef(false);
  const [zoom, setZoom] = useState(1);
  const effectiveScale = zoom * BASE_SCALE;
  const [draggingNode, setDraggingNode] = useState(null);
  const [connectingFrom, setConnectingFrom] = useState(null);

  const inMap = {}; const outMap = {};
  edges.forEach((e) => { (inMap[e.targetPipelineId] = inMap[e.targetPipelineId] || []).push(e); (outMap[e.sourcePipelineId] = outMap[e.sourcePipelineId] || []).push(e); });
  const headNodes = nodes.filter((n) => !(inMap[n.pipelineId]?.length > 0));
  const primaryHead = headNodes[0] || null;
  const leafNodes = nodes.filter((n) => !(outMap[n.pipelineId]?.length > 0));
  const triggerX = primaryHead ? (primaryHead.positionX ?? TRIGGER_X) : TRIGGER_X;

  useEffect(() => {
    if (hasInitScroll.current || !scrollRef.current) return;
    hasInitScroll.current = true;
    const initialCenterX = CANVAS_PAD_X + (triggerX + CARD_WIDTH / 2) * effectiveScale;
    scrollRef.current.scrollTo({ left: Math.max(0, initialCenterX - scrollRef.current.clientWidth / 2), top: Math.max(0, CANVAS_PAD_Y - 24) });
  }, [triggerX, effectiveScale]);

  const handleNodeMouseDown = (pid, e) => {
    if (mode !== 'builder' || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const t = nodes.find((n) => n.pipelineId === pid);
    if (t) setDraggingNode({ pid, startX: e.clientX, startY: e.clientY, origX: t.positionX ?? TRIGGER_X, origY: t.positionY ?? 170 });
  };
  const handleStartConnect = (sourcePipelineId, e) => {
    if (mode !== 'builder') return;
    e.preventDefault();
    const r = containerRef.current?.getBoundingClientRect();
    setConnectingFrom({ sourcePipelineId, mouseX: r ? (e.clientX - r.left) / effectiveScale : 0, mouseY: r ? (e.clientY - r.top) / effectiveScale : 0 });
  };
  const handleMouseMove = (e) => {
    if (draggingNode && onMoveNode) {
      const dx = (e.clientX - draggingNode.startX) / effectiveScale;
      const dy = (e.clientY - draggingNode.startY) / effectiveScale;
      onMoveNode(draggingNode.pid, Math.max(24, Math.round(draggingNode.origX + dx)), Math.max(24, Math.round(draggingNode.origY + dy)));
    } else if (connectingFrom && containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      setConnectingFrom((prev) => prev ? { ...prev, mouseX: (e.clientX - r.left) / effectiveScale, mouseY: (e.clientY - r.top) / effectiveScale } : null);
    }
  };
  const handleMouseUp = () => { setDraggingNode(null); setConnectingFrom(null); };

  const canvasWidth = Math.max(920, ...nodes.map((n) => (n.positionX ?? TRIGGER_X) + CARD_WIDTH + 80), triggerX + CARD_WIDTH + 80);
  const canvasHeight = Math.max(680, ...nodes.map((n) => (n.positionY ?? 170) + 240), TRIGGER_Y + 300);

  return (
    <div id="workflow-canvas-scroll-container" ref={scrollRef} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
      className="flex-1 h-full relative overflow-auto bg-slate-50 [background-image:radial-gradient(#CBD5E1_1.25px,transparent_1.25px)] [background-size:20px_20px]">
      <WorkflowCanvasToolbar mode={mode} onAutoArrange={onAutoArrange} zoom={zoom} onZoomChange={setZoom} topologyInfo={topologyInfo} nodeCount={nodes.length} />
      <div id="workflow-canvas-surface-wrapper" onClick={onSelectTrigger} className="relative" style={{ width: canvasWidth * effectiveScale + CANVAS_PAD_X * 2, height: canvasHeight * effectiveScale + CANVAS_PAD_Y * 2 }}>
        <div id="workflow-canvas-surface" ref={containerRef} className="absolute origin-top-left" style={{ left: CANVAS_PAD_X, top: CANVAS_PAD_Y, width: canvasWidth, height: canvasHeight, transform: `scale(${effectiveScale})` }}>
          <WorkflowCanvasWires nodes={nodes} edges={edges} primaryHead={primaryHead} leafNodes={leafNodes} triggerX={triggerX} mode={mode} selectedItem={selectedItem} connectingFrom={connectingFrom} canvasHeight={canvasHeight} />
          <WorkflowEdgeBadges nodes={nodes} edges={edges} triggerX={triggerX} primaryHead={primaryHead} mode={mode} selectedItem={selectedItem} onOpenAddStep={onOpenAddStep} onSelectEdge={onSelectEdge} />
          <div id="workflow-trigger-anchor" className="absolute z-[2]" style={{ left: triggerX, top: TRIGGER_Y }} onClick={(e) => { e.stopPropagation(); onSelectTrigger?.(); }}>
            <WorkflowNodeCard isTrigger selected={selectedItem?.type === 'trigger'} />
          </div>
          {nodes.map((node, i) => (
            <div key={node.pipelineId} id={`workflow-node-anchor-${node.pipelineId}`} className={`absolute ${selectedItem?.pipelineId === node.pipelineId ? 'z-[5]' : 'z-[2]'}`} style={{ left: node.positionX ?? triggerX, top: node.positionY ?? (170 + i * 145) }} onClick={(e) => e.stopPropagation()}>
              <WorkflowNodeCard node={node} stepNumber={node.stepNumber || i + 1} selected={selectedItem?.type === 'node' && selectedItem?.pipelineId === node.pipelineId}
                isRunningNode={currentPipelineId === node.pipelineId || node.pipelineStatus === 'RUNNING'} mode={mode} isConnecting={Boolean(connectingFrom)}
                onMouseDown={(e) => handleNodeMouseDown(node.pipelineId, e)} onClick={() => onSelectNode?.(node.pipelineId)} onStartConnect={handleStartConnect}
                onCompleteConnect={(tId) => { if (connectingFrom && connectingFrom.sourcePipelineId !== tId) onConnectNodes?.(connectingFrom.sourcePipelineId, tId); setConnectingFrom(null); }} onRemove={onRemoveNode} />
            </div>
          ))}
          {mode === 'builder' && (leafNodes.length > 0 ? leafNodes.map((leaf) => (
            <div key={`add-pill-${leaf.pipelineId}`} id={`workflow-add-pill-anchor-${leaf.pipelineId}`} className="absolute -translate-x-1/2 z-[3]" style={{ left: (leaf.positionX ?? triggerX) + CARD_WIDTH / 2, top: (leaf.positionY ?? 170) + CARD_HEIGHT + 58 }} onClick={(e) => e.stopPropagation()}>
              <AddWorkflowStepPill active={selectedItem?.type === 'add' && selectedItem?.afterPipelineId === leaf.pipelineId} onClick={() => onOpenAddStep?.(leaf.pipelineId, 'PARALLEL')} />
            </div>
          )) : (
            <div id="workflow-add-pill-anchor-root" className="absolute -translate-x-1/2 z-[3]" style={{ left: triggerX + CARD_WIDTH / 2, top: TRIGGER_Y + CARD_HEIGHT + 58 }} onClick={(e) => e.stopPropagation()}>
              <AddWorkflowStepPill active={selectedItem?.type === 'add' && selectedItem?.afterPipelineId === null} onClick={() => onOpenAddStep?.(null, 'PARALLEL')} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkflowCanvas;
