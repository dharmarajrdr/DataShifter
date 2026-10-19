import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import PipelineSettingsCdcCard from './PipelineSettingsCdcCard';
import { cdcApi } from '../../../services/api';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

jest.mock('../../../services/api', () => ({
  cdcApi: {
    getCheckpoint: jest.fn(),
    resetCheckpoint: jest.fn(),
  },
}));

describe('PipelineSettingsCdcCard', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    cdcApi.getCheckpoint.mockResolvedValue({ data: {} });
    cdcApi.resetCheckpoint.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    act(() => { root.unmount(); });
    container.remove();
  });

  test('does not render for BATCH mode pipeline', async () => {
    await act(async () => {
      root.render(
        <PipelineSettingsCdcCard
          pipelineId="p-batch"
          settings={{ pipelineMode: 'BATCH', status: 'PAUSED' }}
          update={jest.fn()}
        />
      );
    });
    expect(container.textContent).toBe('');
    expect(container.querySelector('[data-testid="settings-cdc-panel"]')).toBeNull();
  });

  test('renders CDC panel for CDC mode without execution mode switcher', async () => {
    await act(async () => {
      root.render(
        <PipelineSettingsCdcCard
          pipelineId="p-cdc"
          settings={{
            pipelineMode: 'CDC',
            cdcLogType: 'POSTGRES_WAL',
            cdcDirectoryPath: '/pg_wal',
            status: 'PAUSED',
          }}
          update={jest.fn()}
        />
      );
    });
    expect(container.querySelector('[data-testid="settings-cdc-panel"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="settings-mode-batch"]')).toBeNull();
    expect(container.querySelector('[data-testid="settings-mode-cdc"]')).toBeNull();
    expect(container.textContent).toContain('PostgreSQL WAL');
    expect(container.textContent).toContain('PostgreSQL WAL Directory Path');
  });
});
