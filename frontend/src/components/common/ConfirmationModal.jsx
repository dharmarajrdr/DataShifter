import React from 'react';
import ModalBackdrop from './modal/ModalBackdrop';
import ModalHeader from './modal/ModalHeader';
import ModalFooter from './modal/ModalFooter';

const MODAL_SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

/**
 * Accessible confirmation modal composed of focused sub-components (<= 100 lines).
 */
export const ConfirmationModal = ({
  id,
  className = '',
  isOpen = false,
  title = 'Confirmation',
  message,
  actions = [],
  onClose,
  size = 'md',
  color,
  position = 'center',
  closeOnBackdrop = true,
}) => {
  if (!isOpen) return null;

  const sizeClass = MODAL_SIZES[size] || 'max-w-md';

  return (
    <ModalBackdrop
      id={id}
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdrop={closeOnBackdrop}
      position={position}
    >
      <div
        id={id ? `${id}-card` : undefined}
        className={`w-full ${sizeClass} bg-white rounded-xl shadow-elevated border border-surface-200 overflow-hidden flex flex-col max-h-[90vh] ${className}`}
        style={color ? { borderTop: `4px solid ${color}` } : undefined}
      >
        <ModalHeader id={id} title={title} color={color} onClose={onClose} />

        <div
          id="confirmation-modal-desc"
          className="p-6 text-sm text-content-primary leading-relaxed overflow-y-auto"
        >
          {message}
        </div>

        <ModalFooter id={id} actions={actions} onClose={onClose} />
      </div>
    </ModalBackdrop>
  );
};

export default ConfirmationModal;
