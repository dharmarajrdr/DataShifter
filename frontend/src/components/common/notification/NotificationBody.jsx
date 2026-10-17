import React from 'react';
import { BORDER_RADIUS, FONT, SPACING } from '../../../constants/design';

export const NotificationBody = ({
  styleConfig,
  title,
  message,
  showDismiss,
  onDismiss,
}) => (
  <>
    <div style={{ flexShrink: 0, marginTop: '2px', display: 'flex', background: 'transparent' }}>
      {styleConfig.icon}
    </div>

    <div style={{ flex: 1, minWidth: 0, background: 'transparent' }}>
      {title && (
        <div style={{ fontWeight: FONT.weight.semibold, fontSize: FONT.size.sm, marginBottom: '2px', background: 'transparent' }}>
          {title}
        </div>
      )}
      <div style={{ fontSize: FONT.size.sm, lineHeight: 1.4, wordBreak: 'break-word', background: 'transparent' }}>
        {message}
      </div>
    </div>

    {showDismiss && (
      <button
        onClick={onDismiss}
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
  </>
);

export default NotificationBody;
