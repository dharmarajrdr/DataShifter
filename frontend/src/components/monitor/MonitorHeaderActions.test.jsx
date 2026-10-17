import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import MonitorHeader from './MonitorHeader';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('MonitorHeader Actions & Workflow Disassociation', () => {
  let container = null, root = null;
  beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
  afterEach(() => { act(() => root.unmount()); container.remove(); container = null; });

  test('renders Validate button when status is NOT_VALIDATED and triggers VALIDATE action', () => {
    const handleAction = jest.fn();
    act(() => { root.render(<MonitorHeader status="NOT_VALIDATED" onAction={handleAction} onNavigate={jest.fn()} />); });
    const valBtn = container.querySelector('#btn-action-validate');
    expect(valBtn).not.toBeNull();
    expect(valBtn.textContent).toContain('Validate');
    expect(container.querySelector('#btn-action-start')).toBeNull();
    act(() => { valBtn.click(); });
    expect(handleAction).toHaveBeenCalledWith('VALIDATE');
  });

  test('renders Start button when status is VALIDATED and unlocked', () => {
    const handleAction = jest.fn();
    act(() => { root.render(<MonitorHeader status="VALIDATED" isLockedToWorkflow={false} onAction={handleAction} onNavigate={jest.fn()} />); });
    const startBtn = container.querySelector('#btn-action-start');
    expect(startBtn).not.toBeNull();
    expect(startBtn.textContent).toContain('Start');
    act(() => { startBtn.click(); });
    expect(handleAction).toHaveBeenCalledWith('START');
  });

  test('renders Re-run button when status is COMPLETED and unlocked', () => {
    const handleAction = jest.fn();
    act(() => { root.render(<MonitorHeader status="COMPLETED" isLockedToWorkflow={false} onAction={handleAction} onNavigate={jest.fn()} />); });
    const rerunBtn = container.querySelector('#btn-action-rerun');
    expect(rerunBtn).not.toBeNull();
    expect(rerunBtn.textContent).toContain('Re-run');
    act(() => { rerunBtn.click(); });
    expect(handleAction).toHaveBeenCalledWith('START');
  });

  test('renders Resume and Stop buttons when status is PAUSED and unlocked', () => {
    const handleAction = jest.fn();
    act(() => { root.render(<MonitorHeader status="PAUSED" isLockedToWorkflow={false} onAction={handleAction} onNavigate={jest.fn()} />); });
    expect(container.querySelector('#btn-action-resume')).not.toBeNull();
    expect(container.querySelector('#btn-action-stop')).not.toBeNull();
  });

  test('renders workflow lock badge when locked and allows Validate on NOT_VALIDATED', () => {
    const handleNav = jest.fn();
    act(() => { root.render(<MonitorHeader status="NOT_VALIDATED" isLockedToWorkflow={true} workflowId="wf-9" workflowName="Daily Sync" onNavigate={handleNav} onAction={jest.fn()} />); });
    const lockBadge = container.querySelector('#badge-workflow-lock');
    expect(lockBadge).not.toBeNull();
    expect(lockBadge.textContent).toContain('Daily Sync');
    expect(container.querySelector('#btn-action-validate')).not.toBeNull();
    expect(container.querySelector('#btn-action-start')).toBeNull();
    act(() => { lockBadge.click(); });
    expect(handleNav).toHaveBeenCalledWith('/workflows/wf-9/monitor');
  });

  test('disassociated pipeline shows execution actions instead of workflow lock', () => {
    act(() => { root.render(<MonitorHeader status="VALIDATED" isLockedToWorkflow={false} workflowId={null} onAction={jest.fn()} onNavigate={jest.fn()} />); });
    expect(container.querySelector('#badge-workflow-lock')).toBeNull();
    expect(container.querySelector('#btn-action-start')).not.toBeNull();
  });
});
