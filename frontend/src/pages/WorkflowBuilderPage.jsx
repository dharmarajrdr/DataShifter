import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ApiGuard from '../components/common/ApiGuard';
import StatusBadge from '../components/common/StatusBadge';
import WorkflowCanvas from '../components/workflow/WorkflowCanvas';
import WorkflowInspectorPanel from '../components/workflow/WorkflowInspectorPanel';
import { BORDER_RADIUS, COLORS, FONT, HEADER_HEIGHT, SHADOWS } from '../constants/design';
import { useNotify } from '../contexts/NotificationContext';
import { connectionApi, namespaceApi, workflowApi } from '../services/api';

const TRIGGER_X = 360;
const STAGE_X_GAP = 360;
const STAGE_Y_START = 165;
const STAGE_Y_GAP = 155;

/**
 * Compute topological order, stage levels, chain count, and single-chain readiness for a DAG on the client.
 */
export function computeClientTopology(nodes, edges) {
  if (!nodes || nodes.length === 0) {
    return {
      orderedNodes: [],
      chainCount: 0,
      singleChainReady: false,
      validationErrors: ['Workflow must contain at least one pipeline.'],
    };
  }

  const nodeMap = new Map(nodes.map((n) => [n.pipelineId, n]));
  const outgoingMap = new Map();
  const incomingMap = new Map();
  const inDegree = new Map();

  nodes.forEach((n) => {
    outgoingMap.set(n.pipelineId, []);
    incomingMap.set(n.pipelineId, []);
    inDegree.set(n.pipelineId, 0);
  });

  const seenEdgeKeys = new Set();
  (edges || []).forEach((e) => {
    const key = `${e.sourcePipelineId}->${e.targetPipelineId}`;
    if (
      !seenEdgeKeys.has(key) &&
      nodeMap.has(e.sourcePipelineId) &&
      nodeMap.has(e.targetPipelineId)
    ) {
      seenEdgeKeys.add(key);
      outgoingMap.get(e.sourcePipelineId).push(e.targetPipelineId);
      incomingMap.get(e.targetPipelineId).push(e.sourcePipelineId);
      inDegree.set(e.targetPipelineId, (inDegree.get(e.targetPipelineId) || 0) + 1);
    }
  });

  const nodeComparator = (a, b) => {
    const dy = (a.positionY ?? 0) - (b.positionY ?? 0);
    if (Math.abs(dy) > 1e-3) return dy;
    const dx = (a.positionX ?? 0) - (b.positionX ?? 0);
    if (Math.abs(dx) > 1e-3) return dx;
    return String(a.pipelineId).localeCompare(String(b.pipelineId));
  };

  const heads = nodes
    .filter((n) => (inDegree.get(n.pipelineId) || 0) === 0)
    .sort(nodeComparator);

  const stageLevelMap = new Map();
  heads.forEach((h) => stageLevelMap.set(h.pipelineId, 0));

  const queue = heads.map((h) => h.pipelineId);
  const visited = new Set();
  const rawOrdered = [];

  while (queue.length > 0) {
    const currId = queue.shift();
    if (visited.has(currId)) continue;
    visited.add(currId);
    const currNode = nodeMap.get(currId);
    if (currNode) rawOrdered.push(currNode);

    const currLevel = stageLevelMap.get(currId) ?? 0;
    const neighbors = [...(outgoingMap.get(currId) || [])].sort((idA, idB) =>
      nodeComparator(nodeMap.get(idA) || {}, nodeMap.get(idB) || {})
    );

    neighbors.forEach((nbrId) => {
      const prevLevel = stageLevelMap.get(nbrId) ?? 0;
      stageLevelMap.set(nbrId, Math.max(prevLevel, currLevel + 1));
      const newDeg = (inDegree.get(nbrId) || 1) - 1;
      inDegree.set(nbrId, newDeg);
      if (newDeg <= 0 && !visited.has(nbrId)) {
        queue.push(nbrId);
      }
    });
  }

  let extraChains = 0;
  const remaining = nodes.filter((n) => !visited.has(n.pipelineId)).sort(nodeComparator);
  remaining.forEach((n) => {
    if (!visited.has(n.pipelineId)) {
      extraChains += 1;
      const bfs = [n.pipelineId];
      while (bfs.length > 0) {
        const cid = bfs.shift();
        if (visited.has(cid)) continue;
        visited.add(cid);
        if (!stageLevelMap.has(cid)) stageLevelMap.set(cid, 0);
        const cn = nodeMap.get(cid);
        if (cn) rawOrdered.push(cn);
        (outgoingMap.get(cid) || []).forEach((nbr) => {
          if (!visited.has(nbr)) {
            stageLevelMap.set(nbr, (stageLevelMap.get(cid) ?? 0) + 1);
            bfs.push(nbr);
          }
        });
      }
    }
  });

  // Group by stageLevel so parallel branches get clear labels (#2.1, #2.2, etc.)
  const levelGroups = new Map();
  rawOrdered.forEach((n) => {
    const lvl = stageLevelMap.get(n.pipelineId) ?? 0;
    if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
    levelGroups.get(lvl).push(n);
  });

  levelGroups.forEach((group) => {
    group.sort((a, b) => (a.positionX ?? 0) - (b.positionX ?? 0));
  });

  const orderedNodes = rawOrdered.map((n, idx) => {
    const lvl = stageLevelMap.get(n.pipelineId) ?? 0;
    const group = levelGroups.get(lvl) || [n];
    const branchIdx = group.findIndex((item) => item.pipelineId === n.pipelineId);
    const stepLabel =
      group.length > 1 ? `${lvl + 1}.${branchIdx + 1}` : `${lvl + 1}`;
    return {
      ...n,
      stageLevel: lvl,
      parallelCount: group.length,
      parallelIndex: branchIdx,
      stepNumber: stepLabel,
      topoIndex: idx + 1,
    };
  });

  const chainCount = heads.length + extraChains;
  const validationErrors = [];

  if (chainCount > 1) {
    validationErrors.push(
      `Workflow has ${chainCount} disconnected chains. Link all pipelines into 1 connected workflow (with a single start pipeline) before running.`
    );
  }

  orderedNodes.forEach((n) => {
    if (['DRAFT', 'NOT_VALIDATED', 'INVALID'].includes(n.pipelineStatus)) {
      validationErrors.push(
        `Pipeline '${n.pipelineName}' is in ${n.pipelineStatus} status and must be VALIDATED.`
      );
    }
  });

  const singleChainReady =
    nodes.length >= 1 &&
    chainCount === 1 &&
    orderedNodes.length === nodes.length &&
    validationErrors.length === 0;

  return {
    orderedNodes,
    chainCount,
    singleChainReady,
    validationErrors,
  };
}

