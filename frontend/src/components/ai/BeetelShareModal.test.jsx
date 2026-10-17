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
  let container = null, root = null;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    jest.clearAllMocks();
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); container = null; });

  test('fetches max 5 members when no search and submits share', async () => {
    aiApi.listOrgMembers.mockResolvedValue({
      data: [
        { userId: 'u-1', fullName: 'Alice Engineer', email: 'alice@example.com' },
        { userId: 'u-2', fullName: 'Bob Architect', email: 'bob@example.com' },
      ],
    });
    aiApi.shareSession.mockResolvedValue({ data: { id: 's-1', isShared: true } });
    const onClose = jest.fn(), onSessionUpdated = jest.fn();

    await act(async () => {
      root.render(<BeetelShareModal isOpen={true} session={{ id: 's-1', title: 'Test Session', sharedMembers: [] }} onClose={onClose} onSessionUpdated={onSessionUpdated} />);
    });
    expect(aiApi.listOrgMembers).toHaveBeenCalledWith(undefined, 5);
    expect(container.textContent).toContain('Alice Engineer');

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
    await act(async () => { checkboxes[0].click(); });

    const shareBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Share (1)'));
    await act(async () => { shareBtn.click(); });
    expect(aiApi.shareSession).toHaveBeenCalledWith('s-1', ['u-1']);
    expect(onSessionUpdated).toHaveBeenCalledWith({ id: 's-1', isShared: true });
    expect(onClose).toHaveBeenCalled();
  });

  test('fetches users dynamically when search input is changed', async () => {
    aiApi.listOrgMembers.mockResolvedValue({
      data: [{ userId: 'u-99', fullName: 'Search Result User', email: 'search@example.com' }],
    });
    await act(async () => {
      root.render(<BeetelShareModal isOpen={true} session={{ id: 's-1', title: 'Test Session', sharedMembers: [] }} onClose={jest.fn()} />);
    });
    const searchInput = container.querySelector('#beetel-share-search-input');
    expect(searchInput).not.toBeNull();

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(searchInput, 'Search');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(aiApi.listOrgMembers).toHaveBeenCalledWith('Search', undefined);
  });

  test('excludes myself (current user or session owner) from share list', async () => {
    aiApi.listOrgMembers.mockResolvedValue({
      data: [
        { userId: 'u-1', fullName: 'Alice Engineer', email: 'alice@example.com' },
        { userId: 'u-current', fullName: 'Current Me', email: 'me@example.com' },
      ],
    });
    await act(async () => {
      root.render(
        <BeetelShareModal
          isOpen={true}
          session={{ id: 's-1', title: 'Test Session', ownerUserId: 'u-current', sharedMembers: [] }}
          currentUser={{ id: 'u-current', email: 'me@example.com' }}
          onClose={jest.fn()}
        />
      );
    });
    expect(container.textContent).toContain('Alice Engineer');
    expect(container.textContent).not.toContain('Current Me');
    expect(container.querySelectorAll('input[type="checkbox"]').length).toBe(1);
  });
});
