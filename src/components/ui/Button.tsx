import { ComponentChildren } from 'preact';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: ComponentChildren;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  style?: any;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children,
  className = '',
  type = 'button',
  style,
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-start rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed border-0 text-xs sm:text-sm';
  
  const iconBaseClasses = 'inline-flex items-center justify-center rounded-full font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed border-0 text-xs sm:text-sm';
  
  const variantClasses = {
    primary: 'bg-accent-500 text-gray-900 hover:bg-accent-600 focus:ring-accent-500 dark:bg-accent-500 dark:text-gray-900 dark:hover:bg-accent-600 !bg-accent-500',
    secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 focus:ring-gray-200 dark:focus:ring-gray-700',
    ghost: 'bg-transparent text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-hover focus:ring-gray-200 dark:focus:ring-gray-700',
    icon: 'bg-transparent text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-hover focus:ring-gray-200 dark:focus:ring-gray-700 rounded-full',
  };
  
  const sizeClasses = {
    sm: 'px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm',
    md: 'px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm',
    lg: 'px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base',
    icon: 'w-7 h-7 sm:w-8 sm:h-8 p-0', // Special size for icon buttons
  };
  
  const classes = [
    variant === 'icon' ? iconBaseClasses : baseClasses,
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
      style={style}
    >
      {children}
    </button>
  );
} 