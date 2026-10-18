import React from 'react';

/**
 * Accessible form field wrapper providing label, required indicator,
 * helper text, and error announcements via ARIA.
 */
export const FormField = ({
  id,
  className = '',
  label,
  error,
  helperText,
  required = false,
  children,
}) => {
  const errorId = id ? `${id}-error` : undefined;
  const helperId = id ? `${id}-helper` : undefined;

  return (
    <div id={id ? `${id}-container` : undefined} className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold text-content-secondary uppercase tracking-wider flex items-center gap-1"
        >
          {label}
          {required && <span className="text-status-danger" aria-hidden="true">*</span>}
        </label>
      )}

      {children}

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-status-danger font-medium mt-0.5">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-content-tertiary mt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

export default FormField;
