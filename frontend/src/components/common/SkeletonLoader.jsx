import React from 'react';
import { BORDER_RADIUS, COLORS, SPACING } from '../../constants/design';

/**
 * SkeletonLoader component — mimicks content shapes while loading.
 *
 * @param {'text'|'circle'|'rect'|'card'|'table-row'} [variant='text'] - Type of skeleton placeholder
 * @param {string|number} [width] - Explicit width (e.g. '100%', 200, '60%')
 * @param {string|number} [height] - Explicit height
 * @param {string} [borderRadius] - Custom border radius
 * @param {number} [count=1] - Number of skeleton rows / items to render
 * @param {Object} [style] - Custom styles
 */
const SkeletonLoader = ({
  variant = 'text',
  width,
  height,
  borderRadius,
  count = 1,
  style = {},
}) => {
  const getDefaultStyles = () => {
    switch (variant) {
      case 'circle':
        return {
          width: width || 40,
          height: height || 40,
          borderRadius: '50%',
        };
      case 'rect':
        return {
          width: width || '100%',
          height: height || '120px',
          borderRadius: borderRadius || BORDER_RADIUS.md,
        };
      case 'card':
        return {
          width: width || '100%',
          height: height || '160px',
          borderRadius: borderRadius || BORDER_RADIUS.lg,
        };
      case 'table-row':
        return {
          width: width || '100%',
          height: height || '44px',
          borderRadius: borderRadius || BORDER_RADIUS.sm,
        };
      case 'text':
      default:
        return {
          width: width || '100%',
          height: height || '16px',
          borderRadius: borderRadius || BORDER_RADIUS.sm,
        };
    }
  };

  const baseStyle = {
    backgroundColor: COLORS.background.tertiary,
    position: 'relative',
    overflow: 'hidden',
    ...getDefaultStyles(),
    ...style,
  };

  const items = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      role="status"
      aria-label="Loading content"
      style={{
        ...baseStyle,
        marginBottom: count > 1 && i < count - 1 ? (style.marginBottom || SPACING.xs) : undefined,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent)',
          animation: 'ds-skeleton-shimmer 1.5s infinite',
        }}
      />
    </div>
  ));

  return (
    <>
      {count === 1 ? items[0] : <div style={{ width: '100%' }}>{items}</div>}
      <style>{`
        @keyframes ds-skeleton-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  );
};

export default SkeletonLoader;
