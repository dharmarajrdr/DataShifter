import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import WorkflowBuilderHeader from './WorkflowBuilderHeader';
import WorkflowCanvasToolbar from './WorkflowCanvasToolbar';
import WorkflowInspectorPanel from './WorkflowInspectorPanel';
import WorkflowNodeCard from './WorkflowNodeCard';
import { createsCycle } from './workflowLayout';
import { computeClientTopology } from './workflowTopology';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Workflow Builder & DAG Canvas', () => {
  let container = null;
  let root = null;

  beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
  afterEach(() => { act(() => { root.unmount(); }); container.remove(); container = null; });

  test('computeClientTopology computes singleChainReady and stages', () => {
    const nodes = [
      { pipelineId: 'p1', pipelineName: 'Extract Orders', pipelineStatus: 'VALIDATED' },
      { pipelineId: 'p2', pipelineName: 'Load Warehouse', pipelineStatus: 'VALIDATED' },
    ];
    const topo = computeClientTopology(nodes, [{ sourcePipelineId: 'p1', targetPipelineId: 'p2' }]);
    expect(topo.singleChainReady).toBe(true);
    expect(topo.chainCount).toBe(1);
    expect(topo.orderedNodes[0].stepNumber).toBe('1');
    expect(topo.orderedNodes[1].stepNumber).toBe('2');
  });

  test('createsCycle detects cycle in directed connections', () => {
    const edges = [{ sourcePipelineId: 'p1', targetPipelineId: 'p2' }];
    expect(createsCycle(edges, 'p2', 'p1')).toBe(true);
    expect(createsCycle(edges, 'p2', 'p3')).toBe(false);
  });

  test('WorkflowBuilderHeader renders title, status and buttons', () => {
    act(() => {
      root.render(
        <WorkflowBuilderHeader isEditMode={false} workflowMeta={{ name: 'ETL Pipeline' }} singleChainReady={true} onSave={jest.fn()} onCancel={jest.fn()} />
      );
    });
    expect(container.textContent).toContain('Create Workflow');
    expect(container.textContent).toContain('Apply & Create');
  });

  test('WorkflowCanvasToolbar renders auto-align and zoom controls', () => {
    act(() => {
      root.render(
        <WorkflowCanvasToolbar mode="builder" onAutoArrange={jest.fn()} zoom={1} topologyInfo={{ singleChainReady: true, chainCount: 1 }} nodeCount={2} />
      );
    });
    expect(container.textContent).toContain('Auto-Align');
    expect(container.textContent).toContain('100%');
    expect(container.textContent).toContain('Single Chain Ready');
  });

  test('WorkflowNodeCard renders trigger card and pipeline node with CDC badge', () => {
    act(() => { root.render(<WorkflowNodeCard isTrigger selected={false} />); });
    expect(container.textContent).toContain('Workflow Start Trigger');

    const node = { pipelineId: 'node-1', pipelineName: 'Postgres CDC Sync', pipelineStatus: 'VALIDATED', pipelineMode: 'CDC' };
    act(() => { root.render(<WorkflowNodeCard node={node} stepNumber="1" selected={true} />); });
    expect(container.textContent).toContain('Postgres CDC Sync');
    expect(container.textContent).toContain('#1');
    expect(container.querySelector('[data-testid="workflow-node-cdc-badge"]')).not.toBeNull();
  });

  test('WorkflowInspectorPanel switches mode and renders meta', () => {
    act(() => {
      root.render(
        <WorkflowInspectorPanel inspectorState={{ mode: 'workflow_meta' }} workflowMeta={{ name: 'Finance Sync', description: 'Daily job' }} nodes={[]} edges={[]} />
      );
    });
    expect(container.textContent).toContain('Workflow Settings');
    expect(container.textContent).toContain('Metadata & trigger parameters');
  });
});
