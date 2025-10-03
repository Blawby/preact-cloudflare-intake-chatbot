import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { Switch, FormLabel, FormControl, SectionDivider } from '../../ui';
import { FormItem } from '../../ui/form';
import { Button } from '../../ui/Button';
import { useToastContext } from '../../../contexts/ToastContext';
import { useNavigation } from '../../../utils/navigation';
import { mockUserDataService, MockSecuritySettings } from '../../../utils/mockUserData';
import Modal from '../../Modal';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

export interface SecurityPageProps {
  isMobile?: boolean;
  onClose?: () => void;
  className?: string;
}

export const SecurityPage = ({
  isMobile: _isMobile = false,
  onClose: _onClose,
  className = ''
}: SecurityPageProps) => {
  const { showSuccess, showError } = useToastContext();
  const { navigate } = useNavigation();
  const { t } = useTranslation(['settings', 'common']);
  const [settings, setSettings] = useState<MockSecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDisableMFAConfirm, setShowDisableMFAConfirm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const isLoadingRef = useRef(false);

  // Load settings from mock data service
  const loadSettings = useCallback(async () => {
    // Guard against concurrent calls
    if (isLoadingRef.current) {
      return;
    }
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);
      const securitySettings = mockUserDataService.getSecuritySettings();
      setSettings(securitySettings);
    } catch (error) {
      // Failed to load security settings
      // eslint-disable-next-line no-console
      console.error('Failed to load security settings:', error);
      setError(error instanceof Error ? error.message : t('settings:security.loadError'));
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [t]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Refresh settings when component regains focus (e.g., returning from MFA enrollment)
  useEffect(() => {
    const handleFocus = () => {
      loadSettings();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadSettings]);

  const handleToggleChange = (key: string, value: boolean) => {
    if (!settings) return;
    
    if (key === 'twoFactorEnabled') {
      if (value) {
        // Enable MFA: Navigate to enrollment page without updating state
        navigate('/settings/mfa-enrollment');
      } else {
        // Disable MFA: Show confirmation dialog
        setShowDisableMFAConfirm(true);
      }
    } else {
      // Handle other toggles normally
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);
      
      // Save to mock data service
      mockUserDataService.setSecuritySettings(updatedSettings);
      showSuccess(
        t('common:notifications.settingsSavedTitle'),
        t('settings:security.toasts.settingsUpdated')
      );
    }
  };

  const handleConfirmDisableMFA = () => {
    if (!settings) return;
    
    const updatedSettings = { ...settings, twoFactorEnabled: false };
    setSettings(updatedSettings);
    
    // Save to mock data service
    mockUserDataService.setSecuritySettings(updatedSettings);
    showSuccess(
      t('settings:security.mfa.disable.toastTitle'),
      t('settings:security.mfa.disable.toastBody')
    );
    setShowDisableMFAConfirm(false);
  };

  const handleCancelDisableMFA = () => {
    setShowDisableMFAConfirm(false);
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showError(
        t('settings:security.password.errors.missing.title'),
        t('settings:security.password.errors.missing.body')
      );
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError(
        t('settings:security.password.errors.mismatch.title'),
        t('settings:security.password.errors.mismatch.body')
      );
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      showError(
        t('settings:security.password.errors.weak.title'),
        t('settings:security.password.errors.weak.body')
      );
      return;
    }

    try {
      // Here you would call your API to change the password
      // await authService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      
      showSuccess(
        t('settings:security.password.success.title'),
        t('settings:security.password.success.body')
      );
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
    } catch (error) {
      showError(
        t('settings:security.password.errors.failed.title'),
        error instanceof Error ? error.message : t('settings:security.password.errors.failed.body')
      );
    }
  };

  const handleResetPassword = () => {
    // Here you would trigger a password reset email
    showSuccess(
      t('settings:security.password.reset.title'),
      t('settings:security.password.reset.body')
    );
  };

  const handleLogout = (type: 'current' | 'all') => {
    if (type === 'current') {
      showSuccess(
        t('settings:security.logout.current.toastTitle'),
        t('settings:security.logout.current.toastBody')
      );
    } else {
      showSuccess(
        t('settings:security.logout.all.toastTitle'),
        t('settings:security.logout.all.toastBody')
      );
    }
  };

  if (loading) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm font-medium">{t('settings:security.loadError')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{error}</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={loadSettings}
          >
            {t('settings:account.retry')}
          </Button>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">{t('settings:security.fallback')}</p>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('settings:security.title')}
        </h1>
        <div className="border-t border-gray-200 dark:border-dark-border mt-4" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6">
        <div className="space-y-0">
          {/* Password Section */}
          <div className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {t('settings:security.password.sectionTitle')}
                </h3>
              </div>
              <div className="ml-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsChangingPassword(!isChangingPassword)}
                >
                  {isChangingPassword ? t('settings:security.password.cancelButton') : t('settings:security.password.changeButton')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetPassword}
                  className="text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300"
                >
                  {t('settings:security.password.resetButton')}
                </Button>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings:security.password.description')}
            </p>

            {/* Password Change Form */}
            {isChangingPassword && (
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="current-password" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {t('settings:security.password.fields.current.label')}
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.currentTarget.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder={t('settings:security.password.fields.current.placeholder')}
                  />
                </div>
                
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {t('settings:security.password.fields.new.label')}
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.currentTarget.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder={t('settings:security.password.fields.new.placeholder')}
                  />
                </div>
                
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {t('settings:security.password.fields.confirm.label')}
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.currentTarget.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder={t('settings:security.password.fields.confirm.placeholder')}
                  />
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                  >
                    {t('settings:security.password.cancelButton')}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleChangePassword}
                  >
                    {t('settings:security.password.submit')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border" />

          {/* Multi-factor authentication Section */}
          <div className="flex items-center justify-between py-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('settings:security.mfa.title')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('settings:security.mfa.description')}
              </p>
            </div>
            <div className="ml-4">
              <Switch
                value={settings.twoFactorEnabled}
                onChange={(value) => handleToggleChange('twoFactorEnabled', value)}
              />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border" />

          {/* Trusted Devices Section */}
          <div className="flex items-center justify-between py-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('settings:security.trustedDevices.title')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('settings:security.trustedDevices.description')}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border" />

          {/* Log out of this device Section */}
          <div className="flex items-center justify-between py-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('settings:security.logout.current.title')}
              </h3>
            </div>
            <div className="ml-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleLogout('current')}
              >
                {t('settings:security.logout.current.button')}
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border" />

          {/* Log out of all devices Section */}
          <div className="flex items-center justify-between py-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('settings:security.logout.all.title')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('settings:security.logout.all.description')}
              </p>
            </div>
            <div className="ml-4">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleLogout('all')}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 focus:ring-red-500"
              >
                {t('settings:security.logout.all.button')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* MFA Disable Confirmation Modal */}
      <Modal
        isOpen={showDisableMFAConfirm}
        onClose={handleCancelDisableMFA}
        title={t('settings:security.mfa.disable.modalTitle')}
        showCloseButton={true}
        type="modal"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="w-6 h-6 text-orange-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('settings:security.mfa.disable.heading')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings:security.mfa.disable.description')}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancelDisableMFA}
              className="min-w-[80px]"
            >
              {t('settings:security.mfa.disable.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmDisableMFA}
              className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600 hover:border-orange-700 focus:ring-orange-500 min-w-[80px]"
            >
              {t('settings:security.mfa.disable.confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
