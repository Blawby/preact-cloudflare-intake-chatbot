import { ComponentChildren } from 'preact';

// Utility function for className merging (following codebase pattern)
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export type SettingsItemType = 'display' | 'navigation' | 'toggle' | 'input' | 'action' | 'external';

export interface SettingsItemProps {
  icon?: ComponentChildren;
  label: string;
  description?: string;
  type: SettingsItemType;
  value?: string | boolean | number;
  onChange?: (value: string | boolean | number) => void;
  onClick?: () => void;
  href?: string;
  placeholder?: string;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  isLoading?: boolean;
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
  href,
  placeholder,
  variant = 'default',
  disabled = false,
  isLoading = false,
  className = '',
  children
}: SettingsItemProps) => {
  const baseClasses = 'flex items-center gap-3 px-4 py-3 text-left transition-colors';
  const hoverClasses = 'hover:bg-gray-50 dark:hover:bg-dark-hover';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  const variantClasses = {
    default: {
      enabled: 'text-gray-700 dark:text-gray-300',
      disabled: 'text-gray-700 dark:text-gray-300'
    },
    danger: {
      enabled: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
      disabled: 'text-red-600 dark:text-red-400'
    }
  };

  const classes = cn(
    baseClasses,
    !disabled && hoverClasses,
    disabledClasses,
    variantClasses[variant][disabled ? 'disabled' : 'enabled'],
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
            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
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
                value={String(value || '')}
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
            {isLoading ? (
              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              </div>
            ) : icon && (
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

      case 'external':
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
            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
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

  if (type === 'external' && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
      >
        {renderContent()}
      </a>
    );
  }

  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={disabled || isLoading}
      type="button"
    >
      {renderContent()}
    </button>
  );
};
