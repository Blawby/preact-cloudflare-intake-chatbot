import { ComponentChildren, cloneElement, isValidElement, RefObject } from 'preact';
import { useContext, useRef } from 'preact/hooks';
import { cn } from '../../../utils/cn';
import { DropdownContext } from './DropdownMenu';

export interface DropdownMenuTriggerProps {
  children: ComponentChildren;
  asChild?: boolean;
  className?: string;
  onClick?: () => void;
  onKeyDown?: (event: KeyboardEvent) => void;
}

export const DropdownMenuTrigger = ({
  children,
  asChild = false,
  className = '',
  onClick,
  onKeyDown
}: DropdownMenuTriggerProps) => {
  const context = useContext(DropdownContext);
  const triggerRef = useRef<HTMLElement | null>(null);
  
  if (!context) {
    throw new Error('DropdownMenuTrigger must be used within a DropdownMenu');
  }

  const { isOpen, handleOpenChange, dropdownId } = context;

  // Helper function to safely assign refs
  const assignRef = (node: HTMLElement | null, targetRef: RefObject<HTMLElement | null>, forwardedRef?: any) => {
    // Update the target ref
    if (targetRef) {
      (targetRef as any).current = node;
    }
    
    // Handle forwarded ref (function or object)
    if (forwardedRef) {
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef && typeof forwardedRef === 'object') {
        forwardedRef.current = node;
      }
    }
  };

  const handleClick = () => {
    // Always call the custom onClick if provided (safely)
    if (onClick) {
      try {
        onClick();
      } catch (error) {
        console.error('Error in dropdown trigger onClick callback:', error);
      }
    }
    
    // Always toggle the dropdown state
    handleOpenChange(!isOpen);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    // Handle keyboard navigation
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        handleOpenChange(true);
      }
    }
    
    // Call custom onKeyDown if provided
    if (onKeyDown) {
      try {
        onKeyDown(event);
      } catch (error) {
        console.error('Error in dropdown trigger onKeyDown callback:', error);
      }
    }
  };

  if (asChild) {
    // When asChild is true, we expect the child to be a single element
    // that we'll clone with additional props
    if (!isValidElement(children)) {
      throw new Error('DropdownMenuTrigger with asChild requires a single React element as children');
    }

    // Create merged ref function
    const mergedRef = (element: HTMLElement | null) => {
      assignRef(element, triggerRef, (children as any).ref);
    };

    // Prepare trigger props to merge
    const triggerProps = {
      onClick: (event: Event) => {
        // Call the child's onClick if it exists
        if ((children as any).props?.onClick) {
          (children as any).props.onClick(event);
        }
        handleClick();
      },
      onKeyDown: (event: KeyboardEvent) => {
        // Call the child's onKeyDown if it exists
        if ((children as any).props?.onKeyDown) {
          (children as any).props.onKeyDown(event);
        }
        handleKeyDown(event);
      },
      ref: mergedRef,
      'aria-haspopup': 'menu' as const,
      'aria-expanded': isOpen,
      'aria-controls': `${dropdownId}-menu`,
      id: `${dropdownId}-trigger`,
      className: cn(
        (children as any).props?.className || '',
        className
      ),
      tabIndex: 0, // Ensure keyboard accessibility
    };

    // Clone the child element with merged props
    return cloneElement(children as any, triggerProps);
  }

  return (
    <button
      type="button"
      ref={(node) => assignRef(node, triggerRef)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex items-center gap-2 px-3 py-1 text-sm text-gray-900 dark:text-gray-100 rounded-md',
        'hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500',
        className
      )}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-controls={`${dropdownId}-menu`}
      id={`${dropdownId}-trigger`}
    >
      {children}
    </button>
  );
};
