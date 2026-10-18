import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { DrawerReferencedPipelines } from './DrawerReferencedPipelines';
import { MarketplaceDrawer } from './MarketplaceDrawer';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('DrawerReferencedPipelines & MarketplaceDrawer Lock Guard', () => {
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
    const pipes = [{ id: 'p-1', name: 'Products Data Migration', slot: 'Source', status: 'ERRORED' }];
    act(() => { root.render(<DrawerReferencedPipelines pipelines={pipes} />); });
    const details = container.querySelector('#drawer-referenced-pipelines');
    expect(details).not.toBeNull();
    expect(details.hasAttribute('open')).toBe(true);
    expect(details.textContent).toContain('Referenced Pipelines');
    expect(details.textContent).toContain('1 Pipeline');
    expect(details.textContent).toContain('Products Data Migration');
  });

  test('caps rendering to 5 pipelines and renders "+ x other pipelines"', () => {
    const pipes = Array.from({ length: 8 }, (_, i) => ({ id: `p-${i}`, name: `Pipeline ${i + 1}`, slot: 'Source', status: 'RUNNING' }));
    act(() => { root.render(<DrawerReferencedPipelines pipelines={pipes} />); });
    expect(container.textContent).toContain('8 Pipelines');
    expect(container.textContent).toContain('Pipeline 5');
    expect(container.textContent).not.toContain('Pipeline 6');
    expect(container.textContent).toContain('+ 3 other pipelines');
  });

  test('disables Uninstall Adapter with lock icon when reference count > 0', () => {
    const adapter = {
      id: 'postgres', name: 'PostgreSQL CDC', installed: true,
      referencedPipelines: [{ id: 'p-1', name: 'Products Data Migration', slot: 'Source', status: 'ERRORED' }],
    };
    act(() => { root.render(<MarketplaceDrawer isOpen={true} adapter={adapter} onClose={() => {}} onToggleInstall={() => {}} />); });
    const btn = container.querySelector('#drawer-install-btn');
    expect(btn.hasAttribute('disabled')).toBe(true);
    expect(container.querySelector('#drawer-lock-icon')).not.toBeNull();
    expect(btn.textContent).toContain('Uninstall Adapter');
  });

  test('enables Uninstall Adapter without lock icon when reference count is 0', () => {
    const adapter = { id: 'postgres', name: 'PostgreSQL CDC', installed: true, referencedPipelines: [] };
    act(() => { root.render(<MarketplaceDrawer isOpen={true} adapter={adapter} onClose={() => {}} onToggleInstall={() => {}} />); });
    const btn = container.querySelector('#drawer-install-btn');
    expect(btn.hasAttribute('disabled')).toBe(false);
    expect(container.querySelector('#drawer-lock-icon')).toBeNull();
  });
});
