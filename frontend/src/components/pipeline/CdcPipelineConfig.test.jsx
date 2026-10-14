import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import WorkflowNodeCard from '../workflow/WorkflowNodeCard';
import PipelineWizard from '../../pages/PipelineWizard';
import PipelineSettings from '../../pages/PipelineSettings';
import LiveMonitor from '../../pages/LiveMonitor';
import * as AuthContextModule from '../../contexts/AuthContext';
import * as NotificationContextModule from '../../contexts/NotificationContext';
import { pipelineApi, settingsApi, monitorApi, cdcApi, namespaceApi, connectionApi } from '../../services/api';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../services/api', () => ({
  pipelineApi: {
    create: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    performAction: jest.fn(),
    export: jest.fn(),
    delete: jest.fn(),
  },
  settingsApi: {
    getByPipelineId: jest.fn(),
    save: jest.fn(),
    addTablePair: jest.fn(),
    removeTablePair: jest.fn(),
  },
  monitorApi: {
    getByPipelineId: jest.fn(),
  },
  cdcApi: {
    getCheckpoint: jest.fn(),
    resetCheckpoint: jest.fn(),
    clearCheckpoint: jest.fn(),
  },
  namespaceApi: {
    getAll: jest.fn(),
  },
  connectionApi: {
    getAll: jest.fn(),
    listTables: jest.fn(),
  },
}));

jest.mock('../../hooks/useEventSource', () => ({
  useEventSource: () => ({
    connected: true,
    reconnectCount: 0,
    exhausted: false,
    retry: jest.fn(),
  }),
}));

