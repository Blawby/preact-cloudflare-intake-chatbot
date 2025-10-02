import { useState, useEffect, useCallback } from 'preact/hooks';
import { SettingsSection } from '../SettingsSection';
import { SettingsItem } from '../SettingsItem';
import { Button } from '../../ui/Button';
import { 
  ArrowLeftIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useNavigation } from '../../../utils/navigation';
import { useToastContext } from '../../../contexts/ToastContext';
import { mockUserDataService, MockUserPreferences } from '../../../utils/mockUserData';

// Utility function for className merging (following codebase pattern)
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface PreferencesPageProps {
  isMobile?: boolean;
  onClose?: () => void;
  className?: string;
}

export const PreferencesPage = ({
  isMobile = false,
  onClose,
  className = ''
}: PreferencesPageProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<MockUserPreferences>({
    theme: 'system',
    accentColor: 'default',
    fontSize: 'medium',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12-hour',
    autoSaveConversations: true,
    typingIndicators: true
  });

  const { navigate } = useNavigation();
  const { showSuccess, showError } = useToastContext();

  // Load preferences from mock data service on mount
  useEffect(() => {
    const savedPreferences = mockUserDataService.getPreferences();
    setPreferences(savedPreferences);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to mock data service
      mockUserDataService.setPreferences(preferences);
      
      // Apply theme immediately
      if (preferences.theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else if (preferences.theme === 'light') {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      } else {
        // System theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        localStorage.removeItem('theme');
      }
      
      showSuccess('Preferences saved', 'Your preferences have been updated');
      setIsEditing(false);
    } catch (error) {
      showError('Failed to save preferences', 'Please try again');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reload preferences from mock data service
    const savedPreferences = mockUserDataService.getPreferences();
    setPreferences(savedPreferences);
    setIsEditing(false);
  };

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/settings');
    }
  };

  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-border">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Preferences
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Customize your app experience
          </p>
        </div>
        
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Appearance Section */}
        <SettingsSection
          title="Appearance"
          description="Customize the look and feel of the app"
        >
          <SettingsItem
            label="Theme"
            description="Choose your preferred color scheme"
            type="input"
            inputType="select"
            value={preferences.theme}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' }
            ]}
            onChange={(value) => handlePreferenceChange('theme', value)}
            disabled={!isEditing}
          />
          
          <SettingsItem
            label="Accent Color"
            description="Choose your preferred accent color"
            type="input"
            inputType="select"
            value={preferences.accentColor}
            options={[
              { value: 'default', label: 'Default' },
              { value: 'blue', label: 'Blue' },
              { value: 'green', label: 'Green' },
              { value: 'purple', label: 'Purple' },
              { value: 'red', label: 'Red' }
            ]}
            onChange={(value) => handlePreferenceChange('accentColor', value)}
            disabled={!isEditing}
          />
          
          <SettingsItem
            label="Font Size"
            description="Adjust the text size for better readability"
            type="input"
            inputType="select"
            value={preferences.fontSize}
            options={[
              { value: 'small', label: 'Small' },
              { value: 'medium', label: 'Medium' },
              { value: 'large', label: 'Large' }
            ]}
            onChange={(value) => handlePreferenceChange('fontSize', value)}
            disabled={!isEditing}
          />
        </SettingsSection>

        {/* Localization Section */}
        <SettingsSection
          title="Localization"
          description="Language and regional settings"
        >
          <SettingsItem
            label="Language"
            description="Choose your preferred language"
            type="input"
            inputType="select"
            value={preferences.language}
            options={[
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Español' },
              { value: 'fr', label: 'Français' },
              { value: 'de', label: 'Deutsch' }
            ]}
            onChange={(value) => handlePreferenceChange('language', value)}
            disabled={!isEditing}
          />
          
          <SettingsItem
            label="Date Format"
            description="Choose how dates are displayed"
            type="input"
            inputType="select"
            value={preferences.dateFormat}
            options={[
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
            ]}
            onChange={(value) => handlePreferenceChange('dateFormat', value)}
            disabled={!isEditing}
          />
          
          <SettingsItem
            label="Time Format"
            description="Choose how time is displayed"
            type="input"
            inputType="select"
            value={preferences.timeFormat}
            options={[
              { value: '12-hour', label: '12-hour (AM/PM)' },
              { value: '24-hour', label: '24-hour' }
            ]}
            onChange={(value) => handlePreferenceChange('timeFormat', value)}
            disabled={!isEditing}
          />
        </SettingsSection>

        {/* Chat Preferences Section */}
        <SettingsSection
          title="Chat Preferences"
          description="Customize your chat experience"
        >
          <SettingsItem
            label="Auto-save Conversations"
            description="Automatically save your chat history"
            type="toggle"
            value={preferences.autoSaveConversations}
            onChange={(value) => handlePreferenceChange('autoSaveConversations', value)}
            disabled={!isEditing}
          />
          
          <SettingsItem
            label="Typing Indicators"
            description="Show when the AI is typing"
            type="toggle"
            value={preferences.typingIndicators}
            onChange={(value) => handlePreferenceChange('typingIndicators', value)}
            disabled={!isEditing}
          />
        </SettingsSection>
      </div>
    </div>
  );
};
