import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import MetricCard from './MetricCard';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('MetricCard Component', () => {
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

  test('renders label, value, and default generated id', () => {
    act(() => {
      root.render(<MetricCard label="Overall Progress" value="85%" />);
    });
    const card = container.querySelector('#metric-overall-progress');
    expect(card).not.toBeNull();
    expect(card.textContent).toContain('Overall Progress');
    expect(card.textContent).toContain('85%');
    expect(card.className).toContain('ds-metric-card');
  });

  test('renders with custom id, className, and icon', () => {
    act(() => {
      root.render(
        <MetricCard
          id="custom-metric"
          className="extra-cls"
          label="Pipelines"
          value="4 / 4"
          color="#059669"
          icon="fa-solid fa-check"
        />
      );
    });
    const card = container.querySelector('#custom-metric');
    expect(card).not.toBeNull();
    expect(card.className).toContain('extra-cls');
    const icon = container.querySelector('#custom-metric-icon');
    expect(icon).not.toBeNull();
    expect(icon.className).toContain('fa-solid fa-check');
  });

  test('applies white background and light border styling', () => {
    act(() => {
      root.render(<MetricCard label="Errors" value="0" />);
    });
    const card = container.querySelector('.ds-metric-card');
    expect(card.style.background).toBe('rgb(255, 255, 255)');
    expect(card.style.border.toLowerCase()).toBe('1px solid #e2e8f0');
  });
});
