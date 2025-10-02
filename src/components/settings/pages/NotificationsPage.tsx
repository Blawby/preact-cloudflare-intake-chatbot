import { useState, useEffect } from 'preact/hooks';
import { SettingsDropdownWithToggles } from '../components/SettingsDropdownWithToggles';
import { useToastContext } from '../../../contexts/ToastContext';
import { mockUserDataService, MockNotificationSettings } from '../../../utils/mockUserData';

export interface NotificationsPageProps {
  className?: string;
}

export const NotificationsPage = ({
  className = ''
}: NotificationsPageProps) => {
  const { showSuccess } = useToastContext();
  const [settings, setSettings] = useState<MockNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Load settings from mock data service
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const notificationSettings = mockUserDataService.getNotificationSettings();
        setSettings(notificationSettings);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load notification settings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  const handleToggleChange = (section: string, toggleKey: string, value: boolean) => {
    if (!settings) return;
    
    const updatedSettings = {
      ...settings,
      [section]: {
        ...settings[section as keyof MockNotificationSettings],
        [toggleKey]: value
      }
    };
    
    setSettings(updatedSettings);
    
    // Save to mock data service
    mockUserDataService.setNotificationSettings(updatedSettings);
    showSuccess('Settings saved', 'Your notification preferences have been updated');
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
        <p className="text-gray-500 dark:text-gray-400">Failed to load notification settings</p>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Notifications
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
                Responses
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Get notified when ChatGPT responds to requests that take time, like research or image generation.
              </p>
            </div>
            <div className="ml-4">
              <SettingsDropdownWithToggles
                label=""
                value="responses"
                options={[]}
                onChange={() => {}}
                className="py-1"
                toggles={[
                  {
                    id: 'push',
                    label: 'Push',
                    value: settings.responses.push,
                    onChange: (value) => handleToggleChange('responses', 'push', value)
                  }
                ]}
              />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border" />

          {/* Tasks Section */}
          <div className="flex items-center justify-between py-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Tasks
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Get notified when tasks you&apos;ve created have updates.
              </p>
              <button 
                onClick={() => {/* TODO: Implement task management navigation */}}
                className="text-xs mt-1 text-left"
              >
                Manage tasks
              </button>
            </div>
            <div className="ml-4">
              <SettingsDropdownWithToggles
                label=""
                value="tasks"
                options={[]}
                onChange={() => {}}
                className="py-1"
                toggles={[
                  {
                    id: 'push',
                    label: 'Push',
                    value: settings.tasks.push,
                    onChange: (value) => handleToggleChange('tasks', 'push', value)
                  },
                  {
                    id: 'email',
                    label: 'Email',
                    value: settings.tasks.email,
                    onChange: (value) => handleToggleChange('tasks', 'email', value)
                  }
                ]}
              />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border" />

          {/* Messaging Section */}
          <div className="flex items-center justify-between py-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Messaging
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Calpico
              </p>
            </div>
            <div className="ml-4">
              <SettingsDropdownWithToggles
                label=""
                value="messaging"
                options={[]}
                onChange={() => {}}
                className="py-1"
                toggles={[
                  {
                    id: 'push',
                    label: 'Push',
                    value: settings.messaging.push,
                    onChange: (value) => handleToggleChange('messaging', 'push', value)
                  }
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
