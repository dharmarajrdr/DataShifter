import { apiClient } from './apiClient';

export const aiApi = {
  // Key pool & LLM configuration
  getKeyPoolStatus: () => apiClient.get('/ai/keys/status'),
  createKey: (data) => apiClient.post('/ai/keys', data),
  updateKey: (id, data) => apiClient.put(`/ai/keys/${id}`, data),
  deleteKey: (id) => apiClient.delete(`/ai/keys/${id}`),
  testKey: (id) => apiClient.post(`/ai/keys/${id}/test`, {}),
  resetKeyHealth: (id) => apiClient.post(`/ai/keys/${id}/reset`, {}),

  // Chat sessions & context
  listSessions: (contextType, contextId) => {
    const params = new URLSearchParams();
    if (contextType) params.set('contextType', contextType);
    if (contextId) params.set('contextId', contextId);
    const qs = params.toString();
    return apiClient.get(`/ai/sessions${qs ? `?${qs}` : ''}`);
  },
  createSession: (data = {}) => apiClient.post('/ai/sessions', data),
  getSession: (id) => apiClient.get(`/ai/sessions/${id}`),
  updateSessionContext: (id, data) => apiClient.put(`/ai/sessions/${id}/context`, data),
  deleteSession: (id) => apiClient.delete(`/ai/sessions/${id}`),

  // Chat messages & Execution Plans
  sendMessage: (data) => apiClient.post('/ai/chat', data),
  decidePlan: (planId, data) => apiClient.post(`/ai/plans/${planId}/decision`, data),
};
