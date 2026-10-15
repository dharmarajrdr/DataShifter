import React from 'react';
import WorkflowAddStepInspector from './WorkflowAddStepInspector';
import WorkflowEdgeInspector, { FAILURE_OPTIONS } from './WorkflowEdgeInspector';
import WorkflowInspectorHeader from './WorkflowInspectorHeader';
import WorkflowMetaInspector from './WorkflowMetaInspector';
import WorkflowNodeInspector from './WorkflowNodeInspector';

export const FAILURE_ACTION_OPTIONS = FAILURE_OPTIONS;

const WorkflowInspectorPanel = ({
  inspectorState = { mode: 'workflow_meta' }, workflowMeta, onChangeWorkflowMeta,
  namespaces = [], nodes = [], edges = [], eligiblePipelines = [], topologyInfo,
  onAddStep, onUpdateNodeLinks, onUpdateEdge, onDeleteEdge, onCloseInspector,
  onNavigatePipeline, onRemoveNode, readOnly = false,
}) => {
  const mode = inspectorState?.mode || 'workflow_meta';
  const currentNode = nodes.find((n) => n.pipelineId === (inspectorState?.pipelineId || inspectorState?.nodeId));

  return (
    <aside
      id="workflow-inspector-panel"
      className="w-[380px] bg-white border-l border-slate-200 flex flex-col shrink-0 h-full overflow-hidden shadow-sm z-10"
    >
      <WorkflowInspectorHeader mode={mode} onClose={onCloseInspector} />
      <div id="workflow-inspector-content" className="flex-1 overflow-y-auto">
        {mode === 'workflow_meta' && (
          <WorkflowMetaInspector workflowMeta={workflowMeta} onChangeWorkflowMeta={onChangeWorkflowMeta}
            namespaces={namespaces} topologyInfo={topologyInfo} readOnly={readOnly} />
        )}
        {mode === 'add_step' && (
          <WorkflowAddStepInspector defaultAfterPipelineId={inspectorState?.defaultAfterPipelineId}
            defaultConnectionMode={inspectorState?.defaultConnectionMode} nodes={nodes} eligiblePipelines={eligiblePipelines}
            onAddStep={onAddStep} />
        )}
        {mode === 'inspect_node' && currentNode && (
          <WorkflowNodeInspector node={currentNode} nodes={nodes} edges={edges} onUpdateNodeLinks={onUpdateNodeLinks}
            onNavigatePipeline={onNavigatePipeline} onRemoveNode={onRemoveNode} />
        )}
        {mode === 'inspect_edge' && (
          <WorkflowEdgeInspector sourcePipelineId={inspectorState?.sourcePipelineId}
            targetPipelineId={inspectorState?.targetPipelineId} nodes={nodes} edges={edges}
            onUpdateEdge={onUpdateEdge} onDeleteEdge={onDeleteEdge} />
        )}
      </div>
    </aside>
  );
};

export default WorkflowInspectorPanel;
