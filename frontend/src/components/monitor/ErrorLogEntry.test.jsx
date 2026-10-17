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

  test('renders card with code badge and Details button', () => {
    act(() => {
      root.render(<ErrorLogEntry error={mockError} />);
    });

    expect(container.textContent).toContain('ORA-00001');
    expect(container.textContent).toContain('Details');
    expect(container.textContent).toContain('products → PRODUCT_MASTER');
  });

  test('triggers onOpenDetails on clicking Details button or card', () => {
    const handleOpen = jest.fn();
    act(() => {
      root.render(<ErrorLogEntry error={mockError} onOpenDetails={handleOpen} />);
    });

    const buttons = container.querySelectorAll('button');
    const detailsBtn = Array.from(buttons).find((b) => b.textContent.includes('Details'));
    expect(detailsBtn).toBeTruthy();

    act(() => {
      detailsBtn.click();
    });

    expect(handleOpen).toHaveBeenCalledWith(mockError);
  });
});
