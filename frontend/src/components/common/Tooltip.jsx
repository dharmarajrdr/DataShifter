import React, { useState } from 'react';

/**
 * Accessible Tooltip component providing context on hover and keyboard focus.
 */
export const Tooltip = ({
  id,
  className = '',
  text,
  children,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = id || `tooltip-${Math.random().toString(36).substr(2, 9)}`;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position] || 'bottom-full left-1/2 -translate-x-1/2 mb-2';

  if (!text) return children;

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      aria-describedby={isVisible ? tooltipId : undefined}
    >
      {children}
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute z-[9999] px-2.5 py-1 text-xs font-medium text-white bg-slate-900 rounded-md shadow-elevated whitespace-nowrap pointer-events-none transition-opacity duration-150 ${positionClasses}`}
        >
          {text}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
