import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { WorkflowTableView } from './WorkflowTableView';
import { WorkflowFilterToolbar } from './WorkflowFilterToolbar';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('WorkflowTableView & View Toggle', () => {
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

  test('WorkflowTableView renders headers and empty state', () => {
    act(() => {
      root.render(<WorkflowTableView id="test-table" workflows={[]} />);
    });
    expect(container.querySelector('#test-table')).not.toBeNull();
    expect(container.querySelector('#test-table-empty-cell').textContent).toContain('No workflows found');
  });

  test('WorkflowTableView renders workflow row with pipeline chain and navigates', () => {
    const navigate = jest.fn();
    const mockWf = {
      id: 'wf-42',
      name: 'Order Processing',
      namespaceName: 'Sales',
      status: 'RUNNING',
      overallProgress: 75,
      pipelineCount: 3,
      orderedPipelineNames: ['Extract Orders', 'Validate', 'Load DW'],
      ownerName: 'Alice',
    };

    act(() => {
      root.render(
        <MemoryRouter>
          <WorkflowTableView id="test-table" workflows={[mockWf]} navigate={navigate} />
        </MemoryRouter>
      );
    });

    const row = container.querySelector('#test-table-row-wf-42');
    expect(row).not.toBeNull();
    expect(row.textContent).toContain('Order Processing');
    expect(row.textContent).toContain('Sales');
    expect(row.textContent).toContain('Extract Orders');
    expect(row.textContent).toContain('75%');
    expect(row.textContent).toContain('Alice');

    act(() => { row.click(); });
    expect(navigate).toHaveBeenCalledWith('/workflows/wf-42/monitor');
  });

  test('WorkflowFilterToolbar toggles between grid and table view', () => {
    const onViewModeChange = jest.fn();
    act(() => {
      root.render(
        <WorkflowFilterToolbar
          id="test-tb"
          viewMode="grid"
          onViewModeChange={onViewModeChange}
        />
      );
    });

    const tableBtn = container.querySelector('#test-tb-table-view-btn');
    expect(tableBtn).not.toBeNull();
    act(() => { tableBtn.click(); });
    expect(onViewModeChange).toHaveBeenCalledWith('table');
  });
});
