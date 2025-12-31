/**
 * Accessible Form Components
 * 
 * Form components with built-in accessibility features including:
 * - Proper label associations
 * - Error announcements
 * - Hint text support
 * - Keyboard navigation
 * - Screen reader friendly validation
 */

import React, { forwardRef, useId, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAnnounce } from '@/lib/accessibility';

// ============================================================================
// Types
// ============================================================================

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
  hideLabel?: boolean;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  hideLabel?: boolean;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  hideLabel?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  hideLabel?: boolean;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
}

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  hint?: string;
}

interface RadioGroupProps {
  label: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

// ============================================================================
// Form Field Wrapper
// ============================================================================

export function FormField({
  label,
  error,
  hint,
  required,
  children,
  className,
  labelClassName,
  hideLabel = false,
}: FormFieldProps) {
  const id = useId();
  const announce = useAnnounce();

  // Announce errors to screen readers
  useEffect(() => {
    if (error) {
      announce(`Error: ${error}`, 'assertive');
    }
  }, [error, announce]);

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={id}
        className={cn(
          'block text-sm font-medium text-gray-700',
          hideLabel && 'sr-only',
          labelClassName
        )}
      >
        {label}
        {required && (
          <span className="text-red-500 ml-0.5" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only">(required)</span>}
      </label>

      {hint && (
        <p id={`${id}-hint`} className="text-sm text-gray-500">
          {hint}
        </p>
      )}

      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement, {
            id,
            'aria-invalid': error ? true : undefined,
            'aria-describedby': [
              hint ? `${id}-hint` : null,
              error ? `${id}-error` : null,
            ]
              .filter(Boolean)
              .join(' ') || undefined,
          })
        : children}

      {error && (
        <p
          id={`${id}-error`}
          className="text-sm text-red-600 flex items-center gap-1"
          role="alert"
        >
          <svg
            className="h-4 w-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Accessible Input
// ============================================================================

export const AccessibleInput = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, hideLabel = false, className, required, ...props }, ref) => {
    const id = useId();
    const announce = useAnnounce();

    useEffect(() => {
      if (error) {
        announce(`Error for ${label}: ${error}`, 'assertive');
      }
    }, [error, label, announce]);

    const describedBy = [
      hint ? `${id}-hint` : null,
      error ? `${id}-error` : null,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={id}
          className={cn(
            'block text-sm font-medium text-gray-700',
            hideLabel && 'sr-only'
          )}
        >
          {label}
          {required && (
            <>
              <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </>
          )}
        </label>

        {hint && (
          <p id={`${id}-hint`} className="text-sm text-gray-500">
            {hint}
          </p>
        )}

        <input
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            'w-full px-3 py-2 border rounded-md shadow-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />

        {error && (
          <p
            id={`${id}-error`}
            className="text-sm text-red-600 flex items-center gap-1"
            role="alert"
            aria-live="polite"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = 'AccessibleInput';

// ============================================================================
// Accessible Textarea
// ============================================================================

export const AccessibleTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, hideLabel = false, className, required, ...props }, ref) => {
    const id = useId();
    const announce = useAnnounce();

    useEffect(() => {
      if (error) {
        announce(`Error for ${label}: ${error}`, 'assertive');
      }
    }, [error, label, announce]);

    const describedBy = [
      hint ? `${id}-hint` : null,
      error ? `${id}-error` : null,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={id}
          className={cn(
            'block text-sm font-medium text-gray-700',
            hideLabel && 'sr-only'
          )}
        >
          {label}
          {required && (
            <>
              <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </>
          )}
        </label>

        {hint && (
          <p id={`${id}-hint`} className="text-sm text-gray-500">
            {hint}
          </p>
        )}

        <textarea
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            'w-full px-3 py-2 border rounded-md shadow-sm transition-colors resize-y',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />

        {error && (
          <p
            id={`${id}-error`}
            className="text-sm text-red-600 flex items-center gap-1"
            role="alert"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleTextarea.displayName = 'AccessibleTextarea';

// ============================================================================
// Accessible Select
// ============================================================================

export const AccessibleSelect = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, hideLabel = false, options, placeholder, className, required, ...props }, ref) => {
    const id = useId();
    const announce = useAnnounce();

    useEffect(() => {
      if (error) {
        announce(`Error for ${label}: ${error}`, 'assertive');
      }
    }, [error, label, announce]);

    const describedBy = [
      hint ? `${id}-hint` : null,
      error ? `${id}-error` : null,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={id}
          className={cn(
            'block text-sm font-medium text-gray-700',
            hideLabel && 'sr-only'
          )}
        >
          {label}
          {required && (
            <>
              <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </>
          )}
        </label>

        {hint && (
          <p id={`${id}-hint`} className="text-sm text-gray-500">
            {hint}
          </p>
        )}

        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            'w-full px-3 py-2 border rounded-md shadow-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'bg-white appearance-none cursor-pointer',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>

        {error && (
          <p
            id={`${id}-error`}
            className="text-sm text-red-600 flex items-center gap-1"
            role="alert"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleSelect.displayName = 'AccessibleSelect';

// ============================================================================
// Accessible Checkbox
// ============================================================================

export const AccessibleCheckbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    const id = useId();

    const describedBy = [
      hint ? `${id}-hint` : null,
      error ? `${id}-error` : null,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="space-y-1">
        <div className="flex items-start gap-3">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined}
            className={cn(
              'h-4 w-4 mt-1 rounded border-gray-300 text-blue-600',
              'focus:ring-2 focus:ring-blue-500 focus:ring-offset-0',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-red-500',
              className
            )}
            {...props}
          />
          <div className="flex-1">
            <label htmlFor={id} className="text-sm font-medium text-gray-700 cursor-pointer">
              {label}
            </label>
            {hint && (
              <p id={`${id}-hint`} className="text-sm text-gray-500 mt-0.5">
                {hint}
              </p>
            )}
          </div>
        </div>

        {error && (
          <p
            id={`${id}-error`}
            className="text-sm text-red-600 flex items-center gap-1 ml-7"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleCheckbox.displayName = 'AccessibleCheckbox';

// ============================================================================
// Accessible Radio Group
// ============================================================================

export function AccessibleRadioGroup({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  options,
  orientation = 'vertical',
  className,
}: RadioGroupProps) {
  const groupId = useId();
  const announce = useAnnounce();

  useEffect(() => {
    if (error) {
      announce(`Error for ${label}: ${error}`, 'assertive');
    }
  }, [error, label, announce]);

  return (
    <fieldset className={cn('space-y-2', className)}>
      <legend className="text-sm font-medium text-gray-700">{label}</legend>

      {hint && (
        <p id={`${groupId}-hint`} className="text-sm text-gray-500">
          {hint}
        </p>
      )}

      <div
        role="radiogroup"
        aria-describedby={[
          hint ? `${groupId}-hint` : null,
          error ? `${groupId}-error` : null,
        ]
          .filter(Boolean)
          .join(' ') || undefined}
        className={cn(
          'space-y-2',
          orientation === 'horizontal' && 'flex flex-wrap gap-4 space-y-0'
        )}
      >
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`;
          return (
            <div key={option.value} className="flex items-center gap-2">
              <input
                id={optionId}
                name={name}
                type="radio"
                value={option.value}
                checked={value === option.value}
                disabled={option.disabled}
                onChange={(e) => onChange?.(e.target.value)}
                className={cn(
                  'h-4 w-4 border-gray-300 text-blue-600',
                  'focus:ring-2 focus:ring-blue-500 focus:ring-offset-0',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  error && 'border-red-500'
                )}
              />
              <label
                htmlFor={optionId}
                className={cn(
                  'text-sm text-gray-700 cursor-pointer',
                  option.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {option.label}
              </label>
            </div>
          );
        })}
      </div>

      {error && (
        <p
          id={`${groupId}-error`}
          className="text-sm text-red-600 flex items-center gap-1"
          role="alert"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </fieldset>
  );
}

// ============================================================================
// Form Status Announcer
// ============================================================================

interface FormStatusProps {
  status: 'idle' | 'submitting' | 'success' | 'error';
  successMessage?: string;
  errorMessage?: string;
}

export function FormStatus({ status, successMessage, errorMessage }: FormStatusProps) {
  const announce = useAnnounce();

  useEffect(() => {
    if (status === 'submitting') {
      announce('Form is submitting, please wait...', 'polite');
    } else if (status === 'success') {
      announce(successMessage || 'Form submitted successfully!', 'polite');
    } else if (status === 'error') {
      announce(errorMessage || 'Form submission failed. Please check for errors.', 'assertive');
    }
  }, [status, successMessage, errorMessage, announce]);

  if (status === 'idle' || status === 'submitting') {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'p-4 rounded-md',
        status === 'success' && 'bg-green-50 text-green-800',
        status === 'error' && 'bg-red-50 text-red-800'
      )}
    >
      {status === 'success' && (successMessage || 'Form submitted successfully!')}
      {status === 'error' && (errorMessage || 'Form submission failed. Please check for errors.')}
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export default {
  FormField,
  AccessibleInput,
  AccessibleTextarea,
  AccessibleSelect,
  AccessibleCheckbox,
  AccessibleRadioGroup,
  FormStatus,
};
