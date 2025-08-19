import { ComponentChildren } from 'preact';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: ComponentChildren;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  style?: any;
  icon?: ComponentChildren;
  iconPosition?: 'left' | 'right';
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
  icon,
  iconPosition = 'left',
}: ButtonProps) {
  // Check if this is an icon-only button (no children, only icon)
  const isIconOnly = !children && icon;
  
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed border';
  
  const variantClasses = {
    primary: 'bg-accent-500 text-gray-900 hover:bg-accent-600 focus:ring-accent-500 border-accent-500',
    secondary: 'bg-transparent text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 focus:ring-gray-200 dark:focus:ring-gray-700',
    ghost: 'bg-transparent text-gray-900 dark:text-white border-transparent hover:bg-gray-100 dark:hover:bg-dark-hover focus:ring-gray-200 dark:focus:ring-gray-700',
  };
  
  const sizeClasses = {
    sm: isIconOnly ? 'w-8 h-8 p-0' : 'px-3 py-1.5 text-xs',
    md: isIconOnly ? 'w-10 h-10 p-0' : 'px-4 py-2 text-sm',
    lg: isIconOnly ? 'w-12 h-12 p-0' : 'px-6 py-3 text-base',
  };
  
  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  ].filter(Boolean).join(' ');
  
  const renderContent = () => {
    if (isIconOnly) {
      return icon;
    }
    
    if (!icon) {
      return children;
    }
    
    if (iconPosition === 'right') {
      return (
        <>
          {children}
          <span className="ml-2">{icon}</span>
        </>
      );
    }
    
    return (
      <>
        <span className="mr-2">{icon}</span>
        {children}
      </>
    );
  };
  
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      style={style}
    >
      {renderContent()}
    </button>
  );
} 