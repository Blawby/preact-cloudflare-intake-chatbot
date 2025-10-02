import { FunctionComponent } from 'preact';
import { cn } from '../../utils/cn';

export interface SidebarNavigationItem {
  id: string;
  label: string;
  icon: preact.ComponentType<any>;
  isAction?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'danger';
}

export interface SidebarNavigationProps {
  items: SidebarNavigationItem[];
  activeItem?: string;
  onItemClick: (itemId: string) => void;
  className?: string;
}

export const SidebarNavigation: FunctionComponent<SidebarNavigationProps> = ({
  items,
  activeItem,
  onItemClick,
  className = ''
}) => {
  return (
    <nav className={cn('flex-1 py-2 px-3', className)}>
      {items.map((item) => {
        const IconComponent = item.icon;
        const isActive = activeItem === item.id;
        const isAction = item.isAction;
        const isDanger = item.variant === 'danger';
        
        return (
          <button
            key={item.id}
            onClick={() => {
              if (isAction && item.onClick) {
                item.onClick();
              } else {
                onItemClick(item.id);
              }
            }}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-lg',
              isAction
                ? isDanger
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                : isActive
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            <IconComponent className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
