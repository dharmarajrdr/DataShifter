import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import WorkflowCanvas from './WorkflowCanvas';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('WorkflowCanvas Dragging & MouseUp', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => { root.unmount(); });
    container.remove();
    container = null;
  });

  test('dropping node on window mouseup places node and stops cursor follow', () => {
    const handleMoveNode = jest.fn();
    const nodes = [
      { pipelineId: 'node-1', pipelineName: 'Source Pipeline', positionX: 100, positionY: 100 },
    ];

    act(() => {
      root.render(
        <WorkflowCanvas
          nodes={nodes}
          edges={[]}
          mode="builder"
          onMoveNode={handleMoveNode}
        />
      );
    });

    const card = container.querySelector('#workflow-node-card-node-1');
    expect(card).not.toBeNull();

    // Start dragging node
    act(() => {
      card.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 100, clientY: 100, button: 0 }));
    });

    // Move mouse across window
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 160 }));
    });
    expect(handleMoveNode).toHaveBeenCalled();
    const callsCount = handleMoveNode.mock.calls.length;

    // Release mouse button on window (outside or inside node)
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    // Move mouse again - should NOT move node anymore!
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 250, clientY: 260 }));
    });
    expect(handleMoveNode.mock.calls.length).toBe(callsCount);
  });

  test('releasing mouse during connection cancels connecting wire', () => {
    const nodes = [
      { pipelineId: 'node-1', pipelineName: 'Pipe 1', positionX: 100, positionY: 100 },
      { pipelineId: 'node-2', pipelineName: 'Pipe 2', positionX: 100, positionY: 300 },
    ];

    act(() => {
      root.render(<WorkflowCanvas nodes={nodes} edges={[]} mode="builder" />);
    });

    const outPort = container.querySelector('#workflow-node-out-port-node-1');
    expect(outPort).not.toBeNull();

    act(() => {
      outPort.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    });

    // Releasing on window resets connecting state
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    expect(container.querySelector('#workflow-canvas-svg-layer')).not.toBeNull();
    expect(container.querySelector('#wire-active-connecting')).toBeNull();
  });
});
