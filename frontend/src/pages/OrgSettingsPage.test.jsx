import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import OrgSettingsPage from './OrgSettingsPage';
import MembersPage from './MembersPage';
import { authApi } from '../services/authApi';
import * as AuthContextModule from '../contexts/AuthContext';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../services/authApi', () => ({
  authApi: {
    getOrg: jest.fn(),
    updateOrg: jest.fn(),
    getMembers: jest.fn(),
    getRoles: jest.fn(),
    getInvitations: jest.fn(),
    sendInvite: jest.fn(),
    handleInvitation: jest.fn(),
    updateMember: jest.fn(),
  },
}));

describe('Organization Settings and Members Pages', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    jest.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    container = null;
  });

  const mockAuth = (permissions = ['org:manage_members', 'org:manage_roles', 'org:manage_invites'], userOverrides = {}) => {
    const user = {
      id: 'u-001',
      fullName: 'Test Admin',
      email: 'admin@test.com',
      orgId: 'org-123',
      orgName: 'Acme Corp',
      effectivePermissions: permissions,
      ...userOverrides,
    };
    jest.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user,
      updateUser: jest.fn(),
      refreshOrganizations: jest.fn(),
      hasPermission: (p) => permissions.includes(p),
      hasAnyPermission: (...perms) => perms.some((p) => permissions.includes(p)),
    });
  };

  test('renders organization details and allows editing when user has permission', async () => {
    mockAuth(['org:manage_roles', 'org:manage_members']);

    authApi.getOrg.mockResolvedValue({
      data: {
        id: 'org-123',
        name: 'Acme Corp',
        slug: 'acme-corp',
        logoUrl: 'https://example.com/logo.png',
        memberCount: 5,
        createdAt: '2026-01-01T00:00:00Z',
      },
    });

    authApi.updateOrg.mockResolvedValue({
      data: {
        id: 'org-123',
        name: 'Acme Corporation',
        slug: 'acme-corp',
        logoUrl: 'https://example.com/logo.png',
        memberCount: 5,
        createdAt: '2026-01-01T00:00:00Z',
      },
    });

    await act(async () => {
      root.render(
        <MemoryRouter>
          <OrgSettingsPage />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('Organization details');
    expect(container.textContent).toContain('Organization slug');
    expect(container.textContent).toContain('acme-corp');

    const orgIdInput = Array.from(container.querySelectorAll('input')).find((i) => i.value === 'org-123');
    expect(orgIdInput).not.toBeNull();

    const nameInput = container.querySelector('input[type="text"][placeholder="e.g. Acme Corp"]');
    expect(nameInput).not.toBeNull();
    expect(nameInput.value).toBe('Acme Corp');

    // Edit the organization name
    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(nameInput, 'Acme Corporation');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const saveButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Save changes'
    );
    expect(saveButton).not.toBeNull();
    expect(saveButton.disabled).toBe(false);

    await act(async () => {
      saveButton.click();
    });

    expect(authApi.updateOrg).toHaveBeenCalledWith({
      name: 'Acme Corporation',
      logoUrl: 'https://example.com/logo.png',
    });
    expect(container.textContent).toContain('Organization details updated successfully.');
  });

  test('renders view-only mode when user lacks org management permission', async () => {
    mockAuth([]); // No permissions

    authApi.getOrg.mockResolvedValue({
      data: {
        id: 'org-123',
        name: 'Acme Corp',
        slug: 'acme-corp',
        logoUrl: '',
        memberCount: 3,
        createdAt: '2026-01-01T00:00:00Z',
      },
    });

    await act(async () => {
      root.render(
        <MemoryRouter>
          <OrgSettingsPage />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('You have view-only access');
    const nameInput = container.querySelector('input[placeholder="e.g. Acme Corp"]');
    expect(nameInput.disabled).toBe(true);

    const saveButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Save changes'
    );
    expect(saveButton).toBeUndefined();
  });

  test('renders MembersPage with members list and invite form for permitted users', async () => {
    mockAuth(['org:manage_members', 'org:manage_invites']);

    authApi.getMembers.mockResolvedValue({
      data: {
        members: [
          {
            id: 'u-001',
            fullName: 'Test Admin',
            email: 'admin@test.com',
            roleName: 'Admin',
            displayInitials: 'TA',
            active: true,
          },
          {
            id: 'u-002',
            fullName: 'Alice Smith',
            email: 'alice@test.com',
            roleName: 'Viewer',
            displayInitials: 'AS',
            active: true,
          },
        ],
        totalMembers: 2,
        totalPages: 1,
      },
    });

    authApi.getRoles.mockResolvedValue({
      data: [
        { id: 'r-1', name: 'Admin' },
        { id: 'r-2', name: 'Viewer' },
      ],
    });

    authApi.getInvitations.mockResolvedValue({
      data: [],
    });

    await act(async () => {
      root.render(
        <MemoryRouter>
          <MembersPage />
        </MemoryRouter>
      );
    });

    expect(container.textContent).toContain('2 members in your organization');
    expect(container.textContent).toContain('Test Admin');
    expect(container.textContent).toContain('Alice Smith');
    expect(container.textContent).toContain('Invite members');

    const emailInput = container.querySelector('input[type="email"]');
    expect(emailInput).not.toBeNull();
  });
});