describe('CDC Pipeline Configuration and Monitoring', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    jest.clearAllMocks();

    jest.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'user-1', name: 'DB Staff Engineer' },
      hasPermission: () => true,
    });

    jest.spyOn(NotificationContextModule, 'useNotification').mockReturnValue({
      success: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    });

    namespaceApi.getAll.mockResolvedValue({
      data: [{ id: 'ns-1', name: 'Default', color: '#534AB7' }],
    });
    connectionApi.getAll.mockResolvedValue({ data: [] });
    connectionApi.listTables.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    container = null;
    jest.restoreAllMocks();
  });

  test('WorkflowNodeCard renders CDC badge only for CDC pipelines', () => {
    const cdcNode = {
      pipelineId: 'p-cdc-1',
      pipelineName: 'Oracle Orders CDC',
      pipelineMode: 'CDC',
      pipelineStatus: 'RUNNING',
    };

    act(() => {
      root.render(<WorkflowNodeCard node={cdcNode} />);
    });

    const badge = container.querySelector('[data-testid="workflow-node-cdc-badge"]');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain('CDC');

    const batchNode = {
      pipelineId: 'p-batch-1',
      pipelineName: 'Oracle Orders Batch',
      pipelineMode: 'BATCH',
      pipelineStatus: 'RUNNING',
    };

    act(() => {
      root.render(<WorkflowNodeCard node={batchNode} />);
    });

    const noBadge = container.querySelector('[data-testid="workflow-node-cdc-badge"]');
    expect(noBadge).toBeNull();
  });

  test('PipelineWizard renders mode selector and toggles CDC parameters', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <PipelineWizard />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Execution Mode');
    const batchCard = container.querySelector('[data-testid="mode-card-batch"]');
    const cdcCard = container.querySelector('[data-testid="mode-card-cdc"]');
    expect(batchCard).not.toBeNull();
    expect(cdcCard).not.toBeNull();

    // Default is BATCH, CDC config panel should not be present initially
    expect(container.querySelector('[data-testid="cdc-config-panel"]')).toBeNull();

    // Click CDC mode card
    await act(async () => {
      cdcCard.click();
    });

    // CDC config panel should now be visible with inputs
    const cdcPanel = container.querySelector('[data-testid="cdc-config-panel"]');
    expect(cdcPanel).not.toBeNull();
    expect(container.querySelector('[data-testid="input-cdc-directory"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="input-cdc-pattern"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="input-cdc-scn"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="input-cdc-flush-interval"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="input-cdc-batch-size"]')).not.toBeNull();
  });

  test('PipelineSettings displays CDC configuration and handles reset checkpoint', async () => {
    settingsApi.getByPipelineId.mockResolvedValue({
      data: {
        id: 'p-1',
        name: 'Orders Stream',
        description: 'Oracle GoldenGate trail replication',
        pipelineMode: 'CDC',
        cdcDirectoryPath: '/u01/app/oracle/dirdat',
        cdcFilePattern: 'aa.*',
        cdcStartingScn: '24589000',
        cdcFlushIntervalMs: 200,
        cdcBatchSize: 500,
        status: 'PAUSED',
        tables: [],
      },
    });

    cdcApi.getCheckpoint.mockResolvedValue({
      data: {
        id: 'cp-1',
        pipelineId: 'p-1',
        sourceFile: 'aa000004',
        fileOffset: 2048500,
        lastScn: '24589999',
        eventsProcessed: 14250,
      },
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/pipelines/p-1/settings']}>
          <Routes>
            <Route path="/pipelines/:pipelineId/settings" element={<PipelineSettings />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Execution mode & CDC');
    expect(container.querySelector('[data-testid="settings-cdc-panel"]')).not.toBeNull();

    const dirInput = container.querySelector('[data-testid="settings-cdc-directory"]');
    expect(dirInput.value).toBe('/u01/app/oracle/dirdat');

    // Checkpoint info displayed
    expect(container.textContent).toContain('24589999');
    expect(container.textContent).toContain('aa000004');

    // Click Reset Checkpoint button
    const resetButton = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent === 'Reset Checkpoint'
    );
    expect(resetButton).toBeDefined();

    await act(async () => {
      resetButton.click();
    });

    // Reset modal should be open
    const modal = container.querySelector('[data-testid="cdc-reset-modal"]');
    expect(modal).not.toBeNull();
    expect(modal.textContent).toContain('Reset CDC Checkpoint');

    cdcApi.resetCheckpoint.mockResolvedValue({ data: { status: 'RESET' } });

    const confirmButton = Array.from(modal.querySelectorAll('button')).find(
      b => b.textContent === 'Confirm Reset'
    );

    await act(async () => {
      confirmButton.click();
    });

    expect(cdcApi.resetCheckpoint).toHaveBeenCalledWith('p-1', { targetScn: null });
  });

  test('LiveMonitor renders CDC streaming beacon and metrics grid', async () => {
    monitorApi.getByPipelineId.mockResolvedValue({
      data: {
        pipelineId: 'p-cdc-live',
        pipelineName: 'Production Trail Stream',
        pipelineMode: 'CDC',
        tableName: 'CDC_STREAM',
        status: 'RUNNING',
        rowsProcessed: 88500,
        rowsPerSec: 1540,
        avgRowsPerSec: 1420,
        currentScn: '24590123',
        lagSeconds: 2,
        currentSourceFile: 'aa000012',
        insertCount: 65000,
        updateCount: 21000,
        deleteCount: 2500,
        filteredCount: 120,
        tables: [],
        inflightRecords: [],
      },
    });

    cdcApi.getCheckpoint.mockResolvedValue({
      data: {
        lastScn: '24590123',
        sourceFile: 'aa000012',
        eventsProcessed: 88500,
      },
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/pipelines/p-cdc-live/monitor']}>
          <Routes>
            <Route path="/pipelines/:pipelineId/monitor" element={<LiveMonitor />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const beacon = container.querySelector('[data-testid="cdc-streaming-badge"]');
    expect(beacon).not.toBeNull();
    expect(beacon.textContent).toContain('CDC Stream Active');

    const metricsGrid = container.querySelector('[data-testid="cdc-metrics-grid"]');
    expect(metricsGrid).not.toBeNull();
    expect(metricsGrid.textContent).toContain('Current SCN');
    expect(metricsGrid.textContent).toContain('24590123');
    expect(metricsGrid.textContent).toContain('Replication Lag');
    expect(metricsGrid.textContent).toContain('2s');
    expect(metricsGrid.textContent).toContain('aa000012');

    const ops = container.querySelector('[data-testid="cdc-operations-breakdown"]');
    expect(ops).not.toBeNull();
    expect(ops.textContent).toContain('Inserts: 65,000');
    expect(ops.textContent).toContain('Updates: 21,000');
    expect(ops.textContent).toContain('Deletes: 2,500');
  });
});
