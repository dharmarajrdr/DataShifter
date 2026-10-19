import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import BeetelChatWorkspace from './BeetelChatWorkspace';
import { aiApi } from '../../services/aiApi';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1', fullName: 'Dharmaraj R' } }),
}));

jest.mock('../../services/aiApi', () => ({
  aiApi: {
    listOrgMembers: jest.fn().mockResolvedValue({ data: [] }),
    getSession: jest.fn(),
    getSessionMessages: jest.fn(),
    sendMessage: jest.fn(),
    confirmPlan: jest.fn(),
    rejectPlan: jest.fn(),
    shareSession: jest.fn(),
  },
}));

describe('BeetelChatWorkspace message rendering', () => {
  let container = null, root = null;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    container = null;
  });

  test('renders messages of all roles including ERROR without isError ReferenceError', async () => {
    const mockSession = {
      session: { id: 's-1', title: 'Test Session', model: 'gemini-1.5-pro' },
      messages: [
        { id: 'm-1', role: 'USER', content: 'Create pipeline', createdAt: new Date().toISOString() },
        { id: 'm-2', role: 'ASSISTANT', content: 'Pipeline created', createdAt: new Date().toISOString() },
        { id: 'm-3', role: 'ERROR', content: 'Connection timeout', createdAt: new Date().toISOString() },
        { id: 'm-4', role: 'AUDIT', content: 'Access granted to user', createdAt: new Date().toISOString() },
      ],
      totalCount: 4,
    };
    aiApi.getSession.mockResolvedValueOnce({ data: mockSession });

    await act(async () => {
      root.render(<BeetelChatWorkspace sessionId="s-1" />);
    });

    expect(container.textContent).toContain('Create pipeline');
    expect(container.textContent).toContain('Pipeline created');
    expect(container.textContent).toContain('Connection timeout');
    expect(container.textContent).toContain('Access granted to user');
  });
});
