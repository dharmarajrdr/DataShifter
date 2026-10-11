import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StatusBadge from '../components/common/StatusBadge';
import WorkflowCanvas from '../components/workflow/WorkflowCanvas';
import WorkflowInspectorPanel from '../components/workflow/WorkflowInspectorPanel';
import { BORDER_RADIUS, COLORS, FONT, HEADER_HEIGHT, SHADOWS } from '../constants/design';
import { useNotify } from '../contexts/NotificationContext';
import { connectionApi, namespaceApi, workflowApi } from '../services/api';

const TRIGGER_X = 260;

/**
 * Compute topological order, chain count, and single-chain readiness on the client.
 */
function computeClientTopology(nodes, edges) {
  if (!nodes || nodes.length === 0) {
    return {
      orderedNodes: [],
      chainCount: 0,
      singleChainReady: false,
      validationErrors: ['Workflow must contain at least one pipeline.'],
    };
  }

  const nodeMap = new Map(nodes.map((n) => [n.pipelineId, n]));
  const nextMap = new Map();
  const prevMap = new Map();

  (edges || []).forEach((e) => {
    if (nodeMap.has(e.sourcePipelineId) && nodeMap.has(e.targetPipelineId)) {
      nextMap.set(e.sourcePipelineId, e.targetPipelineId);
      prevMap.set(e.targetPipelineId, e.sourcePipelineId);
    }
  });

  const heads = nodes
    .filter((n) => !prevMap.has(n.pipelineId))
    .sort((a, b) => (a.positionY ?? 0) - (b.positionY ?? 0));

  const orderedNodes = [];
  const visited = new Set();

  heads.forEach((head) => {
    let curr = head.pipelineId;
    while (curr && !visited.has(curr)) {
      visited.add(curr);
      const n = nodeMap.get(curr);
      if (n) orderedNodes.push(n);
      curr = nextMap.get(curr);
    }
  });

  let extraChains = 0;
  nodes.forEach((n) => {
    if (!visited.has(n.pipelineId)) {
      visited.add(n.pipelineId);
      orderedNodes.push(n);
      extraChains += 1;
    }
  });

  const chainCount = heads.length + extraChains;
  const validationErrors = [];

  if (chainCount > 1) {
    validationErrors.push(
      `Workflow has ${chainCount} disconnected chains. Link all pipelines into 1 chain before running.`
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
 * Check if adding source -> target creates a cycle.
 */
function createsCycle(edges, sourceId, targetId) {
  if (sourceId === targetId) return true;
  const nextMap = new Map();
  edges.forEach((e) => nextMap.set(e.sourcePipelineId, e.targetPipelineId));
  nextMap.set(sourceId, targetId);

  let curr = targetId;
  const seen = new Set([sourceId]);
  while (curr) {
    if (seen.has(curr)) return true;
    seen.add(curr);
    curr = nextMap.get(curr);
  }
  return false;
}

const WorkflowBuilderPage = () => {
  const { workflowId } = useParams();
  const isEditMode = Boolean(workflowId);
  const navigate = useNavigate();
  const notify = useNotify();

  const [loading, setLoading] = useState(true);
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
      notify.error(err.message || 'Failed to load workflow builder data');
    } finally {
      setLoading(false);
    }
  }, [workflowId, isEditMode, notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const topologyInfo = useMemo(() => computeClientTopology(nodes, edges), [nodes, edges]);

  // Auto-arrange nodes vertically in topological order
  const handleAutoArrange = useCallback(() => {
    const ordered = computeClientTopology(nodes, edges).orderedNodes;
    setNodes(
      ordered.map((n, idx) => ({
        ...n,
        positionX: TRIGGER_X,
        positionY: 165 + idx * 145,
      }))
    );
  }, [nodes, edges]);

  // Add a new pipeline step from the right-hand Set Action inspector
  const handleAddStep = (pipelineSummary, attachAfterPipelineId, onFailureAction) => {
    if (nodes.some((n) => n.pipelineId === pipelineSummary.id)) {
      notify.warning('This pipeline is already in the workflow.');
      return;
    }

    const predNode = attachAfterPipelineId
      ? nodes.find((n) => n.pipelineId === attachAfterPipelineId)
      : null;

    const newPosY = predNode
      ? (predNode.positionY ?? 165) + 145
      : nodes.length === 0
        ? 165
        : Math.max(...nodes.map((n) => n.positionY ?? 165)) + 145;

    const newNode = {
      pipelineId: pipelineSummary.id,
      pipelineName: pipelineSummary.name,
      sourceName: connectionsMap[pipelineSummary.sourceConnectionId] || 'Source',
      targetName: connectionsMap[pipelineSummary.targetConnectionId] || 'Target',
      tableCount: pipelineSummary.tableCount ?? 0,
      pipelineStatus: pipelineSummary.status || 'VALIDATED',
      lastRunOutcome: 'PENDING',
      positionX: predNode ? (predNode.positionX ?? TRIGGER_X) : TRIGGER_X,
      positionY: newPosY,
    };

    let updatedEdges = [...edges];
    if (attachAfterPipelineId) {
      // If predecessor already had a successor, splice the new step in series
      const existingOut = updatedEdges.find((e) => e.sourcePipelineId === attachAfterPipelineId);
      updatedEdges = updatedEdges.filter((e) => e.sourcePipelineId !== attachAfterPipelineId);
      updatedEdges.push({
        sourcePipelineId: attachAfterPipelineId,
        targetPipelineId: newNode.pipelineId,
        onFailureAction: onFailureAction || 'STOP_WORKFLOW',
      });
      if (existingOut) {
        updatedEdges.push({
          sourcePipelineId: newNode.pipelineId,
          targetPipelineId: existingOut.targetPipelineId,
          onFailureAction: existingOut.onFailureAction || 'STOP_WORKFLOW',
        });
      }
    }

    const nextNodes = [...nodes, newNode];
    const arranged = computeClientTopology(nextNodes, updatedEdges).orderedNodes.map((n, idx) => ({
      ...n,
      positionX: n.positionX ?? TRIGGER_X,
      positionY: 165 + idx * 145,
    }));

    setNodes(arranged);
    setEdges(updatedEdges);
    setSelectedCanvasItem({ type: 'node', pipelineId: newNode.pipelineId });
    setInspectorState({ mode: 'inspect_node', pipelineId: newNode.pipelineId });
  };

  // Connect two nodes via drag-and-drop on canvas
  const handleConnectNodes = (sourcePipelineId, targetPipelineId) => {
    const filtered = edges.filter(
      (e) => e.sourcePipelineId !== sourcePipelineId && e.targetPipelineId !== targetPipelineId
    );
    if (createsCycle(filtered, sourcePipelineId, targetPipelineId)) {
      notify.error('Circular pipeline connections are not allowed.');
      return;
    }
    const nextEdges = [
      ...filtered,
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

  // Update node links and failure action from the right-hand inspector
  const handleUpdateNodeLinks = (pipelineId, predId, succId, onFailureAction) => {
    let nextEdges = edges.filter(
      (e) =>
        e.targetPipelineId !== pipelineId &&
        e.sourcePipelineId !== pipelineId &&
        (predId ? e.sourcePipelineId !== predId : true) &&
        (succId ? e.targetPipelineId !== succId : true)
    );

    if (predId) {
      if (createsCycle(nextEdges, predId, pipelineId)) {
        notify.error('Cannot link: this would create a circular chain.');
        return;
      }
      nextEdges.push({
        sourcePipelineId: predId,
        targetPipelineId: pipelineId,
        onFailureAction: onFailureAction || 'STOP_WORKFLOW',
      });
    }

    if (succId) {
      if (createsCycle(nextEdges, pipelineId, succId)) {
        notify.error('Cannot link: this would create a circular chain.');
        return;
      }
      const existingAction =
        edges.find((e) => e.sourcePipelineId === pipelineId && e.targetPipelineId === succId)
          ?.onFailureAction || 'STOP_WORKFLOW';
      nextEdges.push({
        sourcePipelineId: pipelineId,
        targetPipelineId: succId,
        onFailureAction: existingAction,
      });
    }

    setEdges(nextEdges);
    notify.success('Step links updated');
  };

  const handleRemoveNode = (pipelineId) => {
    setNodes((prev) => prev.filter((n) => n.pipelineId !== pipelineId));
    setEdges((prev) =>
      prev.filter(
        (e) => e.sourcePipelineId !== pipelineId && e.targetPipelineId !== pipelineId
      )
    );
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

      if (isEditMode) {
        await workflowApi.update(workflowId, payload);
        notify.success('Workflow saved successfully');
      } else {
        await workflowApi.create(payload);
        notify.success('Workflow created successfully');
      }
      navigate('/workflows');
    } catch (err) {
      notify.error(err.message || 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

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
          onOpenAddStep={(defaultAfterPipelineId) => {
            setSelectedCanvasItem({ type: 'add' });
            setInspectorState({ mode: 'add_step', defaultAfterPipelineId });
          }}
          onMoveNode={handleMoveNode}
          onConnectNodes={handleConnectNodes}
          onAutoArrange={handleAutoArrange}
        />

        <WorkflowInspectorPanel
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
          onRemoveNode={handleRemoveNode}
          onUpdateEdge={handleUpdateEdge}
          onDeleteEdge={handleDeleteEdge}
          onOpenAddStep={() => {
            const tail =
              topologyInfo.orderedNodes[topologyInfo.orderedNodes.length - 1]?.pipelineId || null;
            setSelectedCanvasItem({ type: 'add' });
            setInspectorState({ mode: 'add_step', defaultAfterPipelineId: tail });
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

