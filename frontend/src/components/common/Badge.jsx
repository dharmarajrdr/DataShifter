import React from 'react';

const VARIANTS = {
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  neutral: 'bg-surface-100 text-content-secondary border-surface-200',
};

const DOT_COLORS = {
  brand: 'bg-brand',
  success: 'bg-emerald-600',
  warning: 'bg-amber-600',
  danger: 'bg-rose-600',
  info: 'bg-sky-600',
  neutral: 'bg-surface-400',
};

/**
 * Accessible status and category Badge component.
 */
export const Badge = ({
  id,
  className = '',
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  ...props
}) => {
  const variantClass = VARIANTS[variant] || VARIANTS.neutral;
  const dotColor = DOT_COLORS[variant] || DOT_COLORS.neutral;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      id={id}
      className={`inline-flex items-center gap-1.5 font-semibold rounded-md border tracking-wide select-none ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} aria-hidden="true" />}
      {children}
    </span>
  );
};

export default Badge;
