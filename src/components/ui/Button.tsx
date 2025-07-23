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
  const baseClasses = 'inline-flex items-center justify-start rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed border-0 text-sm';
  
  const iconBaseClasses = 'inline-flex items-center justify-center rounded-full font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed border-0 text-sm';
  
  const variantClasses = {
    primary: 'bg-[#d4af37] text-gray-900 hover:bg-[#c19b2e] focus:ring-[#d4af37] dark:bg-[#d4af37] dark:text-gray-900 dark:hover:bg-[#c19b2e]',
    secondary: 'bg-gray-50 text-gray-900 border border-gray-300 hover:bg-gray-100 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-600',
    ghost: 'bg-transparent text-gray-900 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-100 dark:hover:bg-gray-800',
    icon: 'bg-[#111827] text-white hover:bg-[#1e293b] focus:ring-[#111827] rounded-full dark:bg-[#111827] dark:text-white dark:hover:bg-[#1e293b]',
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