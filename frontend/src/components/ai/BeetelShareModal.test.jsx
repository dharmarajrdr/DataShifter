import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import BeetelShareModal from './BeetelShareModal';
import { aiApi } from '../../services/aiApi';

jest.mock('../../services/aiApi');
jest.mock('../../contexts/NotificationContext', () => ({
  useNotification: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn() }),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('BeetelShareModal', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    jest.clearAllMocks();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    container = null;
  });

  test('fetches members and submits share request', async () => {
    aiApi.listOrgMembers.mockResolvedValue({
      data: [
        { userId: 'u-1', fullName: 'Alice Engineer', email: 'alice@example.com' },
        { userId: 'u-2', fullName: 'Bob Architect', email: 'bob@example.com' },
      ],
    });
    aiApi.shareSession.mockResolvedValue({ data: { id: 's-1', isShared: true } });

    const onClose = jest.fn();
    const onSessionUpdated = jest.fn();

    await act(async () => {
      root.render(
        <BeetelShareModal
          isOpen={true}
          session={{ id: 's-1', title: 'Test Session', sharedMembers: [] }}
          onClose={onClose}
          onSessionUpdated={onSessionUpdated}
        />
      );
    });

    expect(container.textContent).toContain('Alice Engineer');
    expect(container.textContent).toContain('Bob Architect');

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);

    await act(async () => {
      checkboxes[0].click();
    });

    const shareBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Share (1)'));
    expect(shareBtn).toBeDefined();

    await act(async () => {
      shareBtn.click();
    });

    expect(aiApi.shareSession).toHaveBeenCalledWith('s-1', ['u-1']);
    expect(onSessionUpdated).toHaveBeenCalledWith({ id: 's-1', isShared: true });
    expect(onClose).toHaveBeenCalled();
  });
});

