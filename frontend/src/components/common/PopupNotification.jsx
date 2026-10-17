import React, { useEffect, useState } from 'react';
import { BORDER_RADIUS, SHADOWS, SPACING } from '../../constants/design';
import { NOTIFICATION_VARIANTS, POSITIONS } from './notification/notificationConstants';
import NotificationBody from './notification/NotificationBody';

/**
 * Accessible toast notification with smooth animation and semantic roles (<= 100 lines).
 */
export const PopupNotification = ({
  type = 'info',
  title,
  message,
  onDismiss,
  duration = 4000,
  position = 'bottom-right',
  showDismiss = true,
  isFixed = true,
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
  const positionStyle = isFixed ? (POSITIONS[position] || POSITIONS['bottom-right']) : {};

  return (
    <div
      id="notification-popup"
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className="ds-notification-toast ds-notification-popup"
      style={{
        position: isFixed ? 'fixed' : 'relative',
        ...positionStyle,
        zIndex: isFixed ? 'var(--notification-z-index, 9999)' : undefined,
        maxWidth: isFixed ? 'var(--notification-max-width, 420px)' : '100%',
        width: isFixed ? 'calc(100% - 40px)' : '100%',
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
      <NotificationBody
        styleConfig={styleConfig}
        title={title}
        message={message}
        showDismiss={showDismiss}
        onDismiss={() => {
          setVisible(false);
          if (onDismiss) onDismiss();
        }}
      />
      <style>{`
        @keyframes ds-slide-fade {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default PopupNotification;
