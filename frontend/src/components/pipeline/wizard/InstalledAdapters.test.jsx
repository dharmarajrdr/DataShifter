import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { WizardStepSource, WizardStepTarget, useInstalledAdapters } from './index';
import { adapterApi } from '../../../services/adapterApi';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../../../services/adapterApi', () => ({
  adapterApi: {
    getAll: jest.fn(),
  },
}));

describe('Wizard Installed Adapters & Labels', () => {
  let container, root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => { root.unmount(); });
    container.remove();
  });

  test('WizardStepSource displays "Installed Adapters" label and filters non-installed adapters', () => {
    const installed = [
      { id: 'postgres-reader', name: 'PostgreSQL Database Reader', sub: 'Relational Source', dbType: 'POSTGRESQL', badge: 'JDBC' },
      { id: 'postgres-wal-reader', name: 'PostgreSQL WAL CDC Reader', sub: 'CDC Slot', dbType: 'POSTGRESQL', badge: 'CDC' },
    ];
    const cfg = { sourceAdapter: 'postgres-reader' };
    act(() => {
      root.render(<WizardStepSource id="src-step" config={cfg} setConfig={() => {}} connections={[]} adapters={installed} />);
    });

    const label = container.querySelector('#src-step-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toBe('Installed Adapters');
    expect(container.textContent).toContain('PostgreSQL Database Reader');
    expect(container.textContent).not.toContain('Oracle JDBC Reader');
    expect(container.textContent).not.toContain('FileSystem Ingestion');
  });

  test('WizardStepTarget displays "Installed Adapters" label and filters non-installed adapters', () => {
    const installed = [
      { id: 'oracle-writer', name: 'Oracle Database Writer', sub: 'Relational Sink', dbType: 'ORACLE', badge: 'JDBC' },
    ];
    const cfg = { targetAdapter: 'oracle-writer' };
    act(() => {
      root.render(<WizardStepTarget id="tgt-step" config={cfg} setConfig={() => {}} connections={[]} adapters={installed} />);
    });

    const label = container.querySelector('#tgt-step-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toBe('Installed Adapters');
    expect(container.textContent).toContain('Oracle Database Writer');
    expect(container.textContent).not.toContain('Amazon S3 / Lakehouse');
    expect(container.textContent).not.toContain('Apache Kafka Broker');
    expect(container.textContent).not.toContain('Snowflake DW');
  });

  test('useInstalledAdapters hook populates installed adapters from adapterApi.getAll', async () => {
    adapterApi.getAll.mockResolvedValueOnce({
      data: [
        { id: 'adp-1', adapterKey: 'postgres-reader', name: 'PostgreSQL Database Reader', adapterType: 'READER', supportedMode: 'BATCH' },
        { id: 'adp-2', adapterKey: 'oracle-writer', name: 'Oracle Writer', adapterType: 'WRITER', supportedMode: 'BOTH' },
      ],
    });

    let hookResult;
    const TestComponent = () => {
      hookResult = useInstalledAdapters({ sourceAdapter: 'postgres-reader' }, () => {});
      return null;
    };

    await act(async () => {
      root.render(<TestComponent />);
    });

    expect(hookResult.sourceAdapters.some((a) => a.id === 'postgres-reader')).toBe(true);
    expect(hookResult.targetAdapters.some((a) => a.id === 'oracle-writer')).toBe(true);
  });
});

