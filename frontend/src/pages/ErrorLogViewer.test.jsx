import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ErrorLogViewer from './ErrorLogViewer';
import { errorApi } from '../services/api';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: () => true, user: { id: 'u1' } }),
}));
jest.mock('../contexts/NotificationContext', () => ({
  useNotification: () => ({ success: jest.fn(), error: jest.fn() }),
}));
jest.mock('../services/api', () => ({
  errorApi: { getByPipelineId: jest.fn(), clearErrors: jest.fn(() => Promise.resolve({})) },
}));

const renderViewer = async (root) => {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/pipelines/p-100/errors']}>
        <Routes><Route path="/pipelines/:pipelineId/errors" element={<ErrorLogViewer />} /></Routes>
      </MemoryRouter>
    );
  });
};

describe('ErrorLogViewer Zero Errors and Filter States', () => {
  let container, root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    jest.clearAllMocks();
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  test('renders ErrorZeroState when totalErrors is 0', async () => {
    errorApi.getByPipelineId.mockResolvedValue({
      data: { pipelineName: 'Sync', totalErrors: 0, skipped: 0, pipelineStopped: 0, errorRate: 0, errors: [], errorTypes: [] },
    });
    await renderViewer(root);
    expect(container.textContent).toContain('Zero Errors Recorded');
    expect(container.textContent).toContain('All Systems Healthy & Operational');
    expect(container.textContent).toContain('View Live Throughput & Metrics');
    expect(container.textContent).toContain('100%');
    expect(container.querySelector('input')).toBeNull();
  });

  test('renders ErrorFilterEmptyState when filters match no errors', async () => {
    errorApi.getByPipelineId.mockResolvedValue({
      data: {
        pipelineName: 'Sync', totalErrors: 1, skipped: 1, pipelineStopped: 0, errorRate: 1,
        errors: [{ id: 'e-1', type: 'TYPE_CAST', tableName: 'orders', message: 'Cast failed' }],
        errorTypes: [{ type: 'TYPE_CAST', count: 1 }],
      },
    });
    await renderViewer(root);
    expect(container.textContent).toContain('Cast failed');

    const searchInput = container.querySelector('input');
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(searchInput, 'nonexistent');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('No errors match your filters');
    const resetBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Reset all filters'));
    expect(resetBtn).not.toBeNull();
    act(() => { resetBtn.click(); });
    expect(container.textContent).toContain('Cast failed');
  });
});
