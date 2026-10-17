import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PipelineSettingsPage from './PipelineSettingsPage';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../PipelineSettings', () => () => <div id="mock-pipeline-settings">Settings Content</div>);

describe('PipelineSettingsPage Viewport Height', () => {
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

  test('renders with height equal to screen height minus header height', () => {
    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/pipelines/p-1/settings']}>
          <Routes>
            <Route path="/pipelines/:pipelineId/settings" element={<PipelineSettingsPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const page = container.querySelector('#pipeline-settings-page');
    expect(page).not.toBeNull();
    expect(page.className).toContain('pipeline-settings-viewport');
    expect(page.style.height).toBe('calc(100vh - 50px)');
    expect(page.style.maxHeight).toBe('calc(100vh - 50px)');
    expect(container.querySelector('#mock-pipeline-settings')).not.toBeNull();
  });
});
