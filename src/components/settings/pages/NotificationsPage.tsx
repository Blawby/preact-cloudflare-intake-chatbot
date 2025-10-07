import { useState, useEffect } from 'preact/hooks';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, SectionDivider } from '../../ui';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useToastContext } from '../../../contexts/ToastContext';
import { mockUserDataService, MockNotificationSettings } from '../../../utils/mockUserData';
import { useTranslation } from 'react-i18next';
import { getNotificationDisplayText, NOTIFICATION_DEFAULTS } from '../../ui/validation/defaultValues';

export interface NotificationsPageProps {
  className?: string;
}

export const NotificationsPage = ({
  className = ''
}: NotificationsPageProps) => {
  const { showSuccess } = useToastContext();
  const [settings, setSettings] = useState<MockNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation(['settings', 'common']);
  

  // Load settings from mock data service
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const notificationSettings = mockUserDataService.getNotificationSettings();
        setSettings(notificationSettings);
      } catch (error) {
         
        console.error('Failed to load notification settings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  const handleToggleChange = (section: string, toggleKey: string, value: boolean) => {
    if (!settings) return;
    
    // Create a new settings object to ensure React detects the change
    const updatedSettings = {
      ...settings,
      [section]: {
        ...settings[section as keyof MockNotificationSettings],
        [toggleKey]: value
      }
    };
    
    // Update local state
    setSettings(updatedSettings);
    
    // Save to mock data service
    mockUserDataService.setNotificationSettings(updatedSettings);
    
    // Show success toast
    showSuccess(
      t('common:notifications.settingsSavedTitle'),
      t('settings:notifications.toastBody')
    );
  };

  // Generate display text for dropdown triggers using atomic design defaults
  const getDisplayText = (section: keyof MockNotificationSettings) => {
    if (!settings) return '';
    
    const sectionSettings = settings[section];
    const translations = {
      push: t('settings:notifications.channels.push'),
      email: t('settings:notifications.channels.email'),
      none: t('settings:notifications.channels.none'),
    };
    
    return getNotificationDisplayText(sectionSettings, translations);
  };

  if (loading) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">{t('settings:notifications.loadError')}</p>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('settings:notifications.title')}
        </h1>
        <div className="border-t border-gray-200 dark:border-dark-border mt-4" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6">
        <div className="space-y-0">
          {/* Responses Section */}
          <div className="flex items-center justify-between py-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('settings:notifications.sections.responses.title')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('settings:notifications.sections.responses.description')}
              </p>
            </div>
            <div className="ml-4">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <span>{getDisplayText('responses')}</span>
                  <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuCheckboxItem
                    checked={settings.responses.push}
                    onCheckedChange={(value) => handleToggleChange('responses', 'push', value)}
                  >
                    {t('settings:notifications.channels.push')}
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border" />

          {/* Tasks Section */}
          <div className="flex items-center justify-between py-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('settings:notifications.sections.tasks.title')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('settings:notifications.sections.tasks.description')}
              </p>
              <button 
                onClick={() => {/* TODO: Implement task management navigation */}}
                className="text-xs mt-1 text-left"
              >
                {t('settings:notifications.sections.tasks.manage')}
              </button>
            </div>
            <div className="ml-4">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <span>{getDisplayText('tasks')}</span>
                  <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuCheckboxItem
                    checked={settings.tasks.push}
                    onCheckedChange={(value) => handleToggleChange('tasks', 'push', value)}
                  >
                    {t('settings:notifications.channels.push')}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={settings.tasks.email}
                    onCheckedChange={(value) => handleToggleChange('tasks', 'email', value)}
                  >
                    {t('settings:notifications.channels.email')}
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border" />

          {/* Messaging Section */}
          <div className="flex items-center justify-between py-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('settings:notifications.sections.messaging.title')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('settings:notifications.sections.messaging.description')}
              </p>
            </div>
            <div className="ml-4">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <span>{getDisplayText('messaging')}</span>
                  <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuCheckboxItem
                    checked={settings.messaging.push}
                    onCheckedChange={(value) => handleToggleChange('messaging', 'push', value)}
                  >
                    {t('settings:notifications.channels.push')}
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
