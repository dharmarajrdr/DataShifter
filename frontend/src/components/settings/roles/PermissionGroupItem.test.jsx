import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { PermissionGroupItem } from './PermissionGroupItem';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('PermissionGroupItem', () => {
  let container = null;
  let root = null;

  const mockGroup = {
    label: 'Pipeline Management',
    permissions: [
      { key: 'pipeline:create', label: 'Create pipelines' },
      { key: 'pipeline:view', label: 'View pipelines' },
      { key: 'pipeline:delete', label: 'Delete pipelines' }
    ]
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test('renders collapsed by default and shows selected count', () => {
    const perms = new Set(['pipeline:view']);
    act(() => {
      root.render(<PermissionGroupItem group={mockGroup} permissions={perms} onToggleGroup={jest.fn()} onTogglePerm={jest.fn()} />);
    });

    expect(container.textContent).toContain('Pipeline Management');
    expect(container.textContent).toContain('1/3');
    expect(container.textContent).not.toContain('Create pipelines');
  });

  test('expands on header click to reveal individual permissions', () => {
    const perms = new Set(['pipeline:view']);
    act(() => {
      root.render(<PermissionGroupItem group={mockGroup} permissions={perms} onToggleGroup={jest.fn()} onTogglePerm={jest.fn()} />);
    });

    const header = container.querySelector('.select-none');
    act(() => { header.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    expect(container.textContent).toContain('Create pipelines');
    expect(container.textContent).toContain('View pipelines');
    expect(container.textContent).toContain('Delete pipelines');

    // Click again to collapse
    act(() => { header.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(container.textContent).not.toContain('Create pipelines');
  });

  test('calls onTogglePerm when individual permission is clicked', () => {
    const onTogglePerm = jest.fn();
    act(() => {
      root.render(<PermissionGroupItem group={mockGroup} permissions={new Set()} onToggleGroup={jest.fn()} onTogglePerm={onTogglePerm} defaultExpanded={true} />);
    });

    const permItem = container.querySelectorAll('.p-2\\.5 > div')[0];
    act(() => { permItem.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    expect(onTogglePerm).toHaveBeenCalledWith('pipeline:create');
  });

  test('calls onToggleGroup when group checkbox is clicked without toggling collapse', () => {
    const onToggleGroup = jest.fn();
    act(() => {
      root.render(<PermissionGroupItem group={mockGroup} permissions={new Set()} onToggleGroup={onToggleGroup} onTogglePerm={jest.fn()} />);
    });

    const checkbox = container.querySelector('input[type="checkbox"]');
    act(() => { checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    expect(onToggleGroup).toHaveBeenCalledWith(mockGroup);
    expect(container.textContent).not.toContain('Create pipelines');
  });
});

