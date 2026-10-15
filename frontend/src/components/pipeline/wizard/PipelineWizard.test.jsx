import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { WizardStepBasics, WizardStepEntities, WizardStepIndicator, WizardStepReview, WizardStepSource, WizardStepTarget } from './index';

describe('5-Step Pipeline Wizard Components', () => {
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

  test('WizardStepIndicator renders 5 steps', () => {
    const steps = ['Basics', 'Source', 'Target', 'Entities', 'Review'];
    act(() => {
      root.render(<WizardStepIndicator id="test-ind" steps={steps} currentStep={2} />);
    });
    expect(container.querySelectorAll('.wizard-step-node').length).toBe(5);
  });

  test('WizardStepBasics renders name and description fields without execution mode', () => {
    const cfg = { name: 'My Stream', description: 'Test desc', namespaceId: 'ns-1' };
    act(() => {
      root.render(<WizardStepBasics id="test-step1" config={cfg} setConfig={() => {}} namespaces={[{ id: 'ns-1', name: 'Default' }]} />);
    });
    expect(container.querySelector('#test-step1-name-input').value).toBe('My Stream');
    expect(container.querySelector('#test-step1-desc-textarea').value).toBe('Test desc');
    expect(container.querySelector('[data-testid="mode-card-batch"]')).toBeNull();
  });

  test('WizardStepSource switches adapter and displays dynamic fields', () => {
    const cfg = { sourceAdapter: 'oracle-trail', cdcDirectoryPath: '/u01/app' };
    act(() => {
      root.render(<WizardStepSource id="test-step2" config={cfg} setConfig={() => {}} />);
    });
    expect(container.querySelector('#test-step2-card-oracle-trail')).not.toBeNull();
    expect(container.querySelector('#test-step2-fields-gg-dir').value).toBe('/u01/app');
  });

  test('WizardStepTarget renders credentials fields for S3', () => {
    const cfg = { targetAdapter: 's3-writer', s3Bucket: 'lake/raw' };
    act(() => {
      root.render(<WizardStepTarget id="test-step3" config={cfg} setConfig={() => {}} />);
    });
    expect(container.querySelector('#test-step3-card-s3-writer')).not.toBeNull();
    expect(container.querySelector('#test-step3-fields-s3-bucket').value).toBe('lake/raw');
  });

  test('WizardStepEntities renders sequential rows', () => {
    const cfg = { entityPairs: [{ sourceEntity: 'HR.CUSTOMERS', targetEntity: 'cust_pq/' }] };
    act(() => {
      root.render(<WizardStepEntities id="test-step4" config={cfg} setConfig={() => {}} />);
    });
    expect(container.querySelector('#test-step4-row-0')).not.toBeNull();
  });

  test('WizardStepReview renders architectural overview', () => {
    const cfg = { name: 'Replication Stream', sourceAdapter: 'oracle-trail', targetAdapter: 's3-writer' };
    act(() => {
      root.render(<WizardStepReview id="test-step5" config={cfg} namespaces={[]} />);
    });
    expect(container.textContent).toContain('Pipeline Basics');
    expect(container.textContent).toContain('Source Adapter');
  });
});
