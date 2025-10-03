import { forwardRef, useCallback } from 'preact/compat';
import { LinkIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../../../utils/cn';

export interface URLInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'error' | 'success';
  label?: string;
  description?: string;
  error?: string;
  showValidation?: boolean;
  showPreview?: boolean;
  protocols?: string[];
  _labelKey?: string;
  _descriptionKey?: string;
  _placeholderKey?: string;
  _errorKey?: string;
  _namespace?: string;
}

export const URLInput = forwardRef<HTMLInputElement, URLInputProps>(({
  value = '',
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
  showValidation = false,
  showPreview = false,
  protocols = ['http:', 'https:'],
  _labelKey,
  _descriptionKey,
  _placeholderKey,
  _errorKey,
  _namespace = 'common'
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

  const iconPaddingClasses = {
    sm: 'pl-8',
    md: 'pl-10',
    lg: 'pl-12'
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
    iconPaddingClasses[size],
    variantClasses[variant],
    disabled && 'opacity-50 cursor-not-allowed',
    className
  );

  const isValidURL = useCallback((url: string) => {
    if (!url) return false;
    
    try {
      const urlObj = new URL(url);
      return protocols.includes(urlObj.protocol);
    } catch {
      return false;
    }
  }, [protocols]);

  const normalizeURL = useCallback((url: string) => {
    if (!url) return '';
    
    // Check if URL already has a valid protocol from the protocols array
    const hasValidProtocol = protocols.some(protocol => {
      const protocolWithSlashes = protocol.endsWith('://') ? protocol : 
                                  protocol.endsWith(':') ? `${protocol}//` : `${protocol}://`;
      return url.startsWith(protocolWithSlashes);
    });
    
    // If no valid protocol is present, add a default one
    if (!hasValidProtocol) {
      // Use the first protocol from the array, or default to https:// if array is empty
      const defaultProtocol = protocols.length > 0 
        ? (protocols[0].endsWith('://') ? protocols[0] : 
           protocols[0].endsWith(':') ? `${protocols[0]}//` : `${protocols[0]}://`)
        : 'https://';
      return `${defaultProtocol}${url}`;
    }
    
    return url;
  }, [protocols]);

  const handleChange = useCallback((e: Event) => {
    const target = e.target as HTMLInputElement;
    const inputValue = target.value;
    onChange?.(inputValue);
  }, [onChange]);

  const handleBlur = useCallback((e: Event) => {
    const target = e.target as HTMLInputElement;
    const inputValue = target.value;
    const normalizedValue = normalizeURL(inputValue);
    onChange?.(normalizedValue);
  }, [onChange, normalizeURL]);

  const isURLValid = value ? isValidURL(value) : false;
  const showValidationIcon = showValidation && value.length > 0;

  return (
    <div className="w-full">
      {displayLabel && (
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
          {displayLabel}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <LinkIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </div>
        
        <input
          ref={ref}
          type="url"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={displayPlaceholder}
          disabled={disabled}
          required={required}
          className={inputClasses}
        />
        
        {showValidationIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {isURLValid ? (
              <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <XMarkIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
            )}
          </div>
        )}
      </div>
      
      {showPreview && isURLValid && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Preview:</p>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent-600 dark:text-accent-400 hover:underline"
          >
            {value}
          </a>
        </div>
      )}
      
      {showValidation && value && !isURLValid && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          Please enter a valid URL
        </p>
      )}
      
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
