import React from 'react';
import SpinnerLoader from './SpinnerLoader';
import BarLoader from './BarLoader';
import { COLORS } from '../../constants/design';

/**
 * Reusable loading component with two display modes (<= 100 lines).
 *
 * @param {string} [id='ds-loader'] - DOM identifier
 * @param {string} [className='ds-loader'] - CSS classes
 * @param {'line' | 'spinner'} [variant='spinner'] — display mode
 * @param {string} [message] — text below spinner (spinner mode only)
 * @param {string} [color] — accent color (defaults to brand primary)
 * @param {string} [height] — container height for spinner mode (default '60vh')
 * @param {string} [size] — spinner diameter: 'sm' | 'md' | 'lg'
 */
const Loader = ({
  id = 'ds-loader',
  className = 'ds-loader',
  variant = 'spinner',
  message,
  color = COLORS.brand.primary,
  height = '60vh',
  size = 'md',
  ...rest
}) => {
  if (variant === 'line') {
    return (
      <BarLoader
        id={`${id}-line`}
        className={`${className}-line`}
        color={color}
        {...rest}
      />
    );
  }
  return (
    <div id={id} className={className} style={{ width: '100%', height }}>
      <SpinnerLoader
        id={`${id}-spinner`}
        className={`${className}-spinner`}
        color={color}
        message={message}
        height="100%"
        size={size}
        {...rest}
      />
    </div>
  );
};

export default Loader;