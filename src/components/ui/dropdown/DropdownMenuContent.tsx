import { ComponentChildren } from 'preact';
import { useContext } from 'preact/hooks';
import { cn } from '../../../utils/cn';
import { DropdownContext } from './DropdownMenu';

export interface DropdownMenuContentProps {
  children: ComponentChildren;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  className?: string;
  open?: boolean;
}

export const DropdownMenuContent = ({
  children,
  align = 'end',
  side = 'bottom',
  sideOffset = 4,
  className = '',
  open: controlledOpen
}: DropdownMenuContentProps) => {
  const context = useContext(DropdownContext);
  
  if (!context) {
    throw new Error('DropdownMenuContent must be used within a DropdownMenu');
  }

  const { isOpen } = context;
  const open = controlledOpen !== undefined ? controlledOpen : isOpen;
  const getPositionClasses = () => {
    const baseClasses = 'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg';
    
    const sideClasses = {
      top: 'bottom-full',
      right: 'left-full',
      bottom: 'top-full',
      left: 'right-full'
    };
    
    const alignClasses = {
      start: 'left-0',
      center: 'left-1/2 -translate-x-1/2',
      end: 'right-0'
    };
    
    return cn(baseClasses, sideClasses[side], alignClasses[align] || alignClasses.end);
  };

  if (!open) return null;

  return (
    <div 
      className={cn(getPositionClasses(), className)}
      style={{ 
        marginTop: side === 'bottom' ? sideOffset : undefined, 
        marginBottom: side === 'top' ? sideOffset : undefined,
        marginLeft: side === 'right' ? sideOffset : undefined,
        marginRight: side === 'left' ? sideOffset : undefined
      }}
    >
      <div>
        {children}
      </div>
    </div>
  );
};
