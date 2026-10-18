import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MarketplacePage } from '../../pages/marketplace/MarketplacePage';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Marketplace Catalog & Slide-Over Drawer', () => {
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

  test('MarketplacePage renders catalog header, controls, and card grid', () => {
    act(() => { root.render(<MarketplacePage id="test-marketplace" />); });
    expect(container.querySelector('#test-marketplace')).not.toBeNull();
    expect(container.querySelector('#marketplace-title').textContent).toContain('Adapter Marketplace');
    expect(container.querySelectorAll('.adapter-card').length).toBe(8);
  });

  test('Search input filters connectors in real-time', () => {
    act(() => { root.render(<MarketplacePage id="test-marketplace" />); });
    const searchInput = container.querySelector('#marketplace-search-input');
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(searchInput, 'Snowflake');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const cards = container.querySelectorAll('.adapter-card');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Snowflake Streaming');
  });

  test('Category filter tabs filter cards by category', () => {
    act(() => { root.render(<MarketplacePage id="test-marketplace" />); });
    const dbTab = container.querySelector('#category-tab-databases');
    expect(dbTab).not.toBeNull();
    act(() => { dbTab.click(); });
    const cards = container.querySelectorAll('.adapter-card');
    expect(cards.length).toBe(3);
    expect(container.textContent).toContain('PostgreSQL CDC');
  });

  test('One-click Install and Uninstall toggles connector state', () => {
    act(() => { root.render(<MarketplacePage id="test-marketplace" />); });
    const kafkaBtn = container.querySelector('#adapter-card-kafka-action-btn');
    expect(kafkaBtn.textContent).toContain('Install');
    act(() => { kafkaBtn.click(); });
    expect(container.querySelector('#adapter-card-kafka-action-btn').textContent).toContain('Uninstall');
  });

  test('Clicking card opens slide-over drawer and closing it hides it', () => {
    act(() => { root.render(<MarketplacePage id="test-marketplace" />); });
    expect(container.querySelector('#marketplace-drawer')).toBeNull();
    act(() => { container.querySelector('#adapter-card-postgres').click(); });

    const drawer = container.querySelector('#marketplace-drawer');
    expect(drawer).not.toBeNull();
    expect(drawer.textContent).toContain('PostgreSQL CDC');

    act(() => { container.querySelector('#drawer-close-btn').click(); });
    expect(container.querySelector('#marketplace-drawer')).toBeNull();
  });
});
