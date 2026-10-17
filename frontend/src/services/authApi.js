/* ============================================================
   AUTH API — signup, login, refresh, org management
   
   These call auth-service endpoints via Gateway.
   Public endpoints use { skipAuth: true } to avoid injecting token.
   ============================================================ */

import { apiClient, USE_MOCK } from './apiClient';

const mockResponse = (data, message = 'Success') =>
  Promise.resolve({ message, data, info: null, status: 200 });

const MOCK_USER = {
  id: 'u-001', email: 'dharr@paypal.com', fullName: 'Dharmaraj R',
  displayInitials: 'DR', avatarColor: '#534AB7',
  orgId: 'org-001', orgName: 'PayPal',
  roleId: 'role-001', roleName: 'Admin',
  effectivePermissions: [
    'pipeline:create', 'pipeline:view', 'pipeline:edit', 'pipeline:delete',
    'pipeline:run', 'pipeline:pause', 'pipeline:stop',
    'namespace:create', 'namespace:edit', 'namespace:delete',
    'connection:create', 'connection:view', 'connection:edit', 'connection:delete',
    'connection:test', 'connection:browse_schema',
    'monitor:view', 'monitor:view_errors', 'settings:edit',
    'org:manage_members', 'org:manage_roles', 'org:manage_invites', 'org:view_audit',
  ],
  active: true, emailVerified: false,
};

const MOCK_TOKEN_RESPONSE = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 900,
  tokenType: 'Bearer',
  user: MOCK_USER,
};

