import { ComponentChildren } from 'preact';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: ComponentChildren;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children,
  className = '',
  type = 'button',
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-gray-900 text-white hover:bg-gray-800 hover:scale-105 focus:ring-gray-500 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100',
    secondary: 'bg-gray-100 text-gray-900 border border-gray-300 hover:bg-gray-200 hover:scale-105 focus:ring-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700',
    ghost: 'bg-transparent text-gray-900 hover:bg-gray-100 hover:scale-105 focus:ring-gray-500 dark:text-gray-100 dark:hover:bg-gray-800',
    icon: 'bg-gray-900 text-white hover:bg-gray-800 hover:scale-105 focus:ring-gray-500 rounded-full dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    icon: 'w-8 h-8 p-0', // Special size for icon buttons
  };
  
  const classes = [
    baseClasses,
    variantClasses[variant],
    variant === 'icon' ? sizeClasses.icon : sizeClasses[size],
    className
  ].filter(Boolean).join(' ');
  
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
} 