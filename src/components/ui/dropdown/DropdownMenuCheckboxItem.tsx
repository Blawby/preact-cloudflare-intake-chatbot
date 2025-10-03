import { ComponentChildren } from 'preact';
import { cn } from '../../../utils/cn';
import { Switch } from '../input/Switch';

export interface DropdownMenuCheckboxItemProps {
  children: ComponentChildren;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const DropdownMenuCheckboxItem = ({
  children,
  checked,
  onCheckedChange,
  disabled = false,
  className = ''
}: DropdownMenuCheckboxItemProps) => {
  return (
    <div className={cn(
      'flex items-center justify-between px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100',
      'hover:bg-gray-50 dark:hover:bg-gray-700',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )}>
      <span className="flex-1">{children}</span>
      <div className="ml-2">
        <Switch
          value={checked}
          onChange={onCheckedChange}
          disabled={disabled}
          size="sm"
        />
      </div>
    </div>
  );
};
