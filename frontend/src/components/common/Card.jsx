import React from 'react';

/**
 * Accessible Card component providing structured surface containers.
 */
export const Card = ({
  id,
  className = '',
  title,
  subtitle,
  action,
  children,
  footer,
  padding = true,
  ...props
}) => {
  return (
    <div
      id={id}
      className={`bg-white border border-surface-200 rounded-xl shadow-card transition-shadow hover:shadow-elevated overflow-hidden ${className}`}
      {...props}
    >
      {(title || action) && (
        <div
          id={id ? `${id}-header` : undefined}
          className="flex items-center justify-between px-5 py-4 border-b border-surface-200"
        >
          <div>
            {title && (
              <h3 className="text-base font-semibold text-content-primary">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-content-secondary mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}

      <div
        id={id ? `${id}-body` : undefined}
        className={padding ? 'p-5' : ''}
      >
        {children}
      </div>

      {footer && (
        <div
          id={id ? `${id}-footer` : undefined}
          className="px-5 py-3.5 bg-surface-50 border-t border-surface-200 flex items-center justify-between text-xs text-content-secondary"
        >
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
