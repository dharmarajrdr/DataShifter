import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AiKeyCard, { formatErrorMessage } from './AiKeyCard';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('AiKeyCard Component', () => {
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

  test('formats JSON error message cleanly', () => {
    const raw = '413 - {"error":{"message":"Request too large for model qwen3.8 in organization org_1 service tier on_demand","type":"tokens"}}';
    const formatted = formatErrorMessage(raw);
    expect(formatted).toBe('413 - Request too large for model qwen3.8 in organization org_1 service tier on_demand');
  });

  test('renders error banner bar when lastError is present and status is RATE_LIMITED', () => {
    const keyItem = {
      id: 'k-1',
      label: 'Groq Key 1',
      provider: 'GROQ',
      maskedKey: 'gsk_••••••••TtzX',
      modelName: 'openai/gpt-oss-120b',
      status: 'RATE_LIMITED',
      isActive: true,
      lastError: '413 - {"error":{"message":"Rate limit reached for token bucket"}}',
    };

    act(() => {
      root.render(
        <AiKeyCard
          keyItem={keyItem}
          index={0}
          canEdit={true}
          isTesting={false}
          onTest={jest.fn()}
          onReset={jest.fn()}
          onToggleActive={jest.fn()}
          onDelete={jest.fn()}
        />
      );
    });

    expect(container.textContent).toContain('Groq Key 1');
    expect(container.textContent).toContain('Last Error');
    expect(container.textContent).toContain('Cooldown Active');
    expect(container.textContent).toContain('413 - Rate limit reached for token bucket');

    const errorBanner = container.querySelector('.bg-rose-50');
    expect(errorBanner).not.toBeNull();
    expect(errorBanner.className).toContain('border-rose-200');
  });
});

