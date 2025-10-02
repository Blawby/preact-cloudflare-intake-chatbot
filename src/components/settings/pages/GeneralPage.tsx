import { useState, useEffect } from 'preact/hooks';
import { SettingsDropdown } from '../components/SettingsDropdown';
import { useToastContext } from '../../../contexts/ToastContext';
import { mockUserDataService } from '../../../utils/mockUserData';

export interface GeneralPageProps {
  isMobile?: boolean;
  onClose?: () => void;
  className?: string;
}

export const GeneralPage = ({
  isMobile: _isMobile = false,
  onClose: _onClose,
  className = ''
}: GeneralPageProps) => {
  const { showSuccess } = useToastContext();
  const [settings, setSettings] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    accentColor: 'default' as 'default' | 'blue' | 'green' | 'purple' | 'red',
    language: 'auto-detect' as 'auto-detect' | 'en' | 'vi' | 'es' | 'fr' | 'de' | 'zh' | 'ja',
    spokenLanguage: 'auto-detect' as 'auto-detect' | 'en' | 'vi' | 'es' | 'fr' | 'de' | 'zh' | 'ja'
  });

  // Load settings from mock data service
  useEffect(() => {
    const preferences = mockUserDataService.getPreferences();
    
    // Defensive checks with sensible fallbacks
    setSettings({
      theme: preferences?.theme || 'system',
      accentColor: preferences?.accentColor || 'default',
      language: preferences?.language || 'auto-detect',
      spokenLanguage: preferences?.spokenLanguage || 'auto-detect'
    });
  }, []);

  const handleSettingChange = (key: string, value: string | boolean) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      
      // Save to mock data service with fresh state
      mockUserDataService.setPreferences(newSettings);
      
      return newSettings;
    });
    
    // Apply theme immediately if changed
    if (key === 'theme') {
      if (value === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else if (value === 'light') {
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
    }
    
    showSuccess('Settings saved', 'Your preferences have been updated');
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          General
        </h1>
        <div className="border-t border-gray-200 dark:border-dark-border mt-4" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6">
        <div className="space-y-0">
          <SettingsDropdown
            label="Theme"
            value={settings.theme}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' }
            ]}
            onChange={(value) => handleSettingChange('theme', value)}
          />
          
          <div className="border-t border-gray-200 dark:border-dark-border" />
          
          <SettingsDropdown
            label="Accent color"
            value={settings.accentColor}
            options={[
              { value: 'default', label: 'Default' },
              { value: 'blue', label: 'Blue' },
              { value: 'green', label: 'Green' },
              { value: 'purple', label: 'Purple' },
              { value: 'red', label: 'Red' }
            ]}
            onChange={(value) => handleSettingChange('accentColor', value)}
          />
          
          <div className="border-t border-gray-200 dark:border-dark-border" />
          
          <SettingsDropdown
            label="Language"
            value={settings.language}
            options={[
              { value: 'auto-detect', label: 'Auto-detect' },
              { value: 'en', label: 'English' },
              { value: 'vi', label: 'Tiếng Việt' },
              { value: 'es', label: 'Español' },
              { value: 'fr', label: 'Français' },
              { value: 'de', label: 'Deutsch' },
              { value: 'zh', label: '中文' },
              { value: 'ja', label: '日本語' }
            ]}
            onChange={(value) => handleSettingChange('language', value)}
          />
          
          <div className="border-t border-gray-200 dark:border-dark-border" />
          
          <SettingsDropdown
            label="Spoken language"
            value={settings.spokenLanguage}
            options={[
              { value: 'auto-detect', label: 'Auto-detect' },
              { value: 'en', label: 'English' },
              { value: 'vi', label: 'Tiếng Việt' },
              { value: 'es', label: 'Español' },
              { value: 'fr', label: 'Français' },
              { value: 'de', label: 'Deutsch' },
              { value: 'zh', label: '中文' },
              { value: 'ja', label: '日本語' }
            ]}
            onChange={(value) => handleSettingChange('spokenLanguage', value)}
            description="For best results, select the language you mainly speak. If it's not listed, it may still be supported via auto-detection."
          />
        </div>
      </div>
    </div>
  );
};
