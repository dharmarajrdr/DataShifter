import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import BeetelDockedButton from './BeetelDockedButton';
import BeetelSplitPanel from './BeetelSplitPanel';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('./BeetelChatWorkspace', () => () => <div data-testid="chat-workspace">Workspace</div>);

describe('Beetel Docked Button and Drawer', () => {
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

  test('BeetelDockedButton renders docked at right 0 and fires onOpen', () => {
    const handleOpen = jest.fn();
    act(() => {
      root.render(<BeetelDockedButton onOpen={handleOpen} />);
    });
    const btn = container.querySelector('#beetel-docked-trigger-btn');
    expect(btn).not.toBeNull();
    expect(btn.style.right).toBe('0px');
    expect(btn.style.position).toBe('fixed');
    act(() => {
      btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: 200 }));
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientY: 200 }));
    });
    expect(handleOpen).toHaveBeenCalledTimes(1);
  });

  test('BeetelSplitPanel opens sliding drawer on button click', () => {
    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/pipelines']}>
          <BeetelSplitPanel />
        </MemoryRouter>
      );
    });

    const trigger = container.querySelector('#beetel-docked-trigger-btn');
    expect(trigger).not.toBeNull();

    const drawer = container.querySelector('#beetel-drawer-container');
    expect(drawer).not.toBeNull();
    expect(drawer.style.transform).toBe('translateX(100%)');

    act(() => {
      trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: 300 }));
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientY: 300 }));
    });

    expect(drawer.style.transform).toBe('translateX(0)');
  });
});
