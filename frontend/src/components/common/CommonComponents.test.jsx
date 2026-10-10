import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ConfirmationModal from './ConfirmationModal';
import PopupNotification from './PopupNotification';
import SpinnerLoader from './SpinnerLoader';
import BarLoader from './BarLoader';
import SkeletonLoader from './SkeletonLoader';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Reusable UI Components', () => {
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

  describe('ConfirmationModal', () => {
    test('does not render when isOpen is false', () => {
      act(() => {
        root.render(<ConfirmationModal isOpen={false} message="Test" />);
      });
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    });

    test('renders with message, title, and buttons when isOpen is true', () => {
      const handleConfirm = jest.fn();
      const handleCancel = jest.fn();

      act(() => {
        root.render(
          <ConfirmationModal
            isOpen={true}
            title="Delete Item"
            message="Are you sure you want to delete this item?"
            actions={[
              { label: 'Cancel', variant: 'secondary', onClick: handleCancel },
              { label: 'Confirm', variant: 'danger', onClick: handleConfirm },
            ]}
          />
        );
      });

      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog).not.toBeNull();
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.textContent).toContain('Delete Item');
      expect(dialog.textContent).toContain('Are you sure you want to delete this item?');

      const buttons = dialog.querySelectorAll('button');
      const confirmBtn = Array.from(buttons).find(b => b.textContent === 'Confirm');
      expect(confirmBtn).not.toBeNull();

      act(() => {
        confirmBtn.click();
      });
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('PopupNotification', () => {
    test('renders success notification with accessible status role', () => {
      act(() => {
        root.render(
          <PopupNotification
            type="success"
            title="Saved"
            message="Data saved successfully"
            duration={0}
          />
        );
      });

      const notification = document.querySelector('[role="status"]');
      expect(notification).not.toBeNull();
      expect(notification.textContent).toContain('Saved');
      expect(notification.textContent).toContain('Data saved successfully');
    });

    test('renders error notification with alert role and live assertive', () => {
      act(() => {
        root.render(
          <PopupNotification
            type="error"
            title="Error"
            message="An error occurred"
            duration={0}
          />
        );
      });

      const alert = document.querySelector('[role="alert"]');
      expect(alert).not.toBeNull();
      expect(alert.getAttribute('aria-live')).toBe('assertive');
      expect(alert.textContent).toContain('An error occurred');
    });

    test('calls onDismiss when close button is clicked', () => {
      const handleDismiss = jest.fn();
      act(() => {
        root.render(
          <PopupNotification
            message="Dismissible message"
            onDismiss={handleDismiss}
            duration={0}
          />
        );
      });

      const dismissBtn = document.querySelector('button[aria-label="Dismiss notification"]');
      expect(dismissBtn).not.toBeNull();
      act(() => {
        dismissBtn.click();
      });
      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loaders', () => {
    test('renders SpinnerLoader with accessible status role', () => {
      act(() => {
        root.render(<SpinnerLoader message="Fetching data..." />);
      });

      const spinner = document.querySelector('[role="status"]');
      expect(spinner).not.toBeNull();
      expect(spinner.getAttribute('aria-label')).toBe('Fetching data...');
      expect(spinner.textContent).toContain('Fetching data...');
    });

    test('renders BarLoader with progressbar role', () => {
      act(() => {
        root.render(<BarLoader progress={75} />);
      });

      const bar = document.querySelector('[role="progressbar"]');
      expect(bar).not.toBeNull();
      expect(bar.getAttribute('aria-valuenow')).toBe('75');
    });

    test('renders SkeletonLoader with count and aria-label', () => {
      act(() => {
        root.render(<SkeletonLoader variant="card" count={3} />);
      });

      const skeletons = document.querySelectorAll('[role="status"][aria-label="Loading content"]');
      expect(skeletons.length).toBe(3);
    });
  });
});
