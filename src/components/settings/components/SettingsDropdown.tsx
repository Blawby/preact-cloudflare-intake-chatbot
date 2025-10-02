import { useState, useRef, useEffect } from 'preact/hooks';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { cn } from '../../../utils/cn';

export interface SettingsDropdownProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const SettingsDropdown = ({
  label,
  value,
  options,
  onChange,
  description,
  disabled = false,
  className = ''
}: SettingsDropdownProps) => {
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

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={cn('py-3', className)}>
      <div className="flex items-center justify-between">
        {label && (
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {label}
          </div>
        )}
        
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-2 px-3 py-1 text-sm text-gray-900 dark:text-gray-100 rounded-md',
              'hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span>{selectedOption?.label || value}</span>
            <ChevronDownIcon className={cn(
              'w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform',
              isOpen && 'rotate-180'
            )} />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
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
                      'hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between',
                      value === option.value && 'bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400'
                    )}
                  >
                    <span>{option.label}</span>
                    {value === option.value && (
                      <CheckIcon className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {description && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {description}
        </div>
      )}
    </div>
  );
};
