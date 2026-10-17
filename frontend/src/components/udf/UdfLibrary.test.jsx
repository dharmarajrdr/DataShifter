import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { UdfMasterList } from './UdfMasterList';
import { UdfDetailHeader } from './UdfDetailHeader';
import { UdfMethodsTable } from './UdfMethodsTable';
import { UdfDependencies } from './UdfDependencies';

global.IS_REACT_ACT_ENVIRONMENT = true;

const mockJar = {
  id: 'jar-1', name: 'security-masking.jar', version: '2.1.0', sizeBytes: 2500000,
  status: 'READY', pipelineCount: 2, columnCount: 3,
  functions: [
    { id: 'fn-1', functionName: 'maskEmail', className: 'com.datashifter.Masking', parameterTypes: ['String'], returnType: 'String', description: 'Masks sensitive email characters' }
  ]
};

describe('UDF Library Components', () => {
  let container = null, root = null;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); container = null; });

  test('UdfMasterList renders list of JARs and status filters', () => {
    const handleFilter = jest.fn();
    act(() => {
      root.render(<UdfMasterList jars={[mockJar]} selectedId="jar-1" onSelectJar={jest.fn()} searchQuery="" onSearchChange={jest.fn()} statusFilter="ALL" onStatusFilterChange={handleFilter} />);
    });
    expect(container.querySelector('#udf-item-name-jar-1').textContent).toBe('security-masking.jar');
    const readyFilterBtn = container.querySelector('#udf-filter-ready');
    act(() => { readyFilterBtn.click(); });
    expect(handleFilter).toHaveBeenCalledWith('READY');
  });

  test('UdfDetailHeader displays metadata and guards referenced delete', () => {
    act(() => {
      root.render(<UdfDetailHeader jar={mockJar} canDelete={true} isDeleting={false} onDelete={jest.fn()} onDownload={jest.fn()} />);
    });
    expect(container.querySelector('#udf-detail-name').textContent).toBe('security-masking.jar');
    expect(container.querySelector('#udf-detail-verify-banner').textContent).toContain('Bytecode Verified:');
    expect(container.querySelector('#udf-detail-delete-btn').disabled).toBe(true);
  });

  test('UdfMethodsTable renders discovered method signatures and toggles description', () => {
    act(() => { root.render(<UdfMethodsTable functions={mockJar.functions} />); });
    expect(container.querySelector('#udf-method-name-0').textContent).toBe('maskEmail()');
    expect(container.querySelector('#udf-method-tag-0').textContent).toBe('@UDF');
    expect(container.querySelector('#udf-method-ret-badge-0').textContent).toBe('String');
    expect(container.querySelector('#th-function')).not.toBeNull();
    expect(container.querySelector('#udf-method-desc-0')).toBeNull();

    const toggleBtn = container.querySelector('#udf-method-toggle-0');
    expect(toggleBtn).not.toBeNull();
    act(() => { toggleBtn.click(); });
    expect(container.querySelector('#udf-method-desc-0')).not.toBeNull();
    expect(container.querySelector('#udf-method-desc-0').textContent).toContain('Masks sensitive email characters');

    act(() => { toggleBtn.click(); });
    expect(container.querySelector('#udf-method-desc-0')).toBeNull();
  });

  test('UdfDependencies displays reference stats and safety lock', () => {
    act(() => { root.render(<UdfDependencies jar={mockJar} activeTab="deps" />); });
    expect(container.querySelector('#udf-dep-stat-pipe-count').textContent).toBe('2');
    expect(container.querySelector('#udf-dep-stat-cols-count').textContent).toBe('3');
    expect(container.querySelector('#udf-deps-guard-status').textContent).toBe('Deletion Locked');
  });
});
