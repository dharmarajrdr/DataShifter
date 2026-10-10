import React from 'react';
import { COLORS } from '../../constants/design';

/**
 * BarLoader component — A horizontal bar loader that fills up / loops over time.
 *
 * @param {string} [color=COLORS.brand.primary] - Progress bar color
 * @param {string|number} [height='var(--loader-top-bar-height, 3px)'] - Bar thickness
 * @param {number} [progress] - Optional 0-100 percentage. If not provided, runs an indeterminate continuous animation.
 * @param {boolean} [topFixed=false] - If true, positions bar fixed at the top of the viewport
 * @param {Object} [style] - Custom styles
 */
const BarLoader = ({
  color = COLORS.brand.primary,
  height = 'var(--loader-top-bar-height, 3px)',
  progress,
  topFixed = false,
  style = {},
}) => {
  const isIndeterminate = progress === undefined || progress === null;

  return (
    <div
      role="progressbar"
      aria-label="Loading progress"
      aria-valuenow={isIndeterminate ? undefined : progress}
      aria-valuemin={isIndeterminate ? undefined : 0}
      aria-valuemax={isIndeterminate ? undefined : 100}
      style={{
        position: topFixed ? 'fixed' : 'relative',
        top: topFixed ? 0 : undefined,
        left: topFixed ? 0 : undefined,
        right: topFixed ? 0 : undefined,
        zIndex: topFixed ? 'var(--loader-z-index, 8000)' : undefined,
        width: '100%',
        height,
        background: `${color}18`,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          background: color,
          borderRadius: '2px',
          transition: isIndeterminate ? 'none' : 'width 0.25s ease',
          ...(isIndeterminate
            ? {
                width: '35%',
                animation: 'ds-bar-slide 1.3s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite',
              }
            : {
                width: `${Math.min(100, Math.max(0, progress))}%`,
              }),
        }}
      />
      <style>{`
        @keyframes ds-bar-slide {
          0% {
            left: -40%;
            width: 40%;
          }
          50% {
            left: 20%;
            width: 60%;
          }
          100% {
            left: 100%;
            width: 40%;
          }
        }
      `}</style>
    </div>
  );
};

export default BarLoader;
