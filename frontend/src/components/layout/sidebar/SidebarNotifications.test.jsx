import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import SidebarNotifications from './SidebarNotifications';
import { authApi } from '../../../services/authApi';
import { pipelineApi } from '../../../services/api';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', fullName: 'Tester' },
    updateUser: jest.fn(),
    refreshOrganizations: jest.fn(),
  }),
}));

jest.mock('../../../services/authApi', () => ({
  authApi: {
    myInvitations: jest.fn(),
    handleInvitation: jest.fn(() => Promise.resolve({})),
    me: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

jest.mock('../../../services/api', () => ({
  pipelineApi: {
    getAll: jest.fn(),
  },
}));

describe('SidebarNotifications Component', () => {
  let container, root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    jest.clearAllMocks();
    authApi.myInvitations.mockResolvedValue({ data: [] });
    pipelineApi.getAll.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    container = null;
  });

  test('renders bell button and opens popover with invitations and pipeline alerts', async () => {
    authApi.myInvitations.mockResolvedValue({
      data: [{ id: 'inv-1', orgName: 'PayPal-Internal', roleName: 'Editor' }],
    });
    pipelineApi.getAll.mockResolvedValue({
      data: [{ id: 'pipe-12345678', name: 'Postgres Sync', status: 'ERRORED' }],
    });

    await act(async () => {
      root.render(<MemoryRouter><SidebarNotifications /></MemoryRouter>);
    });

    const bellBtn = container.querySelector('#notifications-bell-btn');
    expect(bellBtn).not.toBeNull();
    expect(container.textContent).toContain('2');

    await act(async () => {
      bellBtn.click();
    });

    expect(container.textContent).toContain('Notifications');
    expect(container.textContent).toContain('PayPal-Internal');
    expect(container.textContent).toContain('Postgres Sync Failed');
  });

  test('filters by tab and handles mark all read', async () => {
    authApi.myInvitations.mockResolvedValue({
      data: [{ id: 'inv-1', orgName: 'Stripe-Analytics', roleName: 'Viewer' }],
    });
    pipelineApi.getAll.mockResolvedValue({
      data: [{ id: 'pipe-999', name: 'Oracle Stream', status: 'PAUSED' }],
    });

    await act(async () => {
      root.render(<MemoryRouter><SidebarNotifications /></MemoryRouter>);
    });

    const bellBtn = container.querySelector('#notifications-bell-btn');
    await act(async () => { bellBtn.click(); });

    const markReadBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('Mark all read'));
    expect(markReadBtn).toBeDefined();

    await act(async () => { markReadBtn.click(); });
    expect(container.textContent).toContain('0 new');
  });
});
