import React from 'react';
import { COLORS, FONT } from '../../constants/design';

/**
 * Reusable loading component with two display modes.
 *
 * @param {'line' | 'spinner'} [variant='spinner'] — display mode
 * @param {string} [message] — text below spinner (spinner mode only)
 * @param {string} [color] — accent color (defaults to brand primary)
 * @param {string} [height] — container height for spinner mode (default '60vh')
 * @param {string} [size] — spinner diameter: 'sm' (24px), 'md' (36px), 'lg' (48px)
 *
 * @example
 *   // Thin line loader at top of page/section
 *   <Loader variant="line" />
 *
 *   // Centered spinner (default)
 *   <Loader />
 *
 *   // Centered spinner with message
 *   <Loader message="Loading pipelines..." />
 *
 *   // Small inline spinner
 *   <Loader variant="spinner" size="sm" height="auto" />
 *
 *   // Inside ApiGuard
 *   <ApiGuard error={error} loading={loading} loadingComponent={<Loader message="Loading..." />}>
 */
const Loader = ({
  variant = 'spinner',
  message,
  color = COLORS.brand.primary,
  height = '60vh',
  size = 'md',
}) => {
  if (variant === 'line') return <LineLoader color={color} />;
  return <SpinnerLoader color={color} message={message} height={height} size={size} />;
};

/* ================================================================
   LINE LOADER — thin animated bar at top
   ================================================================ */
const LineLoader = ({ color }) => (
  <div style={{
    position: 'relative', width: '100%', height: '3px',
    background: `${color}15`, borderRadius: '2px', overflow: 'hidden',
  }}>
    <div style={{
      position: 'absolute', top: 0, left: 0,
      height: '100%', width: '40%', borderRadius: '2px',
      background: color,
      animation: 'ds-line-slide 1.2s ease-in-out infinite',
    }} />
    <style>{`
      @keyframes ds-line-slide {
        0% { left: -40%; }
        100% { left: 100%; }
      }
    `}</style>
  </div>
);

/* ================================================================
   SPINNER LOADER — centered animated circle with optional message
   ================================================================ */
const SIZES = { sm: 24, md: 36, lg: 48 };
const STROKE = { sm: 2.5, md: 3, lg: 3.5 };

const SpinnerLoader = ({ color, message, height, size }) => {
  const d = SIZES[size] || SIZES.md;
  const s = STROKE[size] || STROKE.md;
  const r = (d - s) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height, gap: '14px',
    }}>
      <svg width={d} height={d} viewBox={`0 0 ${d} ${d}`}
        style={{ animation: 'ds-spin 0.9s linear infinite' }}>
        {/* Track */}
        <circle cx={d / 2} cy={d / 2} r={r}
          fill="none" stroke={`${color}20`} strokeWidth={s} />
        {/* Moving arc */}
        <circle cx={d / 2} cy={d / 2} r={r}
          fill="none" stroke={color} strokeWidth={s}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.3} ${circumference * 0.7}`}
          transform={`rotate(-90 ${d / 2} ${d / 2})`} />
      </svg>
      {message && (
        <span style={{
          fontSize: size === 'sm' ? FONT.size.xs : FONT.size.sm,
          color: COLORS.text.secondary,
        }}>
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

export default Loader;