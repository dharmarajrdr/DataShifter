import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ConnectionFormModal from './ConnectionFormModal';
import * as NotificationContextModule from '../../contexts/NotificationContext';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('ConnectionFormModal S3 support', () => {
  let container = null;
  let root = null;
  const mockNotification = {
    error: jest.fn(),
    success: jest.fn(),
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    jest.spyOn(NotificationContextModule, 'useNotification').mockReturnValue(mockNotification);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    container = null;
    jest.restoreAllMocks();
  });

  test('switches to S3 and renders AWS Region and credential inputs', () => {
    act(() => {
      root.render(<ConnectionFormModal connection={null} onClose={jest.fn()} onSave={jest.fn()} />);
    });

    const select = container.querySelector('select');
    act(() => {
      select.value = 'S3';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('AWS Region');
    expect(container.textContent).toContain('AWS Access Key ID');
    expect(container.textContent).toContain('AWS Secret Access Key');
  });

  test('validates required AWS Access Key ID when saving S3 connection', async () => {
    const handleSave = jest.fn();
    act(() => {
      root.render(<ConnectionFormModal connection={null} onClose={jest.fn()} onSave={handleSave} />);
    });

    const select = container.querySelector('select');
    act(() => {
      select.value = 'S3';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const inputs = container.querySelectorAll('input');
    const setVal = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    act(() => {
      setVal.call(inputs[0], 'My S3 Connection');
      inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      setVal.call(inputs[1], 'us-east-1');
      inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    });

    const saveBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent.includes('Create connection'));
    await act(async () => {
      saveBtn.click();
    });

    expect(mockNotification.error).toHaveBeenCalledWith('AWS Access Key ID is required');
    expect(handleSave).not.toHaveBeenCalled();
  });
});
