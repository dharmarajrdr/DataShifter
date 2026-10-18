import React from 'react';
import FormField from './FormField';

/**
 * Accessible Input component styled with Tailwind and WCAG AA focus rings.
 */
export const Input = ({
  id,
  className = '',
  label,
  error,
  helperText,
  required = false,
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const inputElement = (
    <div className="relative flex items-center w-full">
      {leftIcon && (
        <span className="absolute left-3 text-content-tertiary flex items-center pointer-events-none" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${id}-error` : helperText ? `${id}-helper` : undefined
        }
        className={`w-full rounded-md border text-sm font-normal text-content-primary bg-white transition-all
          placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent
          disabled:bg-surface-100 disabled:cursor-not-allowed disabled:text-content-muted
          ${error ? 'border-status-danger focus:ring-status-danger' : 'border-surface-300 hover:border-surface-400'}
          ${leftIcon ? 'pl-9' : 'pl-3.5'} ${rightIcon ? 'pr-9' : 'pr-3.5'} py-2 ${className}`}
        {...props}
      />
      {rightIcon && (
        <span className="absolute right-3 text-content-tertiary flex items-center pointer-events-none" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </div>
  );

  if (label || error || helperText) {
    return (
      <FormField id={id} label={label} error={error} helperText={helperText} required={required}>
        {inputElement}
      </FormField>
    );
  }

  return inputElement;
};

export default Input;
