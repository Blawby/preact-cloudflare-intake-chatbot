import { forwardRef, useState, useCallback } from 'preact/compat';
import { PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import { cn } from '../../../utils/cn';

export interface NumberInputProps {
  value?: number;
  onChange?: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'error' | 'success';
  label?: string;
  description?: string;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
  showControls?: boolean;
  precision?: number;
  labelKey?: string;
  descriptionKey?: string;
  placeholderKey?: string;
  errorKey?: string;
  namespace?: string;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(({
  value = 0,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  className = '',
  size = 'md',
  variant = 'default',
  label,
  description,
  error,
  min,
  max,
  step = 1,
  showControls = true,
  precision = 0,
  labelKey,
  descriptionKey,
  placeholderKey,
  errorKey,
  namespace = 'common'
}, ref) => {
  // TODO: Add i18n support when useTranslation hook is available
  // const { t } = useTranslation(namespace);
  // const displayLabel = labelKey ? t(labelKey) : label;
  // const displayDescription = descriptionKey ? t(descriptionKey) : description;
  // const displayPlaceholder = placeholderKey ? t(placeholderKey) : placeholder;
  // const displayError = errorKey ? t(errorKey) : error;
  
  const displayLabel = label;
  const displayDescription = description;
  const displayPlaceholder = placeholder;
  const displayError = error;

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const controlSizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const variantClasses = {
    default: 'border-gray-300 dark:border-gray-600 focus:ring-accent-500 focus:border-accent-500',
    error: 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500',
    success: 'border-green-300 dark:border-green-600 focus:ring-green-500 focus:border-green-500'
  };

  const inputClasses = cn(
    'w-full border rounded-lg bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white',
    'focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors',
    sizeClasses[size],
    showControls && 'pr-20',
    variantClasses[variant],
    disabled && 'opacity-50 cursor-not-allowed',
    className
  );

  const handleIncrement = useCallback(() => {
    if (disabled) return;
    const newValue = (value || 0) + step;
    const clampedValue = max !== undefined ? Math.min(newValue, max) : newValue;
    const roundedValue = Number(clampedValue.toFixed(precision));
    onChange?.(roundedValue);
  }, [value, step, max, precision, onChange, disabled]);

  const handleDecrement = useCallback(() => {
    if (disabled) return;
    const newValue = (value || 0) - step;
    const clampedValue = min !== undefined ? Math.max(newValue, min) : newValue;
    const roundedValue = Number(clampedValue.toFixed(precision));
    onChange?.(roundedValue);
  }, [value, step, min, precision, onChange, disabled]);

  const handleInputChange = useCallback((e: Event) => {
    const target = e.target as HTMLInputElement;
    const inputValue = target.value;
    
    if (inputValue === '') {
      onChange?.(0);
      return;
    }
    
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      const roundedValue = Number(numValue.toFixed(precision));
      onChange?.(roundedValue);
    }
  }, [onChange, precision]);

  const canIncrement = max === undefined || (value || 0) < max;
  const canDecrement = min === undefined || (value || 0) > min;

  return (
    <div className="w-full">
      {displayLabel && (
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
          {displayLabel}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={ref}
          type="number"
          value={value}
          onChange={handleInputChange}
          placeholder={displayPlaceholder}
          disabled={disabled}
          required={required}
          min={min}
          max={max}
          step={step}
          className={inputClasses}
        />
        
        {showControls && (
          <div className="absolute inset-y-0 right-0 flex flex-col">
            <button
              type="button"
              onClick={handleIncrement}
              disabled={disabled || !canIncrement}
              className={cn(
                'flex items-center justify-center border-l border-gray-300 dark:border-gray-600 rounded-r-lg',
                'hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                controlSizeClasses[size],
                size === 'sm' ? 'rounded-tr-lg' : 'rounded-tr-lg'
              )}
            >
              <PlusIcon className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleDecrement}
              disabled={disabled || !canDecrement}
              className={cn(
                'flex items-center justify-center border-l border-t border-gray-300 dark:border-gray-600',
                'hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                controlSizeClasses[size],
                size === 'sm' ? 'rounded-br-lg' : 'rounded-br-lg'
              )}
            >
              <MinusIcon className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      
      {displayDescription && !displayError && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {displayDescription}
        </p>
      )}
      
      {displayError && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          {displayError}
        </p>
      )}
    </div>
  );
});
