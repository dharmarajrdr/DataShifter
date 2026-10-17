import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UdfLibraryPage } from './UdfLibraryPage';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: () => true, isAuthenticated: true }),
}));

jest.mock('../../contexts/NotificationContext', () => ({
  useNotification: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn() }),
}));

jest.mock('../../services/adapterApi', () => ({
  adapterApi: { getAll: () => Promise.resolve({ data: [{ id: 'adp-1', name: 'Test Adapter', adapterKey: 'test', adapterType: 'READER' }] }) },
}));

jest.mock('../../services/api', () => ({
  udfApi: { getAll: () => Promise.resolve({ data: [{ id: 'udf-1', name: 'test.jar', status: 'READY', functions: [] }] }) },
}));

describe('UdfLibraryPage Routing', () => {
  let container = null, root = null;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); container = null; });

  test('renders adapters tab by default on /library/adapters', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/library/adapters']}>
          <Routes>
            <Route path="/library/:tab" element={<UdfLibraryPage />} />
          </Routes>
        </MemoryRouter>
      );
    });
    expect(container.querySelector('#lib-tab-adapters')).not.toBeNull();
    expect(container.querySelector('#lib-tab-adapters').className).toContain('border-brand');
    expect(container.querySelector('#library-adapters-split')).not.toBeNull();
  });

  test('renders udfs tab on /library/udfs', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/library/udfs']}>
          <Routes>
            <Route path="/library/:tab" element={<UdfLibraryPage />} />
          </Routes>
        </MemoryRouter>
      );
    });
    expect(container.querySelector('#lib-tab-udfs')).not.toBeNull();
    expect(container.querySelector('#lib-tab-udfs').className).toContain('border-brand');
    expect(container.querySelector('#library-udfs-split')).not.toBeNull();
  });
});
