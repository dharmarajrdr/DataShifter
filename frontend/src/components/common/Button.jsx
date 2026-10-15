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

export const Button = ({
  id,
  className = '',
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  style = {},
  onClick,
  disabled = false,
  ...props
}) => {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;

  return (
    <button
      id={id}
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-medium transition-all select-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{
        ...v,
        ...s,
        borderRadius: BORDER_RADIUS.md,
        fontWeight: FONT.weight.medium,
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.opacity = '0.9';
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.opacity = '1';
      }}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
