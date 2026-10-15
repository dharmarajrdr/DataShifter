import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ApiGuard from '../../components/common/ApiGuard';
import WorkflowBuilderHeader from '../../components/workflow/WorkflowBuilderHeader';
import WorkflowCanvas from '../../components/workflow/WorkflowCanvas';
import WorkflowInspectorPanel from '../../components/workflow/WorkflowInspectorPanel';
import { useWorkflowGraph } from '../../components/workflow/useWorkflowGraph';
import { useNotify } from '../../contexts/NotificationContext';
import { connectionApi, namespaceApi, workflowApi } from '../../services/api';

const WorkflowBuilderPage = () => {
  const { workflowId } = useParams();
  const isEditMode = Boolean(workflowId);
  const navigate = useNavigate();
  const notify = useNotify();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [workflowMeta, setWorkflowMeta] = useState({ name: '', description: '', namespaceId: '', status: 'DRAFT' });
  const [eligiblePipelines, setEligiblePipelines] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [inspectorState, setInspectorState] = useState({ mode: 'workflow_meta' });
  const [selectedCanvasItem, setSelectedCanvasItem] = useState({ type: 'trigger' });

  const graph = useWorkflowGraph([], []);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [nsRes, connRes, eligRes] = await Promise.all([
        namespaceApi.getAll().catch(() => ({ data: [] })),
        connectionApi.getAll().catch(() => ({ data: [] })),
        workflowApi.getEligiblePipelines(workflowId || '').catch(() => ({ data: [] })),
      ]);
      setNamespaces(nsRes.data || []);
      const cMap = {}; (connRes.data || []).forEach((c) => { cMap[c.id] = c.name; });
      setEligiblePipelines((eligRes.data || []).map((p) => ({
        ...p, sourceConnectionName: cMap[p.sourceConnectionId], targetConnectionName: cMap[p.targetConnectionId],
      })));
      if (isEditMode) {
        const wf = (await workflowApi.getById(workflowId))?.data;
        if (wf) {
          setWorkflowMeta({ name: wf.name || '', description: wf.description || '', namespaceId: wf.namespaceId || '', status: wf.status || 'DRAFT' });
          graph.setNodes(wf.nodes || []); graph.setEdges(wf.edges || []);
        }
      } else {
        setWorkflowMeta({ name: 'Untitled Workflow', description: '', namespaceId: '', status: 'DRAFT' });
      }
    } catch (err) { setError(err); } finally { setLoading(false); }
  }, [workflowId, isEditMode]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!workflowMeta.name?.trim()) { notify.error('Please enter a workflow name.'); setInspectorState({ mode: 'workflow_meta' }); return; }
    setSaving(true);
    try {
      const payload = {
        name: workflowMeta.name.trim(), description: workflowMeta.description || '', namespaceId: workflowMeta.namespaceId || null,
        nodes: graph.topologyInfo.orderedNodes.map((n) => ({ pipelineId: n.pipelineId, positionX: n.positionX ?? 360, positionY: n.positionY ?? 165 })),
        edges: graph.edges.map((e) => ({ sourcePipelineId: e.sourcePipelineId, targetPipelineId: e.targetPipelineId, onFailureAction: e.onFailureAction || 'STOP_WORKFLOW' })),
      };
      const res = isEditMode ? await workflowApi.update(workflowId, payload) : await workflowApi.create(payload);
      notify.success(isEditMode ? 'Workflow saved successfully' : 'Workflow created successfully');
      navigate(`/workflows/${res?.id || workflowId || ''}/monitor`);
    } catch (err) { notify.error(err.message || 'Failed to save workflow'); } finally { setSaving(false); }
  };

  if (error) return <ApiGuard error={error} loading={false} onRetry={loadData} />;
  if (loading) return <div id="workflow-builder-loading" className="p-10 text-center text-slate-500"><i className="fa-solid fa-spinner fa-spin mr-2" />Loading workflow builder...</div>;

  return (
    <div id="workflow-builder-page" className="flex flex-col h-screen -m-6 md:-m-8 bg-white overflow-hidden">
      <WorkflowBuilderHeader isEditMode={isEditMode} workflowId={workflowId} workflowMeta={workflowMeta}
        onChangeName={(val) => setWorkflowMeta((prev) => ({ ...prev, name: val }))} singleChainReady={graph.topologyInfo.singleChainReady}
        saving={saving} onCancel={() => navigate(isEditMode ? `/workflows/${workflowId}/monitor` : '/workflows')} onSave={handleSave}
        onNavigateMonitor={() => navigate(`/workflows/${workflowId}/monitor`)} />
      <div id="workflow-builder-workspace" className="flex flex-1 min-h-0 overflow-hidden">
        <WorkflowCanvas nodes={graph.topologyInfo.orderedNodes} edges={graph.edges} mode="builder" selectedItem={selectedCanvasItem}
          topologyInfo={graph.topologyInfo} onSelectTrigger={() => { setSelectedCanvasItem({ type: 'trigger' }); setInspectorState({ mode: 'workflow_meta' }); }}
          onSelectNode={(pid) => { setSelectedCanvasItem({ type: 'node', pipelineId: pid }); setInspectorState({ mode: 'inspect_node', pipelineId: pid }); }}
          onSelectEdge={(sId, tId) => { setSelectedCanvasItem({ type: 'edge', sourcePipelineId: sId, targetPipelineId: tId }); setInspectorState({ mode: 'inspect_edge', sourcePipelineId: sId, targetPipelineId: tId }); }}
          onOpenAddStep={(defAfter, defMode = 'PARALLEL') => { setSelectedCanvasItem({ type: 'add', afterPipelineId: defAfter }); setInspectorState({ mode: 'add_step', defaultAfterPipelineId: defAfter, defaultConnectionMode: defMode }); }}
          onMoveNode={graph.handleMoveNode} onConnectNodes={graph.handleConnectNodes} onRemoveNode={(pid) => { graph.handleRemoveNode(pid); setSelectedCanvasItem({ type: 'trigger' }); setInspectorState({ mode: 'workflow_meta' }); }}
          onAutoArrange={graph.handleAutoArrange} />
        <WorkflowInspectorPanel inspectorState={inspectorState} workflowMeta={workflowMeta} onChangeWorkflowMeta={setWorkflowMeta}
          namespaces={namespaces} nodes={graph.topologyInfo.orderedNodes} edges={graph.edges} eligiblePipelines={eligiblePipelines}
          topologyInfo={graph.topologyInfo} onAddStep={(pSum, after, action, cMode) => { const newId = graph.handleAddStep(pSum, after, action, cMode); setSelectedCanvasItem({ type: 'node', pipelineId: newId }); setInspectorState({ mode: 'inspect_node', pipelineId: newId }); }}
          onUpdateNodeLinks={(pid, map) => { graph.setEdges((prev) => prev.map((e) => (e.targetPipelineId === pid && map[e.sourcePipelineId] ? { ...e, onFailureAction: map[e.sourcePipelineId] } : e))); notify.success('Step failure rules updated'); }}
          onUpdateEdge={graph.handleUpdateEdge} onDeleteEdge={(s, t) => { graph.handleDeleteEdge(s, t); setSelectedCanvasItem({ type: 'trigger' }); setInspectorState({ mode: 'workflow_meta' }); }}
          onCloseInspector={() => { setSelectedCanvasItem({ type: 'trigger' }); setInspectorState({ mode: 'workflow_meta' }); }} onNavigatePipeline={(pid) => navigate(`/pipelines/${pid}/mapping`)} />
      </div>
    </div>
  );
};

export default WorkflowBuilderPage;
