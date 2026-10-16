import React from 'react';

/**
 * Accessible Modal Header with heading and close button.
 */
export const ModalHeader = ({
  id,
  className = '',
  title = 'Confirmation',
  color,
  onClose,
}) => {
  return (
    <div
      id={id ? `${id}-header` : undefined}
      className={`sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-white ${className}`}
    >
      <h3
        id="confirmation-modal-title"
        className="text-base font-semibold text-content-primary"
        style={color ? { color } : undefined}
      >
        {title}
      </h3>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="text-content-tertiary hover:text-content-primary p-1.5 rounded-md hover:bg-surface-100 transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default ModalHeader;
