import { useCallback, useState } from 'react';
import { useNotify } from '../../contexts/NotificationContext';
import { createsCycle, layoutDagNodes, TRIGGER_X } from './workflowLayout';
import { computeClientTopology } from './workflowTopology';

export function useWorkflowGraph(initialNodes = [], initialEdges = []) {
  const notify = useNotify();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const handleAddStep = useCallback((pSummary, attachAfterId, onFailureAction = 'STOP_WORKFLOW', connMode = 'PARALLEL') => {
    if (nodes.some((n) => n.pipelineId === pSummary.id)) {
      notify.warning('This pipeline is already in the workflow.');
      return;
    }
    const newNode = {
      pipelineId: pSummary.id, pipelineName: pSummary.name,
      sourceName: pSummary.sourceConnectionName || 'Source', targetName: pSummary.targetConnectionName || 'Target',
      tableCount: pSummary.tableCount ?? 0, pipelineStatus: pSummary.status || 'VALIDATED',
      positionX: TRIGGER_X, positionY: 165,
    };
    let nextEdges = [...edges];
    if (attachAfterId === '__TRIGGER__') {
      const currentHeads = nodes.filter((n) => !edges.some((e) => e.targetPipelineId === n.pipelineId));
      currentHeads.forEach((h) => nextEdges.push({ sourcePipelineId: newNode.pipelineId, targetPipelineId: h.pipelineId, onFailureAction }));
    } else if (attachAfterId) {
      const existingOut = nextEdges.filter((e) => e.sourcePipelineId === attachAfterId);
      if (connMode === 'SERIES' && existingOut.length > 0) {
        nextEdges = nextEdges.filter((e) => e.sourcePipelineId !== attachAfterId);
        nextEdges.push({ sourcePipelineId: attachAfterId, targetPipelineId: newNode.pipelineId, onFailureAction });
        existingOut.forEach((out) => nextEdges.push({ sourcePipelineId: newNode.pipelineId, targetPipelineId: out.targetPipelineId, onFailureAction: out.onFailureAction || onFailureAction }));
      } else {
        nextEdges.push({ sourcePipelineId: attachAfterId, targetPipelineId: newNode.pipelineId, onFailureAction });
      }
    }
    const arranged = layoutDagNodes([...nodes, newNode], nextEdges);
    setNodes(arranged); setEdges(nextEdges);
    return newNode.pipelineId;
  }, [nodes, edges, notify]);

  const handleConnectNodes = useCallback((srcId, tgtId) => {
    if (edges.some((e) => e.sourcePipelineId === srcId && e.targetPipelineId === tgtId)) return true;
    if (createsCycle(edges, srcId, tgtId)) {
      notify.error('Circular pipeline connections are not allowed.');
      return false;
    }
    setEdges((prev) => [...prev, { sourcePipelineId: srcId, targetPipelineId: tgtId, onFailureAction: 'STOP_WORKFLOW' }]);
    return true;
  }, [edges, notify]);

  const handleRemoveNode = useCallback((pid) => {
    const inE = edges.filter((e) => e.targetPipelineId === pid);
    const outE = edges.filter((e) => e.sourcePipelineId === pid);
    let nextE = edges.filter((e) => e.sourcePipelineId !== pid && e.targetPipelineId !== pid);
    inE.forEach((ie) => outE.forEach((oe) => {
      if (ie.sourcePipelineId !== oe.targetPipelineId && !nextE.some((e) => e.sourcePipelineId === ie.sourcePipelineId && e.targetPipelineId === oe.targetPipelineId) && !createsCycle(nextE, ie.sourcePipelineId, oe.targetPipelineId)) {
        nextE.push({ sourcePipelineId: ie.sourcePipelineId, targetPipelineId: oe.targetPipelineId, onFailureAction: ie.onFailureAction || 'STOP_WORKFLOW' });
      }
    }));
    setNodes((prev) => layoutDagNodes(prev.filter((n) => n.pipelineId !== pid), nextE));
    setEdges(nextE);
  }, [edges]);

  const handleUpdateEdge = useCallback((src, tgt, action) => {
    setEdges((prev) => prev.map((e) => (e.sourcePipelineId === src && e.targetPipelineId === tgt ? { ...e, onFailureAction: action } : e)));
    notify.success('Failure action updated');
  }, [notify]);

  const handleDeleteEdge = useCallback((src, tgt) => {
    setEdges((prev) => prev.filter((e) => !(e.sourcePipelineId === src && e.targetPipelineId === tgt)));
  }, []);

  const handleMoveNode = useCallback((pid, x, y) => {
    setNodes((prev) => prev.map((n) => (n.pipelineId === pid ? { ...n, positionX: x, positionY: y } : n)));
  }, []);

  const handleAutoArrange = useCallback(() => { setNodes((prev) => layoutDagNodes(prev, edges)); }, [edges]);

  const topologyInfo = computeClientTopology(nodes, edges);
  return {
    nodes, setNodes, edges, setEdges, topologyInfo, handleAddStep, handleConnectNodes,
    handleRemoveNode, handleUpdateEdge, handleDeleteEdge, handleMoveNode, handleAutoArrange,
  };
}
