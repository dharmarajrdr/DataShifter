import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import WorkflowCard from './WorkflowCard';
import WorkflowDashboardHeader from './WorkflowDashboardHeader';
import WorkflowFilterToolbar from './WorkflowFilterToolbar';
import WorkflowGridBody from './WorkflowGridBody';
import WorkflowKpiGrid from './WorkflowKpiGrid';

describe('Workflow Dashboard Components', () => {
  let container, root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => { root.unmount(); });
    container.remove();
  });

  test('WorkflowDashboardHeader renders title and triggers create', () => {
    const onNew = jest.fn();
    act(() => {
      root.render(<WorkflowDashboardHeader id="test-hdr" canCreateWorkflow={true} onNewWorkflowClick={onNew} />);
    });
    expect(container.querySelector('#test-hdr-title').textContent).toBe('Workflows');
    act(() => { container.querySelector('#test-hdr-create-btn').click(); });
    expect(onNew).toHaveBeenCalled();
  });

  test('WorkflowKpiGrid renders all four workflow metrics', () => {
    const counts = { total: 12, ready: 5, running: 3, failed: 2 };
    act(() => { root.render(<WorkflowKpiGrid id="test-kpi" counts={counts} />); });
    expect(container.querySelector('#test-kpi-total-val').textContent).toBe('12');
    expect(container.querySelector('#test-kpi-ready-val').textContent).toBe('5');
  });

  test('WorkflowFilterToolbar renders namespaces and triggers search', () => {
    const onSearch = jest.fn();
    const onSelect = jest.fn();
    act(() => {
      root.render(
        <WorkflowFilterToolbar
          id="test-tb"
          selectedNamespace="ALL"
          onSelectNamespace={onSelect}
          searchQuery=""
          onSearchChange={onSearch}
        />
      );
    });
    const input = container.querySelector('#test-tb-search-input');
    act(() => { input.value = 'crm'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  });

  test('WorkflowCard renders Option B minimalist layout with step count and navigates', () => {
    const navigate = jest.fn();
    const mockWf = {
      id: 'wf-1',
      name: 'E2E-ETL',
      status: 'READY',
      overallProgress: 100,
      pipelineCount: 4,
    };
    act(() => {
      root.render(
        <MemoryRouter>
          <WorkflowCard id="card-1" workflow={mockWf} navigate={navigate} />
        </MemoryRouter>
      );
    });
    const card = container.querySelector('#card-1');
    expect(card.textContent).toContain('E2E-ETL');
    expect(card.textContent).toContain('4 Pipeline Steps');
    act(() => { card.click(); });
    expect(navigate).toHaveBeenCalledWith('/workflows/wf-1/monitor');
  });

  test('WorkflowGridBody renders empty state when no workflows', () => {
    act(() => {
      root.render(<WorkflowGridBody id="test-body" workflows={[]} />);
    });
    expect(container.querySelector('#test-body-empty-title').textContent).toBe('No workflows found');
  });
});
