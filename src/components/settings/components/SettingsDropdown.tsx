import { useState, useRef, useEffect, useMemo, useCallback } from 'preact/hooks';
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
  direction?: 'up' | 'down';
  mobile?: boolean;
}

export const SettingsDropdown = ({
  label,
  value,
  options,
  onChange,
  description,
  disabled = false,
  className = '',
  direction = 'down',
  mobile = false
}: SettingsDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Generate stable unique IDs for accessibility
  const dropdownId = useMemo(() => `settings-dropdown-${Math.random().toString(36).substr(2, 9)}`, []);
  const listboxId = `${dropdownId}-listbox`;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => (prev + 1) % options.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => prev <= 0 ? options.length - 1 : prev - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
          setFocusedIndex(-1);
          buttonRef.current?.focus();
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  }, [isOpen, focusedIndex, options, onChange]);

  // Handle keyboard events
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, focusedIndex, options, handleKeyDown]);

  const selectedOption = options.find(opt => opt.value === value);
  const _focusedOptionId = focusedIndex >= 0 ? `${dropdownId}-option-${options[focusedIndex]?.value}` : undefined;

  // Mobile layout - full width with arrow
  if (mobile) {
    return (
      <div className={cn('px-4 py-3 relative', className)} ref={dropdownRef}>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-disabled={disabled}
          className={cn(
            'w-full flex items-center justify-between px-0 py-0 text-sm text-gray-900 dark:text-gray-100',
            'hover:bg-transparent focus:outline-none',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{selectedOption?.label || value}</span>
          </div>
          <ChevronDownIcon className={cn(
            'w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform',
            isOpen && 'rotate-180'
          )} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div 
            id={listboxId}
            role="listbox"
            className={cn(
              "absolute left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50",
              direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
            )}
          >
            <div className="py-1">
              {options.map((option, index) => (
                <button
                  key={option.value}
                  id={`${dropdownId}-option-${option.value}`}
                  role="option"
                  aria-selected={value === option.value}
                  tabIndex={-1}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setFocusedIndex(-1);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100',
                    'hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between',
                    'focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700',
                    value === option.value && 'bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400',
                    focusedIndex === index && 'bg-gray-100 dark:bg-gray-700'
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
    );
  }

  // Desktop layout - original
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
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-disabled={disabled}
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
            <div 
              id={listboxId}
              role="listbox"
              className={cn(
                "absolute right-0 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50",
                direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
              )}
            >
              <div className="py-1">
                {options.map((option, index) => (
                  <button
                    key={option.value}
                    id={`${dropdownId}-option-${option.value}`}
                    role="option"
                    aria-selected={value === option.value}
                    tabIndex={-1}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setFocusedIndex(-1);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100',
                      'hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between',
                      'focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700',
                      value === option.value && 'bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400',
                      focusedIndex === index && 'bg-gray-100 dark:bg-gray-700'
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
