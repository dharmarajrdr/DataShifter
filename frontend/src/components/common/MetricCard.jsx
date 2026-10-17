import React from 'react';
import { COLORS, FONT, BORDER_RADIUS, SPACING, SHADOWS } from '../../constants/design';
import { FCSS } from '../../constants/layouts';

const MetricCard = ({
  id,
  className = '',
  style = {},
  label,
  value,
  color,
  centered = false,
  icon,
}) => {
  const cardId = id || (label ? `metric-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : 'metric-card');

  return (
    <div
      id={cardId}
      className={`ds-metric-card bg-white border border-slate-200 rounded-xl shadow-xs transition-shadow hover:shadow-sm ${className}`}
      style={{
        ...FCSS,
        alignItems: centered ? 'center' : 'flex-start',
        background: COLORS.background.primary,
        border: `1px solid ${COLORS.border.light}`,
        borderRadius: BORDER_RADIUS.lg,
        boxShadow: SHADOWS.sm,
        padding: '16px 20px',
        flex: 1,
        minWidth: 0,
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <span
          id={`${cardId}-label`}
          style={{
            fontSize: FONT.size.xs,
            fontWeight: FONT.weight.semibold,
            color: COLORS.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>
        {icon && (
          <i
            id={`${cardId}-icon`}
            className={icon}
            style={{ color: color || COLORS.brand.primary, fontSize: 13 }}
          />
        )}
      </div>
      <span
        id={`${cardId}-value`}
        style={{
          fontSize: '22px',
          fontWeight: FONT.weight.bold,
          marginTop: SPACING.xxs,
          color: color || COLORS.text.primary,
          lineHeight: '1.2',
        }}
      >
        {value}
      </span>
    </div>
  );
};

export default MetricCard;

