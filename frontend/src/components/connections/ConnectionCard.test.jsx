import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ConnectionCard from './ConnectionCard';
import { NotificationProvider } from '../../contexts/NotificationContext';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('ConnectionCard', () => {
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

  const mockConn = {
    id: 'conn-1',
    name: 'prod_aurora_postgres',
    dbType: 'POSTGRESQL',
    host: 'aurora-01.acme.internal',
    port: 5432,
    databaseName: 'orders_master',
    status: 'CONNECTED',
    tableCount: 42,
    pipelineCount: 6,
  };

  test('renders connection card with specs, p-5 padding, and status badge', () => {
    act(() => {
      root.render(
        <NotificationProvider>
          <ConnectionCard conn={mockConn} canEdit canDelete canTest canBrowse />
        </NotificationProvider>
      );
    });

    const card = container.querySelector('#conn-card-conn-1');
    expect(card).not.toBeNull();
    expect(card.className).toContain('p-5');
    expect(container.textContent).toContain('prod_aurora_postgres');
    expect(container.textContent).toContain('aurora-01.acme.internal:5432');
    expect(container.textContent).toContain('orders_master');
    expect(container.textContent).toContain('6 Pipelines');
    expect(container.textContent).toContain('Connected');
    expect(container.textContent).toContain('Inspect Schema (42 Tables)');
  });
});
