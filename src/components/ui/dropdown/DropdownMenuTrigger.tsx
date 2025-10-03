import { ComponentChildren } from 'preact';
import { useContext } from 'preact/hooks';
import { cn } from '../../../utils/cn';
import { DropdownContext } from './DropdownMenu';

export interface DropdownMenuTriggerProps {
  children: ComponentChildren;
  asChild?: boolean;
  className?: string;
  onClick?: () => void;
}

export const DropdownMenuTrigger = ({
  children,
  asChild = false,
  className = '',
  onClick
}: DropdownMenuTriggerProps) => {
  const context = useContext(DropdownContext);
  
  if (!context) {
    throw new Error('DropdownMenuTrigger must be used within a DropdownMenu');
  }

  const { isOpen, handleOpenChange } = context;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      handleOpenChange(!isOpen);
    }
  };

  if (asChild) {
    // When asChild is true, we expect the child to be a single element
    // that we'll clone with additional props
    return children as any;
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-2 px-3 py-1 text-sm text-gray-900 dark:text-gray-100 rounded-md',
        'hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500',
        className
      )}
    >
      {children}
    </button>
  );
};
