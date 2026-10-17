import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ErrorDetailDrawer from './ErrorDetailDrawer';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('ErrorDetailDrawer', () => {
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

  test('returns null when error is null', () => {
    act(() => {
      root.render(<ErrorDetailDrawer error={null} onClose={jest.fn()} />);
    });
    expect(container.textContent).toBe('');
  });

  test('renders slider drawer with diagnostics when error is provided', () => {
    act(() => {
      root.render(<ErrorDetailDrawer error={mockError} onClose={jest.fn()} />);
    });

    expect(container.textContent).toContain('Error Diagnostic Details');
    expect(container.textContent).toContain('ORA-00001');
    expect(container.textContent).toContain('products → PRODUCT_MASTER');
    expect(container.textContent).toContain('Technical Diagnostic / Stack Trace');
    expect(container.textContent).toContain('Source Row Data (Payload)');
  });

  test('calls onClose on clicking close button', () => {
    const handleClose = jest.fn();
    act(() => {
      root.render(<ErrorDetailDrawer error={mockError} onClose={handleClose} />);
    });

    const closeBtn = container.querySelector('button[title*="Close details"]');
    expect(closeBtn).toBeTruthy();

    act(() => {
      closeBtn.click();
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
