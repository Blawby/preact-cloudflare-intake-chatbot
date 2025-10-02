import { ComponentChildren } from 'preact';
import { cn } from '../../../utils/cn';

export interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ComponentChildren;
  className?: string;
}

export const SettingsSection = ({
  title,
  description,
  children,
  className = ''
}: SettingsSectionProps) => {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="px-4 py-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
      <div className="bg-white dark:bg-dark-card-bg border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden">
        {children}
      </div>
    </div>
  );
};
