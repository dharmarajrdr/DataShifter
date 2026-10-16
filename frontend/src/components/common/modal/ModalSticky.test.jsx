import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ModalHeader, ModalFooter } from './index';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Modal Sticky Header and Footer', () => {
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

  test('ModalHeader has sticky top-0 classes', () => {
    const handleClose = jest.fn();
    act(() => {
      root.render(<ModalHeader id="test-modal" title="Edit Event Listener" onClose={handleClose} />);
    });
    const header = container.querySelector('#test-modal-header');
    expect(header).not.toBeNull();
    expect(header.className).toContain('modal-header');
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('top-0');
    expect(header.textContent).toContain('Edit Event Listener');

    const closeBtn = header.querySelector('button[aria-label="Close modal"]');
    expect(closeBtn).not.toBeNull();
    act(() => closeBtn.click());
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('ModalFooter has sticky bottom-0 classes', () => {
    const handleSave = jest.fn();
    act(() => {
      root.render(
        <ModalFooter
          id="test-modal"
          actions={[
            { label: 'Cancel', variant: 'secondary' },
            { label: 'Save Changes', variant: 'primary', onClick: handleSave },
          ]}
        />
      );
    });
    const footer = container.querySelector('#test-modal-footer');
    expect(footer).not.toBeNull();
    expect(footer.className).toContain('modal-footer');
    expect(footer.className).toContain('sticky');
    expect(footer.className).toContain('bottom-0');

    const saveBtn = Array.from(footer.querySelectorAll('button')).find(b => b.textContent === 'Save Changes');
    expect(saveBtn).not.toBeNull();
    act(() => saveBtn.click());
    expect(handleSave).toHaveBeenCalledTimes(1);
  });
});