/**
 * Auto-layout DAG nodes by stageLevel, aligning child steps under their parent branch(es)
 * and placing parallel sibling branches side-by-side horizontally.
 */
export function layoutDagNodes(nodes, edges) {
  const topo = computeClientTopology(nodes, edges);
  const levelGroups = new Map();
  const incomingMap = new Map();

  topo.orderedNodes.forEach((n) => {
    const lvl = n.stageLevel ?? 0;
    if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
    levelGroups.get(lvl).push(n);
    incomingMap.set(n.pipelineId, []);
  });

  (edges || []).forEach((e) => {
    if (incomingMap.has(e.targetPipelineId)) {
      incomingMap.get(e.targetPipelineId).push(e.sourcePipelineId);
    }
  });

  const maxCountInAnyLevel = Math.max(
    1,
    ...Array.from(levelGroups.values()).map((g) => g.length)
  );
  const centerX = Math.max(
    TRIGGER_X,
    Math.round(((maxCountInAnyLevel - 1) * STAGE_X_GAP) / 2) + 60
  );

  const posMap = new Map();
  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);

  sortedLevels.forEach((lvl) => {
    const group = levelGroups.get(lvl) || [];
    if (lvl === 0) {
      const count = group.length;
      const startX = centerX - ((count - 1) * STAGE_X_GAP) / 2;
      group.forEach((n, i) => {
        posMap.set(n.pipelineId, {
          positionX: Math.round(startX + i * STAGE_X_GAP),
          positionY: STAGE_Y_START + lvl * STAGE_Y_GAP,
        });
      });
      return;
    }

    // Group nodes at this level by their parent signature so siblings from the same parent fan out around their parent
    const siblingBuckets = new Map();
    group.forEach((n) => {
      const parents = (incomingMap.get(n.pipelineId) || [])
        .filter((pid) => posMap.has(pid))
        .sort();
      const sig = parents.length > 0 ? parents.join('|') : `__root_${n.pipelineId}`;
      if (!siblingBuckets.has(sig)) {
        siblingBuckets.set(sig, { parents, items: [] });
      }
      siblingBuckets.get(sig).items.push(n);
    });

    const desiredCoords = [];
    siblingBuckets.forEach(({ parents, items }) => {
      const anchorX =
        parents.length > 0
          ? parents.reduce((sum, pid) => sum + (posMap.get(pid)?.positionX ?? centerX), 0) /
            parents.length
          : centerX;
      const m = items.length;
      const startX = anchorX - ((m - 1) * STAGE_X_GAP) / 2;
      items.forEach((n, idx) => {
        desiredCoords.push({
          node: n,
          x: startX + idx * STAGE_X_GAP,
        });
      });
    });

    desiredCoords.sort((a, b) => a.x - b.x);

    // Resolve horizontal overlaps if multiple branches fan out at the same stage level
    for (let i = 1; i < desiredCoords.length; i += 1) {
      if (desiredCoords[i].x - desiredCoords[i - 1].x < STAGE_X_GAP) {
        desiredCoords[i].x = desiredCoords[i - 1].x + STAGE_X_GAP;
      }
    }

    desiredCoords.forEach(({ node, x }) => {
      posMap.set(node.pipelineId, {
        positionX: Math.round(x),
        positionY: STAGE_Y_START + lvl * STAGE_Y_GAP,
      });
    });
  });

  // Ensure no node is clipped on the left margin
  const allX = Array.from(posMap.values()).map((p) => p.positionX);
  const minX = allX.length > 0 ? Math.min(...allX) : 32;
  const shiftX = minX < 32 ? 32 - minX : 0;

  return topo.orderedNodes.map((n) => {
    const coords = posMap.get(n.pipelineId) || {
      positionX: TRIGGER_X,
      positionY: STAGE_Y_START,
    };
    return {
      ...n,
      positionX: coords.positionX + shiftX,
      positionY: coords.positionY,
    };
  });
}

