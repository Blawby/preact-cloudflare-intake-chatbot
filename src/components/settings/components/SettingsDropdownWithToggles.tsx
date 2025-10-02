import { useState, useRef, useEffect, useMemo, useCallback } from 'preact/hooks';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
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
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Generate stable unique IDs for accessibility
  const dropdownId = useMemo(() => `settings-dropdown-toggles-${Math.random().toString(36).substr(2, 9)}`, []);
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
    const totalItems = toggles.length > 0 ? toggles.length : options.length;
    
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setIsOpen(true);
        setFocusedIndex(totalItems - 1);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => prev <= 0 ? totalItems - 1 : prev - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < totalItems) {
          if (toggles.length > 0) {
            // Toggle the focused toggle
            const toggle = toggles[focusedIndex];
            toggle.onChange(!toggle.value);
          } else {
            // Select the focused option
            const option = options[focusedIndex];
            onChange(option.value);
            setIsOpen(false);
            setFocusedIndex(-1);
            buttonRef.current?.focus();
          }
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
  }, [isOpen, focusedIndex, toggles, options, onChange]);

  // Handle keyboard events
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, focusedIndex, toggles, options, handleKeyDown]);

  // Get display value based on active toggles
  const getDisplayValue = () => {
    if (toggles.length === 0) {
      return options.find(opt => opt.value === value)?.label || value;
    }
    
    const activeToggles = toggles.filter(toggle => toggle.value);
    if (activeToggles.length === 0) return 'None';
    return activeToggles.map(t => t.label).join(', ');
  };

  const _focusedOptionId = focusedIndex >= 0 ? 
    (toggles.length > 0 ? `${dropdownId}-toggle-${toggles[focusedIndex]?.id}` : `${dropdownId}-option-${options[focusedIndex]?.value}`) 
    : undefined;

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
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-disabled={disabled}
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
          <div 
            id={listboxId}
            role="listbox"
            aria-activedescendant={_focusedOptionId}
            className={cn(
              "absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50",
              toggles.length > 0 ? "w-48" : "w-64"
            )}
          >
            {toggles.length > 0 ? (
              <div className="p-2 space-y-2">
                {toggles.map((toggle, index) => (
                  <div 
                    key={toggle.id} 
                    id={`${dropdownId}-toggle-${toggle.id}`}
                    role="option"
                    aria-selected={toggle.value}
                    className={cn(
                      'flex items-center justify-between p-1.5 rounded-md',
                      focusedIndex === index && 'bg-gray-100 dark:bg-gray-700'
                    )}
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {toggle.label}
                    </span>
                    <button
                      tabIndex={-1}
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
                      'hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700',
                      value === option.value && 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
                      focusedIndex === index && 'bg-gray-100 dark:bg-gray-700'
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
