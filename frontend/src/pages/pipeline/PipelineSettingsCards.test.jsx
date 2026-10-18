import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PipelineSettings from '../PipelineSettings';
import * as AuthContextModule from '../../contexts/AuthContext';
import * as NotificationContextModule from '../../contexts/NotificationContext';
import { settingsApi } from '../../services/api';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../services/api', () => ({
  settingsApi: {
    getByPipelineId: jest.fn(),
    save: jest.fn(),
    addTablePair: jest.fn(),
    removeTablePair: jest.fn(),
  },
  cdcApi: { getCheckpoint: jest.fn(), resetCheckpoint: jest.fn() },
  connectionApi: { listTables: jest.fn().mockResolvedValue({ data: [] }) },
  pipelineApi: { delete: jest.fn() },
}));

describe('PipelineSettings bg-white card sections', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    jest.clearAllMocks();
    jest.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'u-1', name: 'Tester' },
      hasPermission: () => true,
    });
    jest.spyOn(NotificationContextModule, 'useNotification').mockReturnValue({
      success: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    container = null;
    jest.restoreAllMocks();
  });

  test('applies bg-white card styling to all pipeline settings sections', async () => {
    settingsApi.getByPipelineId.mockResolvedValue({
      data: {
        id: 'p-100',
        name: 'Test Pipeline',
        description: 'Test description',
        pipelineMode: 'BATCH',
        chunkSize: 5000,
        sourcePoolSize: 4,
        targetPoolSize: 8,
        ignoreExceptions: false,
        maxErrorThreshold: 10,
        logSourceRow: true,
        previewInflightRecords: true,
        tables: [{ id: 'pt-1', sourceTable: 'src_t', targetMappings: [{ id: 'ttm-1', targetTable: 'tgt_t', writeMode: 'UPSERT' }] }],
      },
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/pipelines/p-100/settings']}>
          <Routes>
            <Route path="/pipelines/:pipelineId/settings" element={<PipelineSettings />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const bgWhiteCards = Array.from(container.querySelectorAll('.bg-white'));
    expect(bgWhiteCards.length).toBeGreaterThanOrEqual(7);

    const text = container.textContent;
    expect(text).toContain('General');
    expect(text).toContain('Execution mode & CDC');
    expect(text).toContain('Table pairs');
    expect(text).toContain('Table write modes');
    expect(text).toContain('Processing');
    expect(text).toContain('Connection pool');
    expect(text).toContain('Error handling');
    expect(text).toContain('Data privacy');
    expect(text).toContain('Danger zone');
  });
});
