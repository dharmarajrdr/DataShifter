import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import WizardSourceFields from './WizardSourceFields';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Dynamic Adapter Schema Driven Fields', () => {
  let container, root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => { act(() => { root.unmount(); }); container.remove(); });

  test('renders all 6 PostgreSQL WAL CDC fields from adapter schema', () => {
    const setConfig = jest.fn();
    act(() => {
      root.render(
        <WizardSourceFields
          id="test-wal"
          adapter="postgres-wal-reader"
          adapterObj={{ id: 'postgres-wal-reader', supportedMode: 'CDC' }}
          config={{}}
          setConfig={setConfig}
        />
      );
    });

    expect(container.textContent).toContain('WAL Directory');
    expect(container.textContent).toContain('File Pattern');
    expect(container.textContent).toContain('Starting LSN');
    expect(container.textContent).toContain('Replication Slot');
    expect(container.textContent).toContain('Flush Interval (ms)');
    expect(container.textContent).toContain('Max Batch Size');

    const dirInput = container.querySelector('#test-wal-wal-dir');
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(dirInput, '/var/custom/wal');
      dirInput.dispatchEvent(new Event('input', { bubbles: true }));
      dirInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(setConfig).toHaveBeenCalledWith(expect.objectContaining({ cdcDirectoryPath: '/var/custom/wal' }));
  });

  test('renders Saved Connection selector for oracle-reader instead of raw values', () => {
    const conns = [{ id: 'ora-1', name: 'Prod Oracle', dbType: 'ORACLE' }];
    act(() => {
      root.render(
        <WizardSourceFields
          id="test-ora"
          adapter="oracle-reader"
          adapterObj={{ id: 'oracle-reader', dbType: 'ORACLE', supportedMode: 'BATCH' }}
          config={{}}
          setConfig={() => {}}
          connections={conns}
        />
      );
    });

    expect(container.textContent).toContain('Oracle Source Connection *');
    expect(container.textContent).toContain('Prod Oracle');
    expect(container.textContent).not.toContain('WAL Directory');
    expect(container.querySelector('#test-ora-conn-select')).not.toBeNull();
  });

  test('renders arbitrary custom fields for dynamically uploaded non-connection adapter JARs', () => {
    const customAdapter = {
      id: 'custom-kafka-ingest',
      configSchema: [
        { key: 'consumerGroup', label: 'Consumer Group ID', type: 'string', required: true, default: 'ds-cg' },
      ],
    };
    act(() => {
      root.render(
        <WizardSourceFields id="custom-src" adapter="custom-kafka-ingest" adapterObj={customAdapter} config={{}} setConfig={() => {}} />
      );
    });
    expect(container.textContent).toContain('Consumer Group ID *');
    expect(container.querySelector('#custom-src-consumerGroup')).not.toBeNull();
  });
});
