import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import WizardStepEntities from './WizardStepEntities';
import { connectionApi } from '../../../services/api';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../../services/api', () => ({
  connectionApi: {
    listTables: jest.fn(),
  },
}));

describe('WizardStepEntities DB, CDC, and Non-DB Adaptation', () => {
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

  test('renders database table dropdowns when source and target are databases', async () => {
    connectionApi.listTables.mockResolvedValue({ data: ['HR.CUSTOMERS', 'SALES.ORDERS'] });
    const cfg = {
      sourceAdapter: 'oracle-jdbc',
      targetAdapter: 'postgres-writer',
      source: 'c-ora-1',
      target: 'c-pg-1',
      entityPairs: [{ sourceEntity: 'HR.CUSTOMERS', targetEntity: 'customers' }],
    };

    await act(async () => {
      root.render(<WizardStepEntities id="test-step4" config={cfg} setConfig={() => {}} />);
    });

    expect(container.querySelector('select#test-step4-source-0')).not.toBeNull();
    expect(container.querySelector('select#test-step4-target-0')).not.toBeNull();
  });

  test('renders CDC entity input with DDL slider and non-DB feature not available', () => {
    const cfg = {
      sourceAdapter: 'oracle-trail',
      targetAdapter: 's3-writer',
      entityPairs: [{ sourceEntity: 'HR.CUSTOMERS', targetEntity: 'customers_parquet/', sourceSchemaSql: '' }],
    };

    act(() => {
      root.render(<WizardStepEntities id="test-step4" config={cfg} setConfig={() => {}} />);
    });

    expect(container.querySelector('input#test-step4-source-0')).not.toBeNull();
    expect(container.textContent).toContain('Feature not available');

    const ddlBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('Set DDL +'));
    expect(ddlBtn).toBeDefined();

    const ddlPanel = container.querySelector('#ddl-drawer-panel');
    expect(ddlPanel.style.transform).toBe('translateX(100%)');

    act(() => {
      ddlBtn.click();
    });

    expect(ddlPanel.style.transform).toBe('translateX(0)');
  });

  test('detects duplicate mapping pair and displays warning', () => {
    const cfg = {
      sourceAdapter: 'oracle-trail',
      targetAdapter: 'postgres-writer',
      entityPairs: [
        { sourceEntity: 'HR.CUSTOMERS', targetEntity: 'customers' },
        { sourceEntity: 'HR.CUSTOMERS', targetEntity: 'customers' },
      ],
    };

    act(() => {
      root.render(<WizardStepEntities id="test-step4" config={cfg} setConfig={() => {}} />);
    });

    expect(container.querySelector('#test-step4-duplicate-warn')).not.toBeNull();
    expect(container.textContent).toContain('Duplicate mapping detected');
  });
});
