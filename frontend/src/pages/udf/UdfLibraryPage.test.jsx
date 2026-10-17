import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UdfLibraryPage } from './UdfLibraryPage';

global.IS_REACT_ACT_ENVIRONMENT = true;

let mockPermissions = ['adapter:view', 'udf:view', 'adapter:create', 'udf:create', 'udf:delete'];
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (p) => mockPermissions.includes(p), isAuthenticated: true }),
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

describe('UdfLibraryPage Permissions & Routing', () => {
  let container = null, root = null;
  beforeEach(() => {
    mockPermissions = ['adapter:view', 'udf:view', 'adapter:create', 'udf:create', 'udf:delete'];
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); container = null; });

  const renderPage = async (path = '/library/adapters') => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[path]}>
          <Routes><Route path="/library/:tab" element={<UdfLibraryPage />} /></Routes>
        </MemoryRouter>
      );
    });
  };

  test('renders adapters tab when user has adapter:view', async () => {
    await renderPage('/library/adapters');
    expect(container.querySelector('#library-adapters-split')).not.toBeNull();
    expect(container.querySelector('#library-primary-upload-btn')).not.toBeNull();
  });

  test('renders section error without upload button when user lacks adapter:view', async () => {
    mockPermissions = ['udf:view', 'udf:create'];
    await renderPage('/library/adapters');
    expect(container.querySelector('#section-forbidden-adapters')).not.toBeNull();
    expect(container.querySelector('#library-primary-upload-btn')).toBeNull();
  });

  test('renders udfs tab when user has udf:view', async () => {
    await renderPage('/library/udfs');
    expect(container.querySelector('#library-udfs-split')).not.toBeNull();
    expect(container.querySelector('#library-primary-upload-btn')).not.toBeNull();
  });

  test('renders section error without upload button when user lacks udf:view', async () => {
    mockPermissions = ['adapter:view', 'adapter:create'];
    await renderPage('/library/udfs');
    expect(container.querySelector('#section-forbidden-udfs')).not.toBeNull();
    expect(container.querySelector('#library-primary-upload-btn')).toBeNull();
  });

  test('blocks entire page when user lacks both permissions', async () => {
    mockPermissions = [];
    await renderPage('/library/adapters');
    expect(container.textContent).toContain("You don't have permission to view the Library.");
    expect(container.querySelector('#library-page')).toBeNull();
  });
});
