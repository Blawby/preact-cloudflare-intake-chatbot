import { forwardRef } from 'preact/compat';
import { cn } from '../../../utils/cn';

export interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'error' | 'success';
  label?: string;
  description?: string;
  error?: string;
  indeterminate?: boolean;
  labelKey?: string;
  descriptionKey?: string;
  errorKey?: string;
  namespace?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  checked = false,
  onChange,
  disabled = false,
  required = false,
  className = '',
  size = 'md',
  variant = 'default',
  label,
  description,
  error,
  indeterminate = false,
  labelKey,
  descriptionKey,
  errorKey,
  namespace = 'common'
}, ref) => {
  // TODO: Add i18n support when useTranslation hook is available
  // const { t } = useTranslation(namespace);
  // const displayLabel = labelKey ? t(labelKey) : label;
  // const displayDescription = descriptionKey ? t(descriptionKey) : description;
  // const displayError = errorKey ? t(errorKey) : error;
  
  const displayLabel = label;
  const displayDescription = description;
  const displayError = error;

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const variantClasses = {
    default: 'border-gray-300 dark:border-gray-600 focus:ring-accent-500 focus:border-accent-500',
    error: 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500',
    success: 'border-green-300 dark:border-green-600 focus:ring-green-500 focus:border-green-500'
  };

  const checkboxClasses = cn(
    'rounded border bg-white dark:bg-gray-800 text-accent-600',
    'focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors',
    sizeClasses[size],
    variantClasses[variant],
    disabled && 'opacity-50 cursor-not-allowed',
    className
  );

  return (
    <div className="flex items-start space-x-3">
      <div className="flex items-center h-5">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.((e.target as HTMLInputElement).checked)}
          disabled={disabled}
          required={required}
          className={checkboxClasses}
          aria-describedby={description ? `${label}-description` : undefined}
          aria-invalid={error ? 'true' : 'false'}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        {displayLabel && (
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {displayLabel}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        {displayDescription && !displayError && (
          <p id={`${label}-description`} className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {displayDescription}
          </p>
        )}
        
        {displayError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {displayError}
          </p>
        )}
      </div>
    </div>
  );
});
