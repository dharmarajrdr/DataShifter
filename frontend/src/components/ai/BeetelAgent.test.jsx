import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import BeetelChatCanvas from './BeetelChatCanvas';
import BeetelPlanCard from './BeetelPlanCard';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Beetel Agent UI Components', () => {
  let container = null;
  let root = null;

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

  const sampleMessages = [
    { id: '1', role: 'USER', content: 'Sync Postgres to Snowflake', senderInitials: 'DR' },
    { id: '2', role: 'ASSISTANT', content: 'Synthesized 3-stage pipeline.' },
  ];

  test('renders user message on the right and AI message on the left', () => {
    act(() => {
      root.render(
        <BeetelChatCanvas
          session={{ id: 's-1', title: 'Data Pipeline Sync' }}
          messages={sampleMessages}
          onSendMessage={jest.fn()}
        />
      );
    });

    expect(container.textContent).toContain('Sync Postgres to Snowflake');
    expect(container.textContent).toContain('Synthesized 3-stage pipeline.');

    const userP = Array.from(container.querySelectorAll('p')).find(p => p.textContent.includes('Sync Postgres'));
    const aiP = Array.from(container.querySelectorAll('p')).find(p => p.textContent.includes('Synthesized 3-stage'));
    const userWrap = userP?.closest('.flex.items-start');
    const aiWrap = aiP?.closest('.flex.items-start');

    expect(userWrap.className).toContain('ml-auto');
    expect(userWrap.className).toContain('flex-row-reverse');
    expect(aiWrap.className).toContain('mr-auto');
    expect(aiWrap.className).toContain('flex-row');
  });

  test('renders BeetelPlanCard with steps and handles approval/rejection', () => {
    const onConfirm = jest.fn();
    const onReject = jest.fn();
    const plan = {
      id: 'plan-101',
      title: 'CDC Replication Setup',
      status: 'PENDING_CONFIRMATION',
      steps: [{ title: 'Enable WAL' }, { title: 'Create slot' }],
    };

    act(() => {
      root.render(<BeetelPlanCard plan={plan} onConfirm={onConfirm} onReject={onReject} />);
    });

    expect(container.textContent).toContain('CDC Replication Setup');
    expect(container.textContent).toContain('Enable WAL');

    const buttons = Array.from(container.querySelectorAll('button'));
    const approveBtn = buttons.find(b => b.textContent.includes('Approve & Execute'));
    const rejectBtn = buttons.find(b => b.textContent.includes('Reject'));

    act(() => approveBtn.click());
    expect(onConfirm).toHaveBeenCalledWith('plan-101');

    act(() => rejectBtn.click());
    expect(onReject).toHaveBeenCalledWith('plan-101');
  });
});

