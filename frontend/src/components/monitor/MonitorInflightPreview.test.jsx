import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import MonitorInflightPreview from './MonitorInflightPreview';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('MonitorInflightPreview freeze, buffer removal, and 25 record limit', () => {
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
    container = null;
  });

  test('does not render buffer dropdown and limits to 25 records', () => {
    const records = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, colA: `val_${i + 1}` }));
    act(() => { root.render(<MonitorInflightPreview records={records} />); });

    expect(container.querySelector('#preview-buffer-select')).toBeNull();
    expect(container.querySelector('#preview-buffer-label')).toBeNull();
    expect(container.querySelectorAll('#preview-tbody tr').length).toBe(25);
    expect(container.querySelector('#preview-badge').textContent).toContain('25 records');
  });

  test('freezes preview snapshot and ignores new incoming records until unfrozen', () => {
    const initialRecords = [{ id: 101, name: 'Initial Record' }];
    act(() => { root.render(<MonitorInflightPreview records={initialRecords} />); });
    expect(container.textContent).toContain('Initial Record');

    const freezeBtn = container.querySelector('#btn-toggle-freeze');
    expect(freezeBtn).not.toBeNull();
    act(() => { freezeBtn.click(); });
    expect(freezeBtn.textContent).toContain('Stream Frozen');

    // New records arrive while frozen
    const updatedRecords = [{ id: 102, name: 'New Streamed Record' }];
    act(() => { root.render(<MonitorInflightPreview records={updatedRecords} />); });

    // Should still display frozen records
    expect(container.textContent).toContain('Initial Record');
    expect(container.textContent).not.toContain('New Streamed Record');

    // Unfreeze
    act(() => { freezeBtn.click(); });
    expect(freezeBtn.textContent).toContain('Freeze');
    expect(container.textContent).toContain('New Streamed Record');
  });
});
