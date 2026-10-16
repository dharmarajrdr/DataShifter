import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { PipelineRedirect, WorkflowRedirect } from './RouteRedirects';

global.IS_REACT_ACT_ENVIRONMENT = true;

const LocationTracker = () => {
  const loc = useLocation();
  return <div id="current-location">{loc.pathname}</div>;
};

describe('RouteRedirects Component', () => {
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

  test('PipelineRedirect redirects /pipelines/:pipelineId to /pipelines/:pipelineId/monitor', () => {
    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/pipelines/7b582a8e-0ec8-4fb6-aa56-02ccf8248943']}>
          <Routes>
            <Route path="/pipelines/:pipelineId" element={<PipelineRedirect />} />
            <Route path="/pipelines/:pipelineId/monitor" element={<LocationTracker />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const locationEl = container.querySelector('#current-location');
    expect(locationEl).not.toBeNull();
    expect(locationEl.textContent).toBe('/pipelines/7b582a8e-0ec8-4fb6-aa56-02ccf8248943/monitor');
  });

  test('WorkflowRedirect redirects /workflows/:workflowId to /workflows/:workflowId/monitor', () => {
    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/workflows/wf-9988']}>
          <Routes>
            <Route path="/workflows/:workflowId" element={<WorkflowRedirect />} />
            <Route path="/workflows/:workflowId/monitor" element={<LocationTracker />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const locationEl = container.querySelector('#current-location');
    expect(locationEl).not.toBeNull();
    expect(locationEl.textContent).toBe('/workflows/wf-9988/monitor');
  });
});
