import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { LibraryHeader } from './LibraryHeader';
import { AdapterMasterList } from './AdapterMasterList';
import { AdapterDetailPane } from './AdapterDetailPane';
import { MOCK_ADAPTERS, adapterApi } from '../../services/adapterApi';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Library Components', () => {
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

  test('LibraryHeader renders dual tabs with counts and responds to tab change', () => {
    const handleTab = jest.fn();
    act(() => { root.render(<MemoryRouter><LibraryHeader activeTab="adapters" onTabChange={handleTab} adapterCount={4} udfCount={2} /></MemoryRouter>); });
    expect(container.querySelector('#badge-adapter-count').textContent).toBe('4');
    expect(container.querySelector('#badge-udf-count').textContent).toBe('2');
    act(() => { container.querySelector('#lib-tab-udfs').click(); });
    expect(handleTab).toHaveBeenCalledWith('udfs');
  });

  test('AdapterMasterList renders adapter list and filters', () => {
    const handleFilter = jest.fn();
    act(() => {
      root.render(<AdapterMasterList adapters={MOCK_ADAPTERS} selectedId="adp-1" onSelectAdapter={jest.fn()} searchQuery="" onSearchChange={jest.fn()} typeFilter="ALL" onTypeFilterChange={handleFilter} />);
    });
    expect(container.querySelector('#adapter-name-adp-1').textContent).toBe('Oracle GoldenGate CDC Reader');
    act(() => { container.querySelector('#adapter-filter-reader').click(); });
    expect(handleFilter).toHaveBeenCalledWith('READER');
  });

  test('AdapterDetailPane displays schema properties table and sample payload', () => {
    act(() => { root.render(<AdapterDetailPane adapter={MOCK_ADAPTERS[0]} />); });
    expect(container.querySelector('#adapter-detail-name').textContent).toBe('Oracle GoldenGate CDC Reader');
    expect(container.querySelector('#th-config-key').textContent).toBe('Parameter Key');
    expect(container.querySelector('#adapter-cfg-key-0').textContent).toBe('trailDirPath');
    expect(container.querySelector('#adapter-config-scroll').className).not.toContain('overflow-y-auto');
    expect(container.querySelector('#adapter-create-pipe-btn')).toBeNull();
  });

  test('AdapterDetailPane toggles expand and collapse for config properties', () => {
    act(() => { root.render(<AdapterDetailPane adapter={MOCK_ADAPTERS[0]} />); });
    const toggleBtn = container.querySelector('#adapter-config-toggle-btn');
    expect(toggleBtn.textContent).toContain('Collapse');
    act(() => { toggleBtn.click(); });
    expect(toggleBtn.textContent).toContain('Expand');
    expect(container.querySelector('#adapter-config-table')).toBeNull();
  });

  test('AdapterDetailPane downloads artifact on Download JAR click', async () => {
    const spy = jest.spyOn(adapterApi, 'download').mockResolvedValueOnce();
    act(() => { root.render(<AdapterDetailPane adapter={MOCK_ADAPTERS[0]} />); });
    const btn = container.querySelector('#adapter-download-btn');
    expect(btn).not.toBeNull();
    await act(async () => { btn.click(); });
    expect(spy).toHaveBeenCalledWith('adp-1', 'oracle-gg-reader-1.2.0.jar');
    spy.mockRestore();
  });
});
