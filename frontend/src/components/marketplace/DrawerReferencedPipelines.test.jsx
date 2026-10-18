import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { DrawerReferencedPipelines } from './DrawerReferencedPipelines';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('DrawerReferencedPipelines', () => {
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
  });

  test('does not render when pipelines list is empty', () => {
    act(() => { root.render(<DrawerReferencedPipelines pipelines={[]} />); });
    expect(container.querySelector('#drawer-referenced-pipelines')).toBeNull();
  });

  test('renders collapsible details with single-row pipelines', () => {
    const pipes = [
      { id: 'p-1', name: 'Products Data Migration', slot: 'Source', status: 'ERRORED' },
    ];
    act(() => { root.render(<DrawerReferencedPipelines pipelines={pipes} />); });
    const details = container.querySelector('#drawer-referenced-pipelines');
    expect(details).not.toBeNull();
    expect(details.hasAttribute('open')).toBe(true);
    expect(details.textContent).toContain('Referenced Pipelines');
    expect(details.textContent).toContain('1 Pipeline');
    expect(details.textContent).toContain('Products Data Migration');
    expect(details.textContent).toContain('Source');
    expect(details.textContent).toContain('ERRORED');
    expect(container.textContent).not.toContain('other pipelines');
  });

  test('caps rendering to 5 pipelines and renders "+ x other pipelines"', () => {
    const pipes = Array.from({ length: 8 }, (_, i) => ({
      id: `p-${i}`,
      name: `Pipeline ${i + 1}`,
      slot: 'Source',
      status: 'RUNNING',
    }));
    act(() => { root.render(<DrawerReferencedPipelines pipelines={pipes} />); });
    const details = container.querySelector('#drawer-referenced-pipelines');
    expect(details).not.toBeNull();
    expect(details.textContent).toContain('8 Pipelines');
    // Only 5 rendered
    expect(container.textContent).toContain('Pipeline 5');
    expect(container.textContent).not.toContain('Pipeline 6');
    // "+ 3 other pipelines" rendered
    expect(container.textContent).toContain('+ 3 other pipelines');
    expect(container.textContent).toContain('View all');
  });
});
