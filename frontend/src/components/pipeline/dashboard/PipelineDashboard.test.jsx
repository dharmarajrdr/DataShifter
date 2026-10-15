import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import PipelineCard from './PipelineCard';
import PipelineConnectorBadge from './PipelineConnectorBadge';
import PipelineFilterToolbar from './PipelineFilterToolbar';
import PipelineKpiGrid from './PipelineKpiGrid';
import PipelineTableRow from './PipelineTableRow';

describe('Pipeline Dashboard Components', () => {
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

  test('PipelineKpiGrid renders metrics correctly', () => {
    const counts = { total: 10, running: 4, errored: 1, completed: 5 };
    act(() => { root.render(<PipelineKpiGrid id="test-kpi" counts={counts} />); });
    expect(container.querySelector('#test-kpi-total-val').textContent).toBe('10');
    expect(container.querySelector('#test-kpi-running-val').textContent).toBe('4');
  });

  test('PipelineConnectorBadge renders badge with connector icon', () => {
    act(() => { root.render(<PipelineConnectorBadge id="test-badge" name="PostgreSQL" />); });
    expect(container.querySelector('#test-badge-name').textContent).toBe('PostgreSQL');
    expect(container.querySelector('#test-badge-icon').className).toContain('fa-database');
  });

  test('PipelineFilterToolbar toggles views and triggers search', () => {
    const onSearch = jest.fn();
    const onViewMode = jest.fn();
    act(() => {
      root.render(<PipelineFilterToolbar id="test-tb" search="test" onSearchChange={onSearch} viewMode="grid" onViewModeChange={onViewMode} />);
    });
    const tableBtn = container.querySelector('#test-tb-table-view-btn');
    act(() => { tableBtn.click(); });
    expect(onViewMode).toHaveBeenCalledWith('table');
  });

  test('PipelineTableRow renders pipeline route and navigates on click', () => {
    const navigate = jest.fn();
    const mockPipe = { id: 'pipe-1', name: 'Test-CDC', sourceName: 'PostgreSQL', targetName: 'Snowflake', status: 'RUNNING', progress: 80 };
    act(() => {
      root.render(
        <MemoryRouter>
          <table><tbody><PipelineTableRow id="row-1" pipeline={mockPipe} navigate={navigate} /></tbody></table>
        </MemoryRouter>
      );
    });
    const row = container.querySelector('#row-1');
    expect(row.textContent).toContain('Test-CDC');
    act(() => { row.click(); });
    expect(navigate).toHaveBeenCalledWith('/pipelines/pipe-1/monitor');
  });

  test('PipelineCard renders progress and handles click', () => {
    const navigate = jest.fn();
    const mockPipe = { id: 'pipe-2', name: 'Batch-ETL', status: 'COMPLETED', progress: 100 };
    act(() => {
      root.render(<MemoryRouter><PipelineCard id="card-2" pipeline={mockPipe} navigate={navigate} /></MemoryRouter>);
    });
    const card = container.querySelector('#card-2');
    expect(card.textContent).toContain('Batch-ETL');
    act(() => { card.click(); });
    expect(navigate).toHaveBeenCalledWith('/pipelines/pipe-2/monitor');
  });
});
