import React, { useEffect, useState } from 'react';
import { COLORS, FONT, BORDER_RADIUS, SPACING, SHADOWS } from '../../constants/design';

/**
 * Variant styles mapping
 */
const NOTIFICATION_VARIANTS = {
  success: {
    bg: COLORS.status.successLight,
    border: COLORS.status.success,
    color: COLORS.status.successText,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  error: {
    bg: COLORS.status.errorLight,
    border: COLORS.status.error,
    color: COLORS.status.errorText,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  info: {
    bg: COLORS.status.infoLight,
    border: COLORS.status.info,
    color: COLORS.status.infoText,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  warning: {
    bg: COLORS.status.warningLight,
    border: COLORS.status.warning,
    color: COLORS.status.warningText,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
};

/**
 * Position presets mapping
 */
const POSITIONS = {
  'top-right': {
    top: 'var(--notification-position-top, 20px)',
    right: 'var(--notification-position-right, 20px)',
  },
  'top-left': {
    top: 'var(--notification-position-top, 20px)',
    left: 'var(--notification-position-left, 20px)',
  },
  'top-center': {
    top: 'var(--notification-position-top, 20px)',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  'bottom-right': {
    bottom: 'var(--notification-position-bottom, 20px)',
    right: 'var(--notification-position-right, 20px)',
  },
  'bottom-left': {
    bottom: 'var(--notification-position-bottom, 20px)',
    left: 'var(--notification-position-left, 20px)',
  },
  'bottom-center': {
    bottom: 'var(--notification-position-bottom, 20px)',
    left: '50%',
    transform: 'translateX(-50%)',
  },
};

/**
 * PopupNotification component
 *
 * @param {'success'|'error'|'info'|'warning'} [type='info'] - Notification severity
 * @param {string} [title] - Optional title
 * @param {React.ReactNode} message - Notification message
 * @param {Function} [onDismiss] - Callback when dismissed
 * @param {number} [duration=4000] - Auto-dismiss timeout in ms. 0 to disable auto-dismiss.
 * @param {string} [position='top-right'] - Screen placement ('top-right'|'top-left'|'top-center'|'bottom-right'|'bottom-left'|'bottom-center')
 * @param {boolean} [showDismiss=true] - Whether to show close button
 */
const PopupNotification = ({
  type = 'info',
  title,
  message,
  onDismiss,
  duration = 4000,
  position = 'top-right',
  showDismiss = true,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onDismiss) onDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  if (!visible) return null;

  const styleConfig = NOTIFICATION_VARIANTS[type] || NOTIFICATION_VARIANTS.info;
  const positionStyle = POSITIONS[position] || POSITIONS['top-right'];

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      style={{
        position: 'fixed',
        ...positionStyle,
        zIndex: 'var(--notification-z-index, 9999)',
        maxWidth: 'var(--notification-max-width, 420px)',
        width: 'calc(100% - 40px)',
        boxSizing: 'border-box',
        backgroundColor: styleConfig.bg,
        border: `1px solid ${styleConfig.border}`,
        borderRadius: BORDER_RADIUS.md,
        boxShadow: SHADOWS.md,
        padding: `${SPACING.sm} ${SPACING.md}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: SPACING.sm,
        color: styleConfig.color,
        animation: 'ds-slide-fade 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ flexShrink: 0, marginTop: '2px', display: 'flex' }}>
        {styleConfig.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div
            style={{
              fontWeight: FONT.weight.semibold,
              fontSize: FONT.size.sm,
              marginBottom: '2px',
            }}
          >
            {title}
          </div>
        )}
        <div
          style={{
            fontSize: FONT.size.sm,
            lineHeight: 1.4,
            wordBreak: 'break-word',
          }}
        >
          {message}
        </div>
      </div>

      {showDismiss && (
        <button
          onClick={() => {
            setVisible(false);
            if (onDismiss) onDismiss();
          }}
          aria-label="Dismiss notification"
          style={{
            background: 'transparent',
            border: 'none',
            color: styleConfig.color,
            opacity: 0.7,
            cursor: 'pointer',
            padding: '2px 4px',
            fontSize: '16px',
            lineHeight: 1,
            borderRadius: BORDER_RADIUS.sm,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
        >
          ×
        </button>
      )}

      <style>{`
        @keyframes ds-slide-fade {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default PopupNotification;
