import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Accessible Modal Backdrop handling focus-trap, ESC dismissal, and backdrop click (<= 100 lines).
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

  const content = (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9000,
      }}
      className={`bg-slate-900/60 backdrop-blur-xs flex justify-center p-4 transition-opacity
        ${position === 'top' ? 'items-start pt-20' : 'items-center'} ${className}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && closeOnBackdrop && onClose) {
          onClose();
        }
      }}
    >
      <div ref={modalRef} className="w-full flex justify-center pointer-events-auto">
        {children}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

export default ModalBackdrop;
