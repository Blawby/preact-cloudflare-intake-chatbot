import { useState, useEffect, useMemo, useCallback } from 'preact/hooks';
import { useTranslation } from 'react-i18next';
import { SettingsDropdown } from '../components/SettingsDropdown';
import { useToastContext } from '../../../contexts/ToastContext';
import { mockUserDataService, type Language } from '../../../utils/mockUserData';
import { DEFAULT_LOCALE, detectBestLocale, setLocale, SUPPORTED_LOCALES } from '../../../i18n';

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
  const { t } = useTranslation(['settings', 'common']);
  const [settings, setSettings] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    accentColor: 'default' as 'default' | 'blue' | 'green' | 'purple' | 'red',
    language: 'auto-detect' as 'auto-detect' | Language,
    spokenLanguage: 'auto-detect' as 'auto-detect' | Language
  });

  // Load settings from mock data service
  useEffect(() => {
    const preferences = mockUserDataService.getPreferences();
    
    // Helper function to validate language against supported options
    const getValidLanguage = (lang: string | undefined): 'auto-detect' | Language => {
      if (!lang || lang === 'auto-detect') return 'auto-detect';
      // Check if it's a supported language in our options
      const supportedLanguages = ['en', 'vi', 'es', 'fr', 'de', 'zh', 'ja'];
      return supportedLanguages.includes(lang) ? lang as Language : 'auto-detect';
    };
    
    // Defensive checks with sensible fallbacks
    setSettings({
      theme: preferences?.theme || 'system',
      accentColor: preferences?.accentColor || 'default',
      language: getValidLanguage(preferences?.language),
      spokenLanguage: getValidLanguage(preferences?.spokenLanguage)
    });

    const preferredLanguage = preferences?.language;
    if (preferredLanguage && preferredLanguage !== 'auto-detect') {
      void setLocale(preferredLanguage);
    }
  }, []);
  const languageOptions = useMemo(() => ([
    { value: 'auto-detect', label: t('common:language.auto') },
    { value: 'en', label: t('common:language.en') },
    { value: 'vi', label: t('common:language.vi') },
    { value: 'es', label: t('common:language.es') },
    { value: 'fr', label: t('common:language.fr') },
    { value: 'de', label: t('common:language.de') },
    { value: 'zh', label: t('common:language.zh') },
    { value: 'ja', label: t('common:language.ja') }
  ]), [t]);

  const handleLocaleChange = useCallback(async (value: string) => {
    try {
      if (value === 'auto-detect') {
        const detected = detectBestLocale();
        await setLocale(detected);
      } else {
        const isSupported = SUPPORTED_LOCALES.includes(value as typeof SUPPORTED_LOCALES[number]);
        await setLocale(isSupported ? value : DEFAULT_LOCALE);
      }

      showSuccess(
        t('settings:general.language.toastTitle'),
        t('settings:general.language.toastBody')
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to apply locale change', error);
    }
  }, [showSuccess, t]);

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
    
    if (key === 'language') {
      void handleLocaleChange(value as string);
      return;
    }
    
    showSuccess(
      t('common:notifications.settingsSavedTitle'),
      t('common:notifications.settingsSavedBody')
    );
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('settings:general.title')}
        </h1>
        <div className="border-t border-gray-200 dark:border-dark-border mt-4" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6">
        <div className="space-y-0">
          <SettingsDropdown
            label={t('settings:general.theme.label')}
            value={settings.theme}
            options={[
              { value: 'light', label: t('settings:general.theme.options.light') },
              { value: 'dark', label: t('settings:general.theme.options.dark') },
              { value: 'system', label: t('settings:general.theme.options.system') }
            ]}
            onChange={(value) => handleSettingChange('theme', value)}
          />
          
          <div className="border-t border-gray-200 dark:border-dark-border" />
          
          <SettingsDropdown
            label={t('settings:general.accent.label')}
            value={settings.accentColor}
            options={[
              { value: 'default', label: t('settings:general.accent.options.default') },
              { value: 'blue', label: t('settings:general.accent.options.blue') },
              { value: 'green', label: t('settings:general.accent.options.green') },
              { value: 'purple', label: t('settings:general.accent.options.purple') },
              { value: 'red', label: t('settings:general.accent.options.red') }
            ]}
            onChange={(value) => handleSettingChange('accentColor', value)}
          />
          
          <div className="border-t border-gray-200 dark:border-dark-border" />
          
          <SettingsDropdown
            label={t('settings:general.language.label')}
            value={settings.language}
            options={languageOptions}
            onChange={(value) => handleSettingChange('language', value)}
            description={t('settings:general.language.description')}
          />
          
          <div className="border-t border-gray-200 dark:border-dark-border" />
          
          <SettingsDropdown
            label={t('settings:general.spokenLanguage.label')}
            value={settings.spokenLanguage}
            options={[
              { value: 'auto-detect', label: t('common:language.auto') },
              { value: 'en', label: t('common:language.en') },
              { value: 'vi', label: t('common:language.vi') },
              { value: 'es', label: t('common:language.es') },
              { value: 'fr', label: t('common:language.fr') },
              { value: 'de', label: t('common:language.de') },
              { value: 'zh', label: t('common:language.zh') },
              { value: 'ja', label: t('common:language.ja') }
            ]}
            onChange={(value) => handleSettingChange('spokenLanguage', value)}
            description={t('settings:general.spokenLanguage.description')}
          />
        </div>
      </div>
    </div>
  );
};
