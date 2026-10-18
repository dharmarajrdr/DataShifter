import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { Sidebar } from './sidebar/Sidebar';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { fullName: 'Test User', displayInitials: 'TU', roleName: 'Admin', orgName: 'DataShifter' },
    organizations: [{ orgId: 'org-1', orgName: 'DataShifter' }],
    switchOrg: jest.fn(),
  }),
}));

jest.mock('../../services/authApi', () => ({
  authApi: {
    myInvitations: jest.fn(() => Promise.resolve({ data: [] })),
    handleInvitation: jest.fn(() => Promise.resolve({})),
    me: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

describe('Sidebar persistence with is_collapse', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    container = null;
    localStorage.clear();
  });

  test('AppLayout restores collapsed state from is_collapse in localStorage', () => {
    localStorage.setItem('is_collapse', 'true');
    act(() => {
      root.render(<MemoryRouter initialEntries={['/']}><AppLayout /></MemoryRouter>);
    });
    const sidebar = container.querySelector('#main-sidebar');
    expect(sidebar.className).toContain('w-16');

    const toggleBtn = container.querySelector('#sidebar-collapse-toggle');
    act(() => toggleBtn.click());
    expect(sidebar.className).toContain('w-60');
    expect(localStorage.getItem('is_collapse')).toBe('false');
  });

  test('Sidebar uncontrolled restores from localStorage and writes on toggle', () => {
    localStorage.setItem('is_collapse', 'true');
    act(() => {
      root.render(<MemoryRouter><Sidebar id="test-sidebar" /></MemoryRouter>);
    });
    const sidebar = container.querySelector('#test-sidebar');
    expect(sidebar.className).toContain('w-16');
  });
});
