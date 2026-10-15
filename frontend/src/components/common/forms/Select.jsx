import React from 'react';
import FormField from './FormField';

/**
 * Accessible Select component styled with Tailwind and WCAG AA focus rings.
 */
export const Select = ({
  id,
  className = '',
  label,
  error,
  helperText,
  required = false,
  value,
  onChange,
  disabled = false,
  placeholder,
  options = [],
  children,
  ...props
}) => {
  const selectElement = (
    <div className="relative flex items-center w-full">
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${id}-error` : helperText ? `${id}-helper` : undefined
        }
        className={`w-full rounded-md border text-sm text-content-primary bg-white transition-all
          focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent
          disabled:bg-surface-100 disabled:cursor-not-allowed disabled:text-content-muted
          ${error ? 'border-status-danger focus:ring-status-danger' : 'border-surface-300 hover:border-surface-400'}
          pl-3.5 pr-8 py-2 appearance-none cursor-pointer ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {children}
      </select>
      <div className="absolute right-3 pointer-events-none text-content-tertiary" aria-hidden="true">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );

  if (label || error || helperText) {
    return (
      <FormField id={id} label={label} error={error} helperText={helperText} required={required}>
        {selectElement}
      </FormField>
    );
  }

  return selectElement;
};

export default Select;
