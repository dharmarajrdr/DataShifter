import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
  MonitorHeader, MonitorTelemetryBar, MonitorMetricsGrid,
  MonitorCdcOperations, MonitorSequentialTrack, MonitorInflightPreview,
} from './index';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Live Monitor Modular Components', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test('MonitorHeader renders pipeline title, status, and error logs button', () => {
    const handleNavigate = jest.fn();
    act(() => {
      root.render(<MonitorHeader pipelineName="Orders-CDC-Sync" status="RUNNING" isCdc={true} onNavigate={handleNavigate} errorCount={2} />);
    });
    expect(container.querySelector('#monitor-breadcrumbs')).toBeNull();
    expect(container.querySelector('#monitor-pipeline-title').textContent).toBe('Orders-CDC-Sync');
    expect(container.querySelector('#monitor-status-text').textContent).toBe('RUNNING');
    expect(container.querySelector('#monitor-cdc-badge').textContent).toContain('CDC Stream Active');
    const errBtn = container.querySelector('#btn-monitor-errors');
    expect(errBtn.textContent).toContain('Error logs (2)');
    act(() => { errBtn.click(); });
    expect(handleNavigate).toHaveBeenCalledWith('errors');
  });

  test('MonitorTelemetryBar and MonitorMetricsGrid render correctly', () => {
    act(() => {
      root.render(
        <div>
          <MonitorTelemetryBar connected={true} lagSeconds={14} currentLsn="0/14B200" isCdc={true} />
          <MonitorMetricsGrid data={{ rowsPerSec: 42000, currentLsn: '0/14B200' }} isCdc={true} />
        </div>
      );
    });
    expect(container.querySelector('#telemetry-connected').textContent).toContain('Telemetry Stream: Active');
    expect(container.querySelector('#telemetry-lsn-code').textContent).toBe('0/14B200');
    expect(container.querySelector('#metric-val-rate').textContent).toContain('42,000 evt/s');
    act(() => { root.render(<MonitorTelemetryBar status="VALIDATED" isRunning={false} />); });
    expect(container.querySelector('#telemetry-inactive').textContent).toContain('Telemetry Stream: Inactive');
    expect(container.querySelector('#telemetry-batch-status').textContent).toBe('Standby');
    expect(container.querySelector('#telemetry-reconnecting')).toBeNull();
  });

  test('MonitorCdcOperations renders operation counts', () => {
    act(() => { root.render(<MonitorCdcOperations insertCount={100} updateCount={50} deleteCount={5} />); });
    expect(container.querySelector('#cdc-chip-inserts').textContent).toContain('Inserts: 100');
    expect(container.querySelector('#cdc-chip-updates').textContent).toContain('Updates: 50');
    expect(container.querySelector('#cdc-chip-deletes').textContent).toContain('Deletes: 5');
  });

  test('MonitorSequentialTrack renders table steps and overall progress', () => {
    const tables = [
      { name: 'users', progress: 100, status: 'COMPLETED' },
      { name: 'orders', progress: 50, status: 'RUNNING' }
    ];
    act(() => {
      root.render(<MonitorSequentialTrack overallProgress={75} tables={tables} rowsProcessed={1500} totalRows={2000} />);
    });
    expect(container.querySelector('#seq-progress-badge').textContent).toBe('75.0% Complete');
    expect(container.querySelector('#seq-step-title-0').textContent).toBe('1. users');
    expect(container.querySelector('#seq-step-title-1').textContent).toBe('2. orders');
  });

  test('MonitorInflightPreview filters by table tab', () => {
    const records = [
      { id: 1, table: 'customers', op: 'INSERT', name: 'Alice' },
      { id: 2, table: 'orders', op: 'UPDATE', total: '$100' }
    ];
    act(() => { root.render(<MonitorInflightPreview records={records} isCdc={true} />); });
    expect(container.querySelectorAll('#preview-tbody tr').length).toBe(2);
    const ordersTab = container.querySelector('#tab-table-orders');
    expect(ordersTab).not.toBeNull();
    act(() => { ordersTab.click(); });
    expect(container.querySelectorAll('#preview-tbody tr').length).toBe(1);
  });
});
