import { ComponentChildren } from 'preact';
import { cn } from '../../../utils/cn';

export interface SwitchProps {
  label?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  labelKey?: string;
  descriptionKey?: string;
  namespace?: string;
}

export const Switch = ({
  label,
  value,
  onChange,
  description,
  disabled = false,
  className = '',
  size = 'md',
  labelKey,
  descriptionKey,
  namespace = 'common'
}: SwitchProps) => {
  // TODO: Add i18n support when useTranslation hook is available
  // const { t } = useTranslation(namespace);
  // const displayLabel = labelKey ? t(labelKey) : label;
  // const displayDescription = descriptionKey ? t(descriptionKey) : description;
  
  const displayLabel = label;
  const displayDescription = description;

  const sizeClasses = {
    sm: 'h-4 w-7',
    md: 'h-6 w-11',
    lg: 'h-8 w-14'
  };

  const thumbSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-6 w-6'
  };

  const thumbTranslateClasses = {
    sm: value ? 'translate-x-3' : 'translate-x-0.5',
    md: value ? 'translate-x-6' : 'translate-x-1',
    lg: value ? 'translate-x-7' : 'translate-x-1'
  };

  return (
    <div className={cn('flex items-center justify-between py-3', className)}>
      <div className="flex-1 min-w-0">
        {displayLabel && (
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {displayLabel}
          </div>
        )}
        {displayDescription && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {displayDescription}
          </div>
        )}
      </div>
      
      <button
        className={cn(
          'relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
          sizeClasses[size],
          value 
            ? 'bg-accent-600 focus:ring-accent-500' 
            : 'bg-gray-200 dark:bg-gray-700 focus:ring-gray-500',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        aria-pressed={Boolean(value)}
        aria-label={displayLabel ? `Toggle ${displayLabel}` : 'Toggle switch'}
      >
        <span
          className={cn(
            'inline-block transform rounded-full bg-white transition-transform',
            thumbSizeClasses[size],
            thumbTranslateClasses[size]
          )}
        />
      </button>
    </div>
  );
};
