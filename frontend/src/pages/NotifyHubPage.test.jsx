import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NotifyHubPage from './NotifyHubPage';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../services/api', () => ({
  notifyHubApi: {
    listChannels: jest.fn().mockResolvedValue([]),
    listTemplates: jest.fn().mockResolvedValue([]),
    listListeners: jest.fn().mockResolvedValue([]),
    getLogs: jest.fn().mockResolvedValue([]),
  },
  pipelineApi: {
    getAll: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../contexts/NotificationContext', () => ({
  useNotification: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn() }),
}));

describe('NotifyHubPage Routing', () => {
  let container = null, root = null;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); container = null; });

  const renderAt = async (path) => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/notifyhub/:tab" element={<NotifyHubPage />} />
          </Routes>
        </MemoryRouter>
      );
    });
  };

  test('activates channels tab on /notifyhub/channels', async () => {
    await renderAt('/notifyhub/channels');
    const tab = container.querySelector('#notifyhub-tabs-tab-channels');
    expect(tab).not.toBeNull();
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('#notifyhub-tabs-tab-listeners').getAttribute('aria-selected')).toBe('false');
  });

  test('activates listeners tab on /notifyhub/listeners', async () => {
    await renderAt('/notifyhub/listeners');
    const tab = container.querySelector('#notifyhub-tabs-tab-listeners');
    expect(tab).not.toBeNull();
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('#notifyhub-tabs-tab-channels').getAttribute('aria-selected')).toBe('false');
  });

  test('activates templates tab on /notifyhub/templates', async () => {
    await renderAt('/notifyhub/templates');
    const tab = container.querySelector('#notifyhub-tabs-tab-templates');
    expect(tab).not.toBeNull();
    expect(tab.getAttribute('aria-selected')).toBe('true');
  });

  test('activates logs tab on /notifyhub/logs', async () => {
    await renderAt('/notifyhub/logs');
    const tab = container.querySelector('#notifyhub-tabs-tab-logs');
    expect(tab).not.toBeNull();
    expect(tab.getAttribute('aria-selected')).toBe('true');
  });
});
