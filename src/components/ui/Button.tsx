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
  const baseClasses = 'inline-flex items-center justify-start rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed border-0';
  
  const iconBaseClasses = 'inline-flex items-center justify-center rounded-full font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed border-0';
  
  const variantClasses = {
    primary: 'bg-primary-500 text-gray-900 hover:bg-primary-600 focus:ring-primary-500 dark:bg-primary-500 dark:text-gray-900 dark:hover:bg-primary-600',
    secondary: 'bg-light-message-bg-user dark:bg-dark-message-bg-user text-light-text dark:text-dark-text border border-light-border dark:border-dark-border hover:bg-light-hover dark:hover:bg-dark-hover focus:ring-light-border dark:focus:ring-dark-border',
    ghost: 'bg-transparent text-light-text dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover focus:ring-light-border dark:focus:ring-dark-border',
    icon: 'bg-dark-bg text-white hover:bg-dark-hover focus:ring-dark-border rounded-full dark:bg-dark-bg dark:text-white dark:hover:bg-dark-hover',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    icon: 'w-8 h-8 p-0', // Special size for icon buttons
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