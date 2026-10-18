import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderTableCell } from './markdownTableCell';
import { MarkdownTable } from './markdownTable';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('markdownTableCell', () => {
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

  test('renders bullet points separated by <br> as an unordered list', () => {
    const cell = '• Customer Data Migration – 6aedb0ef<br>• Payments Data Migration – df98dd29';
    act(() => {
      root.render(<div>{renderTableCell(cell, false)}</div>);
    });

    const ul = container.querySelector('ul.list-disc');
    expect(ul).not.toBeNull();
    const lis = container.querySelectorAll('li');
    expect(lis.length).toBe(2);
    expect(lis[0].textContent).toContain('Customer Data Migration – 6aedb0ef');
    expect(lis[1].textContent).toContain('Payments Data Migration – df98dd29');
  });

  test('renders general multi-line text separated by <br/> as distinct lines', () => {
    const cell = 'Header Note<br/>Secondary Note';
    act(() => {
      root.render(<div>{renderTableCell(cell, false)}</div>);
    });

    expect(container.textContent).toContain('Header Note');
    expect(container.textContent).toContain('Secondary Note');
    expect(container.querySelector('ul')).toBeNull();
  });

  test('renders in MarkdownTable correctly', () => {
    const headers = ['Type', 'Pipelines'];
    const rows = [[
      'Production',
      '• Customer Data Migration – 6aedb0ef-8d8d-4224-bcc4-5a71fb4b5ca0<br>• Payments Data Migration – df98dd29-cd81-4626-8441-0c070a7010d1',
    ]];

    act(() => {
      root.render(<MarkdownTable headers={headers} rows={rows} isUser={false} />);
    });

    const ul = container.querySelector('table tbody td ul.list-disc');
    expect(ul).not.toBeNull();
    expect(container.textContent).toContain('Payments Data Migration');
  });
});
