import { ComponentChildren } from 'preact';
import type { JSX } from 'preact';
import { Button } from '../ui/Button';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

// Utility function for className merging (following codebase pattern)
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export type SettingsItemType = 'display' | 'navigation' | 'toggle' | 'input' | 'action';

export interface SettingsItemProps {
  icon?: ComponentChildren;
  label: string;
  description?: string;
  type: SettingsItemType;
  value?: any;
  onChange?: (value: any) => void;
  onClick?: () => void;
  placeholder?: string;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  className?: string;
  children?: ComponentChildren;
}

export const SettingsItem = ({
  icon,
  label,
  description,
  type,
  value,
  onChange,
  onClick,
  placeholder,
  variant = 'default',
  disabled = false,
  className = '',
  children
}: SettingsItemProps) => {
  const baseClasses = 'flex items-center gap-3 px-4 py-3 text-left transition-colors';
  const hoverClasses = 'hover:bg-gray-50 dark:hover:bg-dark-hover';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  const variantClasses = {
    default: 'text-gray-700 dark:text-gray-300',
    danger: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
  };

  const classes = cn(
    baseClasses,
    hoverClasses,
    disabledClasses,
    variantClasses[variant],
    className
  );

  const renderContent = () => {
    switch (type) {
      case 'display':
        return (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</div>
            {description && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</div>
            )}
            {value && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{value}</div>
            )}
          </div>
        );

      case 'navigation':
        return (
          <>
            {icon && (
              <div className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</div>
              {description && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</div>
              )}
            </div>
            <ChevronRightIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          </>
        );

      case 'toggle':
        return (
          <>
            {icon && (
              <div className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</div>
              {description && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</div>
              )}
            </div>
            <button
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                value 
                  ? 'bg-accent-500 focus:ring-accent-500' 
                  : 'bg-gray-200 dark:bg-gray-700 focus:ring-gray-200 dark:focus:ring-gray-700'
              )}
              onClick={(e) => {
                e.stopPropagation();
                onChange?.(!value);
              }}
              disabled={disabled}
              aria-pressed={value}
              aria-label={`Toggle ${label}`}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  value ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </>
        );

      case 'input':
        return (
          <>
            {icon && (
              <div className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</div>
              {description && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</div>
              )}
              <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange?.((e.target as HTMLInputElement).value)}
                placeholder={placeholder}
                disabled={disabled}
                className="mt-2 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              />
            </div>
          </>
        );

      case 'action':
        return (
          <>
            {icon && (
              <div className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{label}</div>
              {description && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</div>
              )}
            </div>
          </>
        );

      default:
        return children;
    }
  };

  if (type === 'input') {
    return (
      <div className={classes}>
        {renderContent()}
      </div>
    );
  }

  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {renderContent()}
    </button>
  );
};
