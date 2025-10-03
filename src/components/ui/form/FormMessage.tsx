import { ComponentChildren } from 'preact';
import { cn } from '../../../utils/cn';

export interface FormMessageProps {
  children?: ComponentChildren;
  className?: string;
  variant?: 'error' | 'success' | 'warning' | 'info';
}

export const FormMessage = ({
  children,
  className = '',
  variant = 'error'
}: FormMessageProps) => {
  if (!children) return null;

  const variantClasses = {
    error: 'text-red-600 dark:text-red-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400'
  };

  return (
    <p className={cn(
      'text-xs mt-1',
      variantClasses[variant],
      className
    )}>
      {children}
    </p>
  );
};
