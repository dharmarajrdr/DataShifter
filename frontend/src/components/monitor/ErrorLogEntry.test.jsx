import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ErrorLogEntry from './ErrorLogEntry';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('ErrorLogEntry', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    container = null;
  });

  const mockError = {
    id: 'err-1',
    type: 'PK_DUPLICATE',
    sourceTable: 'products',
    targetTable: 'PRODUCT_MASTER',
    chunk: 0,
    row: 1,
    message:
      'Duplicate key: ORA-00001: unique constraint (DEV_USER.SYS_C008747) violated on table DEV_USER.PRODUCT_MASTER columns (ID) — Use UPSERT write mode to handle duplicates.',
    sourceData: '{"ID":1,"NAME":"Monitor"}',
    timestamp: '2026-10-18T00:07:08.000Z',
  };

  test('renders collapsed state by default with Details button', () => {
    act(() => {
      root.render(<ErrorLogEntry error={mockError} />);
    });

    expect(container.textContent).toContain('ORA-00001');
    expect(container.textContent).toContain('Details');
    expect(container.textContent).not.toContain('Technical Diagnostic / Stack Trace');
  });

  test('toggles to expanded state on clicking Details button', () => {
    act(() => {
      root.render(<ErrorLogEntry error={mockError} />);
    });

    const buttons = container.querySelectorAll('button');
    const detailsBtn = Array.from(buttons).find((b) => b.textContent.includes('Details'));
    expect(detailsBtn).toBeTruthy();

    act(() => {
      detailsBtn.click();
    });

    expect(container.textContent).toContain('Collapse');
    expect(container.textContent).toContain('Technical Diagnostic / Stack Trace');
    expect(container.textContent).toContain('Source Row Data (Payload)');
    expect(container.textContent).toContain('Use UPSERT write mode');
  });
});
