import { useState, useRef, useEffect } from 'preact/hooks';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { SettingsToggle } from './SettingsToggle';
import { cn } from '../../../utils/cn';

export interface ToggleOption {
  id: string;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export interface SettingsDropdownWithTogglesProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  description?: string;
  disabled?: boolean;
  className?: string;
  toggles?: ToggleOption[];
}

export const SettingsDropdownWithToggles = ({
  label,
  value,
  options,
  onChange,
  description,
  disabled = false,
  className = '',
  toggles = []
}: SettingsDropdownWithTogglesProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get display value based on active toggles
  const getDisplayValue = () => {
    if (toggles.length === 0) {
      return options.find(opt => opt.value === value)?.label || value;
    }
    
    const activeToggles = toggles.filter(toggle => toggle.value);
    if (activeToggles.length === 0) return 'None';
    return activeToggles.map(t => t.label).join(', ');
  };

  return (
    <div className={cn('flex items-center justify-between py-3 relative', className)}>
      <div className="flex-1 min-w-0">
        {label && (
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {label}
          </div>
        )}
        {description && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </div>
        )}
      </div>
      
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'flex items-center gap-2 px-3 py-1 text-sm text-gray-900 dark:text-gray-100 rounded-md',
            'hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span>{getDisplayValue()}</span>
          <ChevronDownIcon className={cn(
            'w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform',
            isOpen && 'rotate-180'
          )} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            {toggles.length > 0 ? (
              <div className="p-3 space-y-3">
                {toggles.map((toggle) => (
                  <div key={toggle.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {toggle.label}
                    </span>
                    <button
                      className={cn(
                        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                        toggle.value 
                          ? 'bg-accent-600 focus:ring-accent-500' 
                          : 'bg-gray-200 dark:bg-gray-700 focus:ring-gray-500'
                      )}
                      onClick={() => toggle.onChange(!toggle.value)}
                    >
                      <span
                        className={cn(
                          'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                          toggle.value ? 'translate-x-5' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-1">
                {options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100',
                      'hover:bg-gray-50 dark:hover:bg-gray-700',
                      value === option.value && 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
