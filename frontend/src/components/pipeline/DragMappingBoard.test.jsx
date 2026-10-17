import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { DragMappingBoard } from './DragMappingBoard';

describe('DragMappingBoard two-finger scroll and interactions', () => {
  let container, root;
  const mockTables = [
    { tableName: 'orders', columns: [{ name: 'id', type: 'NUMBER', primaryKey: true }] },
  ];
  const mockTargetTables = [
    { tableName: 'ORDERS', columns: [{ name: 'ID', type: 'INT64', primaryKey: true }] },
  ];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => { root.unmount(); });
    container.remove();
  });

  test('renders mapping board canvas and tables', () => {
    act(() => {
      root.render(<DragMappingBoard sourceTables={mockTables} targetTables={mockTargetTables} mappings={[]} />);
    });
    const canvas = container.querySelector('#column-mapping-board-canvas');
    expect(canvas).not.toBeNull();
    expect(container.textContent).toContain('orders');
    expect(container.textContent).toContain('ORDERS');
  });

  test('wheel event scrolls pan and pinch zooms', () => {
    act(() => {
      root.render(<DragMappingBoard sourceTables={mockTables} targetTables={mockTargetTables} mappings={[]} />);
    });
    const canvas = container.querySelector('#column-mapping-board-canvas');
    expect(canvas).not.toBeNull();

    act(() => {
      const scrollEvent = new WheelEvent('wheel', { deltaX: 20, deltaY: 50, bubbles: true, cancelable: true });
      canvas.dispatchEvent(scrollEvent);
    });
    const g = canvas.querySelector('g');
    expect(g.getAttribute('transform')).toContain('translate(-20,-50)');

    act(() => {
      const pinchEvent = new WheelEvent('wheel', { deltaY: -50, ctrlKey: true, bubbles: true, cancelable: true });
      canvas.dispatchEvent(pinchEvent);
    });
    expect(canvas.querySelector('g').getAttribute('transform')).toContain('scale(1.5)');
  });
});
