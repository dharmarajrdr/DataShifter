import React from 'react';
import { COLORS, FONT, BORDER_RADIUS, SPACING } from '../../constants/design';

const VARIANTS = {
  primary: {
    background: COLORS.brand.primary,
    color: COLORS.text.inverse,
    border: 'none',
  },
  secondary: {
    background: 'transparent',
    color: COLORS.text.secondary,
    border: `1px solid ${COLORS.border.medium}`,
  },
  danger: {
    background: 'transparent',
    color: COLORS.status.errorDark,
    border: `1px solid ${COLORS.status.errorDark}`,
  },
  warning: {
    background: 'transparent',
    color: COLORS.status.warning,
    border: `1px solid ${COLORS.status.warning}`,
  },
  ghost: {
    background: 'transparent',
    color: COLORS.brand.primary,
    border: 'none',
  },
};

const SIZES = {
  sm: { padding: `${SPACING.xxs} ${SPACING.sm}`, fontSize: FONT.size.xs },
  md: { padding: `${SPACING.xs} ${SPACING.md}`, fontSize: FONT.size.sm },
  lg: { padding: `${SPACING.xs} ${SPACING.lg}`, fontSize: FONT.size.md },
};

const Button = ({ children, variant = 'primary', size = 'md', style = {}, onClick, ...props }) => {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  return (
    <button
      onClick={onClick}
      style={{
        ...v,
        ...s,
        borderRadius: BORDER_RADIUS.md,
        fontWeight: FONT.weight.medium,
        cursor: 'pointer',
        transition: 'opacity 0.15s ease',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={e => e.target.style.opacity = '0.85'}
      onMouseLeave={e => e.target.style.opacity = '1'}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
