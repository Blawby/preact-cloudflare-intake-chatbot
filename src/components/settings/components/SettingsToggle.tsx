import { ComponentChildren } from 'preact';
import { cn } from '../../../utils/cn';

export interface SettingsToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const SettingsToggle = ({
  label,
  value,
  onChange,
  description,
  disabled = false,
  className = ''
}: SettingsToggleProps) => {
  return (
    <div className={cn('flex items-center justify-between py-3', className)}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
        </div>
        {description && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </div>
        )}
      </div>
      
      <button
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
          value 
            ? 'bg-accent-600 focus:ring-accent-500' 
            : 'bg-gray-200 dark:bg-gray-700 focus:ring-gray-500',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        aria-pressed={Boolean(value)}
        aria-label={`Toggle ${label}`}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            value ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
};
