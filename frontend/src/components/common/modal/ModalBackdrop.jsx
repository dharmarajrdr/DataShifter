import React, { useEffect, useRef } from 'react';

/**
 * Accessible Modal Backdrop handling focus-trap, ESC dismissal, and backdrop click.
 */
export const ModalBackdrop = ({
  id,
  className = '',
  isOpen,
  onClose,
  closeOnBackdrop = true,
  position = 'center',
  children,
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-[9000] bg-slate-900/50 backdrop-blur-sm flex justify-center p-4 transition-opacity
        ${position === 'top' ? 'items-start pt-20' : 'items-center'} ${className}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && closeOnBackdrop && onClose) {
          onClose();
        }
      }}
    >
      <div ref={modalRef} className="w-full flex justify-center">
        {children}
      </div>
    </div>
  );
};

export default ModalBackdrop;
