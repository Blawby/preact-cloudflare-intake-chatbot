import { useState, useEffect } from 'preact/hooks';
import { SettingsToggle } from '../components/SettingsToggle';
import { Button } from '../../ui/Button';
import { useToastContext } from '../../../contexts/ToastContext';
import { useNavigation } from '../../../utils/navigation';
import { mockUserDataService, MockSecuritySettings } from '../../../utils/mockUserData';
import Modal from '../../Modal';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

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
  const [settings, setSettings] = useState<MockSecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDisableMFAConfirm, setShowDisableMFAConfirm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load settings from mock data service
  const loadSettings = async () => {
    try {
      setLoading(true);
      const securitySettings = mockUserDataService.getSecuritySettings();
      setSettings(securitySettings);
      } catch (_error) {
        // Failed to load security settings
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Refresh settings when component regains focus (e.g., returning from MFA enrollment)
  useEffect(() => {
    const handleFocus = () => {
      loadSettings();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

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
      showSuccess('Settings saved', 'Your security settings have been updated');
    }
  };

  const handleConfirmDisableMFA = () => {
    if (!settings) return;
    
    const updatedSettings = { ...settings, twoFactorEnabled: false };
    setSettings(updatedSettings);
    
    // Save to mock data service
    mockUserDataService.setSecuritySettings(updatedSettings);
    showSuccess('MFA disabled', 'Multi-factor authentication has been disabled');
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
      showError('Missing fields', 'Please fill in all password fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('Password mismatch', 'New password and confirmation do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      showError('Weak password', 'Password must be at least 8 characters long');
      return;
    }

    try {
      // Here you would call your API to change the password
      // await authService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      
      showSuccess('Password changed', 'Your password has been updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
    } catch (error) {
      showError('Failed to change password', error instanceof Error ? error.message : 'Please try again');
    }
  };

  const handleResetPassword = () => {
    // Here you would trigger a password reset email
    showSuccess('Reset email sent', 'Check your email for password reset instructions');
  };

  const handleLogout = (type: 'current' | 'all') => {
    if (type === 'current') {
      showSuccess('Logged out', 'You have been logged out of this device');
    } else {
      showSuccess('Logged out', 'You have been logged out of all devices');
    }
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
        <p className="text-gray-500 dark:text-gray-400">Failed to load security settings</p>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Security
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
                  Password
                </h3>
              </div>
              <div className="ml-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsChangingPassword(!isChangingPassword)}
                >
                  {isChangingPassword ? 'Cancel' : 'Change password'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetPassword}
                  className="text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300"
                >
                  Reset password
                </Button>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Change your account password or reset it if you&apos;ve forgotten it.
            </p>

            {/* Password Change Form */}
            {isChangingPassword && (
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="current-password" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Current Password
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.currentTarget.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="Enter current password"
                  />
                </div>
                
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.currentTarget.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="Enter new password"
                  />
                </div>
                
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.currentTarget.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-input-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    placeholder="Confirm new password"
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
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleChangePassword}
                  >
                    Change Password
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
                Multi-factor authentication
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Require an extra security challenge when logging in. If you are unable to pass this challenge, you will have the option to recover your account via email.
              </p>
            </div>
            <div className="ml-4">
              <SettingsToggle
                label=""
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
                Trusted Devices
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                When you sign in on another device, it will be added here and can automatically receive device prompts for signing in.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border" />

          {/* Log out of this device Section */}
          <div className="flex items-center justify-between py-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Log out of this device
              </h3>
            </div>
            <div className="ml-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleLogout('current')}
              >
                Log out
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border" />

          {/* Log out of all devices Section */}
          <div className="flex items-center justify-between py-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Log out of all devices
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Log out of all active sessions across all devices, including your current session. It may take up to 30 minutes for other devices to be logged out.
              </p>
            </div>
            <div className="ml-4">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleLogout('all')}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 focus:ring-red-500"
              >
                Log out all
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* MFA Disable Confirmation Modal */}
      <Modal
        isOpen={showDisableMFAConfirm}
        onClose={handleCancelDisableMFA}
        title="Disable Multi-Factor Authentication"
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
                Are you sure you want to disable MFA?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Disabling multi-factor authentication will make your account less secure. You will no longer be required to provide a second authentication factor when signing in.
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
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmDisableMFA}
              className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600 hover:border-orange-700 focus:ring-orange-500 min-w-[80px]"
            >
              Disable MFA
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