/**
 * Check if adding source -> target creates a cycle in a multi-edge DAG.
 */
function createsCycle(edges, sourceId, targetId) {
  if (sourceId === targetId) return true;
  const adj = new Map();
  edges.forEach((e) => {
    if (!adj.has(e.sourcePipelineId)) adj.set(e.sourcePipelineId, []);
    adj.get(e.sourcePipelineId).push(e.targetPipelineId);
  });
  if (!adj.has(sourceId)) adj.set(sourceId, []);
  adj.get(sourceId).push(targetId);

  // Check if sourceId is reachable from targetId
  const visited = new Set();
  const stack = [targetId];
  while (stack.length > 0) {
    const curr = stack.pop();
    if (curr === sourceId) return true;
    if (visited.has(curr)) continue;
    visited.add(curr);
    const nexts = adj.get(curr) || [];
    for (const nxt of nexts) {
      stack.push(nxt);
    }
  }
  return false;
}

const WorkflowBuilderPage = () => {
  const { workflowId } = useParams();
  const isEditMode = Boolean(workflowId);
  const navigate = useNavigate();
  const notify = useNotify();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [workflowMeta, setWorkflowMeta] = useState({
    name: '',
    description: '',
    namespaceId: '',
    status: 'DRAFT',
  });
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [eligiblePipelines, setEligiblePipelines] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [connectionsMap, setConnectionsMap] = useState({});

  // Inspector selection state
  const [inspectorState, setInspectorState] = useState({ mode: 'workflow_meta' });
  const [selectedCanvasItem, setSelectedCanvasItem] = useState({ type: 'trigger' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nsRes, connRes, eligRes] = await Promise.all([
        namespaceApi.getAll().catch(() => ({ data: [] })),
        connectionApi.getAll().catch(() => ({ data: [] })),
        workflowApi.getEligiblePipelines(workflowId || '').catch(() => ({ data: [] })),
      ]);

      setNamespaces(nsRes.data || []);
      const cMap = {};
      (connRes.data || []).forEach((c) => {
        cMap[c.id] = c.name;
      });
      setConnectionsMap(cMap);
      setEligiblePipelines(eligRes.data || []);

      if (isEditMode) {
        const wfRes = await workflowApi.getById(workflowId);
        const wf = wfRes.data;
        if (wf) {
          setWorkflowMeta({
            name: wf.name || '',
            description: wf.description || '',
            namespaceId: wf.namespaceId || '',
            status: wf.status || 'DRAFT',
          });
          setNodes(wf.nodes || []);
          setEdges(wf.edges || []);
        }
      } else {
        setWorkflowMeta({
          name: 'Untitled Workflow',
          description: '',
          namespaceId: '',
          status: 'DRAFT',
        });
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [workflowId, isEditMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const topologyInfo = useMemo(() => computeClientTopology(nodes, edges), [nodes, edges]);

  // Auto-arrange nodes in DAG stages (parallel branches side-by-side horizontally)
  const handleAutoArrange = useCallback(() => {
    setNodes((prevNodes) => layoutDagNodes(prevNodes, edges));
  }, [edges]);

  // Add a new pipeline step from the right-hand Set Action inspector
  const handleAddStep = (
    pipelineSummary,
    attachAfterPipelineId,
    onFailureAction,
    connectionMode = 'PARALLEL'
  ) => {
    if (nodes.some((n) => n.pipelineId === pipelineSummary.id)) {
      notify.warning('This pipeline is already in the workflow.');
      return;
    }

    const isInsertAtHead = attachAfterPipelineId === '__TRIGGER__';
    const newNode = {
      pipelineId: pipelineSummary.id,
      pipelineName: pipelineSummary.name,
      sourceName: connectionsMap[pipelineSummary.sourceConnectionId] || 'Source',
      targetName: connectionsMap[pipelineSummary.targetConnectionId] || 'Target',
      tableCount: pipelineSummary.tableCount ?? 0,
      pipelineStatus: pipelineSummary.status || 'VALIDATED',
      positionX: TRIGGER_X,
      positionY: STAGE_Y_START,
    };

    let updatedEdges = [...edges];
    if (isInsertAtHead) {
      // Connect new root to all existing root nodes (nodes with no incoming edges)
      const currentHeads = nodes.filter(
        (n) => !edges.some((e) => e.targetPipelineId === n.pipelineId)
      );
      currentHeads.forEach((head) => {
        updatedEdges.push({
          sourcePipelineId: newNode.pipelineId,
          targetPipelineId: head.pipelineId,
          onFailureAction: onFailureAction || 'STOP_WORKFLOW',
        });
      });
    } else if (attachAfterPipelineId) {
      const existingOutEdges = updatedEdges.filter(
        (e) => e.sourcePipelineId === attachAfterPipelineId
      );
      if (connectionMode === 'SERIES' && existingOutEdges.length > 0) {
        // Splice new step in series between attachAfterPipelineId and its current outgoing targets
        updatedEdges = updatedEdges.filter(
          (e) => e.sourcePipelineId !== attachAfterPipelineId
        );
        updatedEdges.push({
          sourcePipelineId: attachAfterPipelineId,
          targetPipelineId: newNode.pipelineId,
          onFailureAction: onFailureAction || 'STOP_WORKFLOW',
        });
        existingOutEdges.forEach((outEdge) => {
          updatedEdges.push({
            sourcePipelineId: newNode.pipelineId,
            targetPipelineId: outEdge.targetPipelineId,
            onFailureAction: outEdge.onFailureAction || 'STOP_WORKFLOW',
          });
        });
      } else {
        // PARALLEL mode (or leaf node): attach as a parallel outgoing branch from attachAfterPipelineId
        updatedEdges.push({
          sourcePipelineId: attachAfterPipelineId,
          targetPipelineId: newNode.pipelineId,
          onFailureAction: onFailureAction || 'STOP_WORKFLOW',
        });
      }
    }

    const nextNodes = isInsertAtHead ? [newNode, ...nodes] : [...nodes, newNode];
    const arranged = layoutDagNodes(nextNodes, updatedEdges);

    setNodes(arranged);
    setEdges(updatedEdges);
    setSelectedCanvasItem({ type: 'node', pipelineId: newNode.pipelineId });
    setInspectorState({ mode: 'inspect_node', pipelineId: newNode.pipelineId });
  };

  // Connect two nodes via drag-and-drop on canvas (supports 1->N fan-out and N->1 fan-in)
  const handleConnectNodes = (sourcePipelineId, targetPipelineId) => {
    const alreadyExists = edges.some(
      (e) =>
        e.sourcePipelineId === sourcePipelineId &&
        e.targetPipelineId === targetPipelineId
    );
    if (alreadyExists) {
      setSelectedCanvasItem({ type: 'edge', sourcePipelineId, targetPipelineId });
      setInspectorState({ mode: 'inspect_edge', sourcePipelineId, targetPipelineId });
      return;
    }

    if (createsCycle(edges, sourcePipelineId, targetPipelineId)) {
      notify.error('Circular pipeline connections are not allowed.');
      return;
    }

    const nextEdges = [
      ...edges,
      {
        sourcePipelineId,
        targetPipelineId,
        onFailureAction: 'STOP_WORKFLOW',
      },
    ];
    setEdges(nextEdges);
    setSelectedCanvasItem({ type: 'edge', sourcePipelineId, targetPipelineId });
    setInspectorState({ mode: 'inspect_edge', sourcePipelineId, targetPipelineId });
  };

  // Update incoming failure actions or links from the right-hand inspector
  const handleUpdateNodeLinks = (pipelineId, incomingFailureActionsMap) => {
    if (incomingFailureActionsMap && typeof incomingFailureActionsMap === 'object') {
      setEdges((prev) =>
        prev.map((e) => {
          if (
            e.targetPipelineId === pipelineId &&
            incomingFailureActionsMap[e.sourcePipelineId]
          ) {
            return {
              ...e,
              onFailureAction: incomingFailureActionsMap[e.sourcePipelineId],
            };
          }
          return e;
        })
      );
      notify.success('Step failure rules updated');
    }
  };

  const handleRemoveNode = (pipelineId) => {
    const inEdges = edges.filter((e) => e.targetPipelineId === pipelineId);
    const outEdges = edges.filter((e) => e.sourcePipelineId === pipelineId);

    let nextEdges = edges.filter(
      (e) => e.sourcePipelineId !== pipelineId && e.targetPipelineId !== pipelineId
    );

    // Bridge each incoming predecessor to each outgoing successor if no edge/cycle exists
    inEdges.forEach((inE) => {
      outEdges.forEach((outE) => {
        if (
          inE.sourcePipelineId !== outE.targetPipelineId &&
          !nextEdges.some(
            (e) =>
              e.sourcePipelineId === inE.sourcePipelineId &&
              e.targetPipelineId === outE.targetPipelineId
          ) &&
          !createsCycle(nextEdges, inE.sourcePipelineId, outE.targetPipelineId)
        ) {
          nextEdges.push({
            sourcePipelineId: inE.sourcePipelineId,
            targetPipelineId: outE.targetPipelineId,
            onFailureAction: inE.onFailureAction || outE.onFailureAction || 'STOP_WORKFLOW',
          });
        }
      });
    });

    const remainingNodes = nodes.filter((n) => n.pipelineId !== pipelineId);
    const arranged = layoutDagNodes(remainingNodes, nextEdges);

    setNodes(arranged);
    setEdges(nextEdges);
    setSelectedCanvasItem({ type: 'trigger' });
    setInspectorState({ mode: 'workflow_meta' });
  };

  const handleUpdateEdge = (sourcePipelineId, targetPipelineId, onFailureAction) => {
    setEdges((prev) =>
      prev.map((e) =>
        e.sourcePipelineId === sourcePipelineId && e.targetPipelineId === targetPipelineId
          ? { ...e, onFailureAction }
          : e
      )
    );
    notify.success('Failure action updated');
  };

  const handleDeleteEdge = (sourcePipelineId, targetPipelineId) => {
    setEdges((prev) =>
      prev.filter(
        (e) => !(e.sourcePipelineId === sourcePipelineId && e.targetPipelineId === targetPipelineId)
      )
    );
    setSelectedCanvasItem({ type: 'trigger' });
    setInspectorState({ mode: 'workflow_meta' });
  };

  const handleMoveNode = (pipelineId, x, y) => {
    setNodes((prev) =>
      prev.map((n) => (n.pipelineId === pipelineId ? { ...n, positionX: x, positionY: y } : n))
    );
  };

  const handleSaveWorkflow = async () => {
    if (!workflowMeta.name || !workflowMeta.name.trim()) {
      notify.error('Please enter a workflow name.');
      setInspectorState({ mode: 'workflow_meta' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: workflowMeta.name.trim(),
        description: workflowMeta.description || '',
        namespaceId: workflowMeta.namespaceId || null,
        nodes: topologyInfo.orderedNodes.map((n) => ({
          pipelineId: n.pipelineId,
          positionX: n.positionX ?? TRIGGER_X,
          positionY: n.positionY ?? 165,
        })),
        edges: edges.map((e) => ({
          sourcePipelineId: e.sourcePipelineId,
          targetPipelineId: e.targetPipelineId,
          onFailureAction: e.onFailureAction || 'STOP_WORKFLOW',
        })),
      };

      let savedId = workflowId;
      if (isEditMode) {
        const updated = await workflowApi.update(workflowId, payload);
        savedId = updated?.id || workflowId;
        notify.success('Workflow saved successfully');
      } else {
        const created = await workflowApi.create(payload);
        savedId = created?.id;
        notify.success('Workflow created successfully');
      }
      navigate(savedId ? `/workflows/${savedId}/monitor` : '/workflows');
    } catch (err) {
      notify.error(err.message || 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return <ApiGuard error={error} loading={false} onRetry={loadData} />;
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: COLORS.text.secondary }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
        Loading workflow builder...
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        margin: '-24px -32px',
        background: COLORS.background.primary,
        overflow: 'hidden',
      }}
    >
      {/* Top Bar matching Exlo screenshot ("< Create Workflow" ... "Cancel" | "Apply & Create") */}
      <div
        style={{
          height: HEADER_HEIGHT,
          minHeight: HEADER_HEIGHT,
          padding: '0 24px',
          borderBottom: `1px solid ${COLORS.border.light}`,
          background: COLORS.background.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate('/workflows')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: COLORS.text.primary,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: FONT.size.lg,
              fontWeight: FONT.weight.semibold,
              padding: '4px 6px',
            }}
          >
            <i className="fa-solid fa-chevron-left" style={{ fontSize: 13 }} />
            <span>{isEditMode ? 'Edit Workflow' : 'Create Workflow'}</span>
          </button>

          <div style={{ width: 1, height: 18, background: COLORS.border.light }} />

          {isEditMode ? (
            <span
              style={{
                fontSize: FONT.size.md,
                fontWeight: FONT.weight.medium,
                color: COLORS.text.primary,
              }}
            >
              {workflowMeta.name}
            </span>
          ) : (
            <input
              type="text"
              value={workflowMeta.name}
              onChange={(e) => setWorkflowMeta((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter workflow name..."
              style={{
                border: `1px solid ${COLORS.border.light}`,
                borderRadius: BORDER_RADIUS.md,
                padding: '5px 10px',
                fontSize: FONT.size.md,
                fontWeight: FONT.weight.medium,
                color: COLORS.text.primary,
                background: COLORS.background.secondary,
                minWidth: 220,
                outline: 'none',
              }}
            />
          )}

          <StatusBadge status={topologyInfo.singleChainReady ? 'READY' : 'DRAFT'} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isEditMode && (
            <button
              type="button"
              onClick={() => navigate(`/workflows/${workflowId}/monitor`)}
              style={{
                padding: '7px 14px',
                borderRadius: BORDER_RADIUS.md,
                border: `1px solid ${COLORS.border.medium}`,
                background: COLORS.background.primary,
                color: COLORS.text.secondary,
                fontSize: FONT.size.sm,
                fontWeight: FONT.weight.medium,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="fa-solid fa-chart-line" />
              Monitor
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/workflows')}
            style={{
              padding: '7px 18px',
              borderRadius: BORDER_RADIUS.md,
              border: `1px solid ${COLORS.border.medium}`,
              background: COLORS.background.primary,
              color: COLORS.text.primary,
              fontSize: FONT.size.sm,
              fontWeight: FONT.weight.medium,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSaveWorkflow}
            style={{
              padding: '7px 18px',
              borderRadius: BORDER_RADIUS.md,
              border: 'none',
              background: COLORS.brand.primary,
              color: '#fff',
              fontSize: FONT.size.sm,
              fontWeight: FONT.weight.semibold,
              cursor: saving ? 'wait' : 'pointer',
              boxShadow: SHADOWS.sm,
            }}
          >
            {saving
              ? 'Saving...'
              : isEditMode
                ? 'Apply & Save'
                : 'Apply & Create'}
          </button>
        </div>
      </div>

      {/* Main Split Workspace: Dotted Flow Canvas + Right Inspector Panel */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <WorkflowCanvas
          nodes={topologyInfo.orderedNodes}
          edges={edges}
          mode="builder"
          selectedItem={selectedCanvasItem}
          topologyInfo={topologyInfo}
          onSelectTrigger={() => {
            setSelectedCanvasItem({ type: 'trigger' });
            setInspectorState({ mode: 'workflow_meta' });
          }}
          onSelectNode={(pipelineId) => {
            setSelectedCanvasItem({ type: 'node', pipelineId });
            setInspectorState({ mode: 'inspect_node', pipelineId });
          }}
          onSelectEdge={(sourcePipelineId, targetPipelineId) => {
            setSelectedCanvasItem({ type: 'edge', sourcePipelineId, targetPipelineId });
            setInspectorState({ mode: 'inspect_edge', sourcePipelineId, targetPipelineId });
          }}
          onOpenAddStep={(defaultAfterPipelineId, defaultConnectionMode = 'PARALLEL') => {
            setSelectedCanvasItem({ type: 'add', afterPipelineId: defaultAfterPipelineId });
            setInspectorState({
              mode: 'add_step',
              defaultAfterPipelineId,
              defaultConnectionMode,
            });
          }}
          onMoveNode={handleMoveNode}
          onConnectNodes={handleConnectNodes}
          onRemoveNode={handleRemoveNode}
          onAutoArrange={handleAutoArrange}
        />

        <WorkflowInspectorPanel
          isEditMode={isEditMode}
          inspectorState={inspectorState}
          workflowMeta={workflowMeta}
          onChangeWorkflowMeta={setWorkflowMeta}
          namespaces={namespaces}
          nodes={topologyInfo.orderedNodes}
          edges={edges}
          eligiblePipelines={eligiblePipelines}
          topologyInfo={topologyInfo}
          onAddStep={handleAddStep}
          onUpdateNodeLinks={handleUpdateNodeLinks}
          onUpdateEdge={handleUpdateEdge}
          onDeleteEdge={handleDeleteEdge}
          onOpenAddStep={(afterId, connMode = 'PARALLEL') => {
            const targetAfter =
              afterId !== undefined
                ? afterId
                : topologyInfo.orderedNodes[topologyInfo.orderedNodes.length - 1]?.pipelineId || null;
            setSelectedCanvasItem({ type: 'add', afterPipelineId: targetAfter });
            setInspectorState({
              mode: 'add_step',
              defaultAfterPipelineId: targetAfter,
              defaultConnectionMode: connMode,
            });
          }}
          onCloseInspector={() => {
            setSelectedCanvasItem({ type: 'trigger' });
            setInspectorState({ mode: 'workflow_meta' });
          }}
          onNavigatePipeline={(pid) => navigate(`/pipelines/${pid}/mapping`)}
        />
      </div>
    </div>
  );
};

export default WorkflowBuilderPage;

