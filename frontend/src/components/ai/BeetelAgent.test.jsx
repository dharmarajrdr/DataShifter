import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import BeetelChatCanvas from './BeetelChatCanvas';
import BeetelPlanCard from './BeetelPlanCard';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Beetel Agent UI Components', () => {
  let container = null, root = null;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); container = null; });

  const sampleMessages = [
    { id: '1', role: 'USER', content: 'Sync **Postgres** to Snowflake', senderInitials: 'DR' },
    { id: '2', role: 'ASSISTANT', content: 'Synthesized plan:\n- Item 1\n- Item 2\n\n| Stage | Status |\n|---|---|\n| Source | Ready |' },
  ];

  test('renders user message on right, AI message on left, with markdown styles', () => {
    act(() => {
      root.render(<BeetelChatCanvas session={{ id: 's-1', title: 'Data Pipeline Sync' }} messages={sampleMessages} onSendMessage={jest.fn()} />);
    });
    expect(container.textContent).toContain('Postgres');
    expect(container.textContent).toContain('Item 1');
    expect(container.querySelector('strong.font-bold')).not.toBeNull();
    expect(container.querySelector('ul.list-disc')).not.toBeNull();
    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelector('.ml-auto.flex-row-reverse')).not.toBeNull();
    expect(container.querySelector('.mr-auto.flex-row')).not.toBeNull();
  });

  test('renders BeetelPlanCard with steps and handles approval/rejection', () => {
    const onConfirm = jest.fn(), onReject = jest.fn();
    const plan = { id: 'plan-101', title: 'CDC Replication Setup', status: 'PENDING_CONFIRMATION', steps: [{ title: 'Enable WAL' }, { title: 'Create slot' }] };
    act(() => { root.render(<BeetelPlanCard plan={plan} onConfirm={onConfirm} onReject={onReject} />); });
    expect(container.textContent).toContain('CDC Replication Setup');
    const buttons = Array.from(container.querySelectorAll('button'));
    const approveBtn = buttons.find(b => b.textContent.includes('Approve & Execute'));
    const rejectBtn = buttons.find(b => b.textContent.includes('Reject'));
    act(() => approveBtn.click());
    expect(onConfirm).toHaveBeenCalledWith('plan-101');
    act(() => rejectBtn.click());
    expect(onReject).toHaveBeenCalledWith('plan-101');
  });

  test('renders owner and sharedMembers DPs before share button', () => {
    const session = {
      id: 's-1', title: 'CDC Sync Exploration',
      owner: { fullName: 'Alex Rivera', displayInitials: 'AR', avatarColor: '#4f46e5' },
      sharedMembers: [
        { userId: 'u-1', fullName: 'Sarah Connor', displayInitials: 'SC', avatarColor: '#0284c7' },
        { userId: 'u-2', fullName: 'John Doe', displayInitials: 'JD', avatarColor: '#10b981' },
      ],
    };
    act(() => {
      root.render(<BeetelChatCanvas session={session} messages={[]} onSendMessage={jest.fn()} onShareClick={jest.fn()} />);
    });
    expect(container.textContent).toContain('AR');
    expect(container.textContent).toContain('SC');
    expect(container.textContent).toContain('JD');
    expect(container.querySelector('[title="Alex Rivera (Owner)"]')).not.toBeNull();
    expect(container.querySelector('[title="Sarah Connor (Shared)"]')).not.toBeNull();
    expect(Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes('Share'))).not.toBeNull();
  });

  test('triggers onLoadOlder when scrolling to top with hasMore true', () => {
    const handleLoadOlder = jest.fn();
    act(() => {
      root.render(<BeetelChatCanvas session={{ id: 's-1' }} messages={sampleMessages} hasMore={true} loadingOlder={false} onLoadOlder={handleLoadOlder} onSendMessage={jest.fn()} />);
    });
    const scrollContainer = container.querySelector('.overflow-y-auto');
    act(() => {
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 10, configurable: true });
      scrollContainer.dispatchEvent(new Event('scroll'));
    });
    expect(handleLoadOlder).toHaveBeenCalled();
  });

  test('renders access granted notice as a centered WhatsApp-style label', () => {
    const auditMessages = [{ id: 'aud-1', role: 'AUDIT', content: '**Dharma** granted access to Dharmaraj R' }];
    act(() => { root.render(<BeetelChatCanvas session={{ id: 's-1' }} messages={auditMessages} />); });
    const label = container.querySelector('.beetel-audit-message');
    expect(label).not.toBeNull();
    expect(label.className).toContain('justify-center');
    expect(label.textContent).toContain('Dharma granted access to Dharmaraj R');
    expect(container.querySelector('.fa-robot')).toBeNull();
  });
});
