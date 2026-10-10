import React, { useEffect, useRef } from 'react';
import { COLORS, FONT, BORDER_RADIUS, SPACING, SHADOWS } from '../../constants/design';
import Button from './Button';

/**
 * Sizes mapping for modal width
 */
const MODAL_SIZES = {
  sm: '380px',
  md: '480px',
  lg: '600px',
  xl: '720px',
};

/**
 * ConfirmationModal
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {string} title - Optional modal heading/title
 * @param {React.ReactNode} message - The confirmation message (string or JSX)
 * @param {Array<{ label: string, onClick: Function, variant?: string, size?: string, disabled?: boolean, loading?: boolean }>} actions - List of action buttons
 * @param {Function} onClose - Called when modal is dismissed (via Escape key, backdrop click, or Cancel)
 * @param {'sm'|'md'|'lg'|'xl'|string} [size='md'] - Modal size
 * @param {string} [color] - Optional accent color for header/border indicator
 * @param {string} [position] - 'center' | 'top' (default 'center')
 * @param {boolean} [closeOnBackdrop=true] - Whether clicking backdrop closes the modal
 */
const ConfirmationModal = ({
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
  const modalRef = useRef(null);
  const firstButtonRef = useRef(null);

  // Keyboard accessibility: ESC to close, trap focus
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;
        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Focus first action or modal
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const focusable = modalRef.current.querySelectorAll('button:not([disabled])');
        if (focusable.length > 0) {
          focusable[focusable.length - 1].focus(); // Default focus on the last button (often cancel or safe action)
        }
      }
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidth = MODAL_SIZES[size] || size;
  const isTopPosition = position === 'top';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      aria-describedby="confirmation-modal-desc"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 'var(--modal-z-index, 9000)',
        backgroundColor: 'var(--modal-backdrop-bg, rgba(0, 0, 0, 0.45))',
        display: 'flex',
        alignItems: isTopPosition ? 'flex-start' : 'center',
        justifyContent: 'center',
        padding: SPACING.md,
        paddingTop: isTopPosition ? '80px' : SPACING.md,
        backdropFilter: 'blur(2px)',
        animation: 'ds-fade-in 0.15s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && closeOnBackdrop && onClose) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        style={{
          width: '100%',
          maxWidth,
          backgroundColor: COLORS.background.primary,
          borderRadius: BORDER_RADIUS.lg,
          boxShadow: SHADOWS.md,
          border: `1px solid ${COLORS.border.light}`,
          borderTop: color ? `4px solid ${color}` : `1px solid ${COLORS.border.light}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          animation: 'ds-scale-in 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${SPACING.md} ${SPACING.lg}`,
            borderBottom: `1px solid ${COLORS.border.light}`,
          }}
        >
          <h3
            id="confirmation-modal-title"
            style={{
              margin: 0,
              fontSize: FONT.size.lg,
              fontWeight: FONT.weight.semibold,
              color: color || COLORS.text.primary,
            }}
          >
            {title}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{
                background: 'transparent',
                border: 'none',
                color: COLORS.text.tertiary,
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px 8px',
                lineHeight: 1,
                borderRadius: BORDER_RADIUS.sm,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.text.primary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.text.tertiary)}
            >
              ×
            </button>
          )}
        </div>

        {/* Body */}
        <div
          id="confirmation-modal-desc"
          style={{
            padding: `${SPACING.lg} ${SPACING.lg}`,
            fontSize: FONT.size.md,
            color: COLORS.text.primary,
            lineHeight: 1.5,
            overflowY: 'auto',
          }}
        >
          {message}
        </div>

        {/* Actions Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: SPACING.xs,
            padding: `${SPACING.md} ${SPACING.lg}`,
            backgroundColor: COLORS.background.secondary,
            borderTop: `1px solid ${COLORS.border.light}`,
            flexWrap: 'wrap',
          }}
        >
          {actions.length > 0 ? (
            actions.map((act, i) => (
              <Button
                key={i}
                variant={act.variant || (i === actions.length - 1 ? 'primary' : 'secondary')}
                size={act.size || 'md'}
                onClick={act.onClick}
                disabled={act.disabled || act.loading}
                style={act.style}
              >
                {act.label}
              </Button>
            ))
          ) : (
            <Button variant="secondary" size="md" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes ds-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ds-scale-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ConfirmationModal;