export const authApi = {

  signup: (payload) => USE_MOCK
    ? mockResponse({ ...MOCK_TOKEN_RESPONSE, user: { ...MOCK_USER, fullName: payload.fullName, email: payload.email } })
    : apiClient.post('/auth/signup', payload, { skipAuth: true }),

  login: (payload) => USE_MOCK
    ? mockResponse(MOCK_TOKEN_RESPONSE)
    : apiClient.post('/auth/login', payload, { skipAuth: true }),

  forgotPassword: (payload) => USE_MOCK
    ? mockResponse(null)
    : apiClient.post('/auth/forgot-password', payload, { skipAuth: true }),

  resetPassword: (payload) => USE_MOCK
    ? mockResponse(null)
    : apiClient.post('/auth/reset-password', payload, { skipAuth: true }),

  refresh: (payload) => USE_MOCK
    ? mockResponse(MOCK_TOKEN_RESPONSE)
    : apiClient.post('/auth/refresh', payload, { skipAuth: true }),

  me: () => USE_MOCK
    ? mockResponse(MOCK_USER)
    : apiClient.get('/auth/me'),

  updateProfile: (payload) => USE_MOCK
    ? mockResponse({ ...MOCK_USER, ...payload })
    : apiClient.put('/auth/me', payload),

  changePassword: (payload) => apiClient.put('/auth/me/password', payload),

  switchOrg: (orgId) => apiClient.post('/auth/switch-org', { orgId }),

  myOrganizations: () => apiClient.get('/auth/my-organizations'),

  myInvitations: () => USE_MOCK
    ? mockResponse([])
    : apiClient.get('/auth/my-invitations'),

  respondInvitation: (invId, action) => USE_MOCK
    ? mockResponse(null)
    : apiClient.put(`/auth/invitations/${invId}`, { action }),

  // Org management
  getOrg: () => USE_MOCK
    ? mockResponse({
        id: 'org-001',
        name: 'PayPal',
        slug: 'paypal',
        logoUrl: '',
        memberCount: 2,
        createdAt: '2026-01-01T00:00:00Z',
      })
    : apiClient.get('/auth/org'),

  getOrgQuotas: () => {
    if (!USE_MOCK) return apiClient.get('/auth/org/quotas');
    let pCount = 5;
    let cCount = 3;
    try {
      const p = localStorage.getItem('ds_mock_pipelines');
      if (p) pCount = JSON.parse(p).length;
      const c = localStorage.getItem('ds_mock_connections');
      if (c) cCount = JSON.parse(c).length;
    } catch {}
    return mockResponse({
      planName: 'Enterprise',
      quotas: [
        { key: 'pipelines', label: 'Pipelines Used', current: String(pCount), max: '50', pct: Math.round((pCount * 100) / 50), color: 'bg-indigo-600' },
        { key: 'connections', label: 'Active Connections', current: String(cCount), max: '25', pct: Math.round((cCount * 100) / 25), color: 'bg-indigo-600' },
        { key: 'rows', label: 'Monthly Rows Migrated', current: '191.9M', max: '250M', pct: 77, color: 'bg-emerald-600' },
      ],
    });
  },

  updateOrg: (payload) => USE_MOCK
    ? mockResponse({
        id: 'org-001',
        name: payload.name || 'PayPal',
        slug: (payload.name || 'paypal').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        logoUrl: payload.logoUrl || '',
        memberCount: 2,
        createdAt: '2026-01-01T00:00:00Z',
      })
    : apiClient.put('/auth/org', payload),

  createOrg: (payload) => USE_MOCK
    ? mockResponse({ id: 'org-new', name: payload.name, slug: payload.name.toLowerCase().replace(/\s+/g, '-') })
    : apiClient.post('/auth/orgs', payload),

  requestAccess: (payload) => USE_MOCK
    ? mockResponse(null)
    : apiClient.post('/auth/request-access', payload),

  // Invitations (for org admins)
  getInvitations: () => USE_MOCK
    ? mockResponse([])
    : apiClient.get('/auth/invitations'),

  sendInvite: (payload) => USE_MOCK
    ? mockResponse({ id: 'inv-new', email: payload.email, status: 'PENDING' })
    : apiClient.post('/auth/invitations', payload),

  handleInvitation: (id, action) => USE_MOCK
    ? mockResponse(null)
    : apiClient.post(`/auth/invitations/${id}`, { action }),

  // Roles
  getRoles: () => USE_MOCK
    ? mockResponse([
        { id: 'role-001', name: 'Admin', description: 'Full access', system: true, permissions: [], memberCount: 1 },
        { id: 'role-002', name: 'Editor', description: 'Create and manage pipelines', system: true, permissions: [], memberCount: 2 },
        { id: 'role-003', name: 'Viewer', description: 'Read-only access', system: true, permissions: [], memberCount: 1 },
      ])
    : apiClient.get('/auth/roles'),

  createRole: (payload) => USE_MOCK
    ? mockResponse({ ...payload, id: 'role-new', system: false, memberCount: 0 })
    : apiClient.post('/auth/roles', payload),

  updateRole: (id, payload) => USE_MOCK
    ? mockResponse(payload)
    : apiClient.put(`/auth/roles/${id}`, payload),

  deleteRole: (id) => USE_MOCK
    ? mockResponse(null)
    : apiClient.delete(`/auth/roles/${id}`),

  // Members
  getMembers: (search = '', page = 0, size = 9) => USE_MOCK
    ? mockResponse({
        members: [
          { ...MOCK_USER, roleName: 'Admin' },
          { id: 'u-002', email: 'keeraj@paypal.com', fullName: 'Keertiga Raj', displayInitials: 'KR', avatarColor: '#D4537E', roleName: 'Editor', active: true },
        ],
        totalMembers: 2, page: 0, totalPages: 1,
      })
    : apiClient.get(`/auth/members?search=${encodeURIComponent(search)}&page=${page}&size=${size}`),

  updateMember: (userId, payload) => USE_MOCK
    ? mockResponse(null)
    : apiClient.put(`/auth/members/${userId}`, payload),

  removeMember: (userId) => USE_MOCK
    ? mockResponse(null)
    : apiClient.delete(`/auth/members/${userId}`),

  getMyInvitations: () => USE_MOCK
    ? mockResponse([])
    : apiClient.get('/auth/my-invitations'),

  handleInvitation: (id, action) => USE_MOCK
    ? mockResponse(null)
    : apiClient.post(`/auth/invitations/${id}`, { action }),
};