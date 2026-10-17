import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { LibraryHeader } from './LibraryHeader';
import { AdapterMasterList } from './AdapterMasterList';
import { AdapterDetailPane } from './AdapterDetailPane';
import { MOCK_ADAPTERS } from '../../services/adapterApi';

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
    act(() => {
      root.render(
        <MemoryRouter>
          <LibraryHeader activeTab="adapters" onTabChange={handleTab} adapterCount={4} udfCount={2} />
        </MemoryRouter>
      );
    });

    expect(container.querySelector('#badge-adapter-count').textContent).toBe('4');
    expect(container.querySelector('#badge-udf-count').textContent).toBe('2');
    const udfsTab = container.querySelector('#lib-tab-udfs');
    act(() => { udfsTab.click(); });
    expect(handleTab).toHaveBeenCalledWith('udfs');
  });

  test('AdapterMasterList renders adapter list and filters', () => {
    const handleFilter = jest.fn();
    act(() => {
      root.render(
        <AdapterMasterList
          adapters={MOCK_ADAPTERS}
          selectedId="adp-1"
          onSelectAdapter={jest.fn()}
          searchQuery=""
          onSearchChange={jest.fn()}
          typeFilter="ALL"
          onTypeFilterChange={handleFilter}
        />
      );
    });

    expect(container.querySelector('#adapter-name-adp-1').textContent).toBe('Oracle GoldenGate CDC Reader');
    expect(container.querySelector('#adapter-official-badge-adp-1')).not.toBeNull();
    const readerFilter = container.querySelector('#adapter-filter-reader');
    act(() => { readerFilter.click(); });
    expect(handleFilter).toHaveBeenCalledWith('READER');
  });

  test('AdapterDetailPane displays schema properties table and sample payload', () => {
    act(() => {
      root.render(<AdapterDetailPane adapter={MOCK_ADAPTERS[0]} onCreatePipeline={jest.fn()} />);
    });

    expect(container.querySelector('#adapter-detail-name').textContent).toBe('Oracle GoldenGate CDC Reader');
    expect(container.querySelector('#th-config-key').textContent).toBe('Parameter Key');
    expect(container.querySelector('#adapter-cfg-key-0').textContent).toBe('trailDirPath');
    expect(container.querySelector('#adapter-payload-json-code')).not.toBeNull();
    const scrollEl = container.querySelector('#adapter-config-scroll');
    expect(scrollEl.className).not.toContain('overflow-y-auto');
  });

  test('AdapterDetailPane toggles expand and collapse for config properties', () => {
    act(() => {
      root.render(<AdapterDetailPane adapter={MOCK_ADAPTERS[0]} onCreatePipeline={jest.fn()} />);
    });
    const toggleBtn = container.querySelector('#adapter-config-toggle-btn');
    expect(toggleBtn.textContent).toContain('Collapse');
    expect(container.querySelector('#adapter-config-table')).not.toBeNull();
    act(() => { toggleBtn.click(); });
    expect(toggleBtn.textContent).toContain('Expand');
    expect(container.querySelector('#adapter-config-table')).toBeNull();
  });
});
