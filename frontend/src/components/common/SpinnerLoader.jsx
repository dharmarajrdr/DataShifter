import React from 'react';
import { COLORS, FONT } from '../../constants/design';

const SIZES = {
  sm: { size: 20, stroke: 2.5 },
  md: { size: 36, stroke: 3 },
  lg: { size: 48, stroke: 3.5 },
  xl: { size: 64, stroke: 4 },
};

/**
 * SpinnerLoader component
 *
 * @param {string} [color=COLORS.brand.primary] - Spinner stroke color
 * @param {string} [message] - Optional message beneath spinner
 * @param {'sm'|'md'|'lg'|'xl'|number} [size='md'] - Spinner dimensions
 * @param {string} [height='100%'] - Container height
 * @param {boolean} [fullscreen=false] - Absolute / fixed full-screen overlay mode
 * @param {Object} [style] - Additional container inline styles
 */
const SpinnerLoader = ({
  color = COLORS.brand.primary,
  message,
  size = 'md',
  height = '100%',
  fullscreen = false,
  style = {},
}) => {
  const sizeConfig = typeof size === 'number'
    ? { size, stroke: Math.max(2, size / 10) }
    : SIZES[size] || SIZES.md;

  const d = sizeConfig.size;
  const s = sizeConfig.stroke;
  const r = (d - s) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div
      role="status"
      aria-label={message || 'Loading'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        ...(fullscreen
          ? {
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 'var(--loader-z-index, 8000)',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(1px)',
            }
          : {
              height,
              width: '100%',
              padding: '16px',
              boxSizing: 'border-box',
            }),
        ...style,
      }}
    >
      <svg
        width={d}
        height={d}
        viewBox={`0 0 ${d} ${d}`}
        style={{ animation: 'ds-spin 0.9s linear infinite' }}
      >
        {/* Background track */}
        <circle
          cx={d / 2}
          cy={d / 2}
          r={r}
          fill="none"
          stroke={`${color}20`}
          strokeWidth={s}
        />
        {/* Active arc */}
        <circle
          cx={d / 2}
          cy={d / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={s}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.3} ${circumference * 0.7}`}
          transform={`rotate(-90 ${d / 2} ${d / 2})`}
        />
      </svg>

      {message && (
        <span
          style={{
            fontSize: size === 'sm' ? FONT.size.xs : FONT.size.sm,
            color: COLORS.text.secondary,
            fontWeight: FONT.weight.medium,
            textAlign: 'center',
          }}
        >
          {message}
        </span>
      )}

      <style>{`
        @keyframes ds-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SpinnerLoader;
