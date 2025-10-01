import { useState, useEffect } from 'preact/hooks';
import { motion } from 'framer-motion';
import { SettingsSection } from './SettingsSection';
import { SettingsItem } from './SettingsItem';
import { 
  UserIcon, 
  ShieldCheckIcon, 
  Cog6ToothIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useNavigation } from '../../utils/navigation';
import { authClient } from '../../lib/authClient';

// Utility function for className merging (following codebase pattern)
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface SettingsPageProps {
  isMobile?: boolean;
  onClose?: () => void;
  className?: string;
}

export const SettingsPage = ({
  isMobile = false,
  onClose,
  className = ''
}: SettingsPageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const { navigate, navigateToHome } = useNavigation();

  useEffect(() => {
    // Simulate loading user data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleNavigation = (path: string) => {
    navigate(path);
    // Close settings panel on desktop after navigation
    if (!isMobile && onClose) {
      onClose();
    }
  };

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/');
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await authClient.signOut();
      // Close settings panel if open
      if (onClose) {
        onClose();
      }
      navigateToHome(); // Navigate after sign-out
    } catch (_error) {
      // Error handling could be improved with toast notifications
    } finally {
      setSigningOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <motion.div
          className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-dark-border">
        {isMobile && (
          <button
            onClick={handleBack}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your account and preferences
          </p>
        </div>
        {/* Close Button */}
        <button
          onClick={handleBack}
          className="p-2 -mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Close settings"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Account Section */}
        <SettingsSection
          title="Account"
          description="Manage your profile and personal information"
        >
          <SettingsItem
            icon={<UserIcon />}
            label="Profile"
            description="Edit your name, bio, and contact information"
            type="navigation"
            onClick={() => handleNavigation('/settings/account')}
          />
        </SettingsSection>

        {/* Preferences Section */}
        <SettingsSection
          title="Preferences"
          description="Customize your app experience"
        >
          <SettingsItem
            icon={<Cog6ToothIcon />}
            label="App Preferences"
            description="Theme, language, and display settings"
            type="navigation"
            onClick={() => handleNavigation('/settings/preferences')}
          />
        </SettingsSection>

        {/* Security Section */}
        <SettingsSection
          title="Security"
          description="Manage your account security and privacy"
        >
          <SettingsItem
            icon={<ShieldCheckIcon />}
            label="Security Settings"
            description="Password, two-factor authentication, and sessions"
            type="navigation"
            onClick={() => handleNavigation('/settings/security')}
          />
        </SettingsSection>

        {/* Legal & Support Section */}
        <SettingsSection
          title="Legal & Support"
          description="Terms, privacy, and help resources"
        >
          <SettingsItem
            icon={<DocumentTextIcon />}
            label="Privacy Policy"
            description="View our privacy policy and data practices"
            type="external"
            href="https://blawby.com/privacy"
          />
          <SettingsItem
            icon={<QuestionMarkCircleIcon />}
            label="Help & Support"
            description="Get help and contact our support team"
            type="external"
            href="https://blawby.com/help"
          />
        </SettingsSection>

        {/* Account Actions Section */}
        <SettingsSection
          title="Account Actions"
          description="Manage your account session"
        >
          <SettingsItem
            icon={<ArrowRightOnRectangleIcon />}
            label="Sign Out"
            description="Sign out of your account"
            type="action"
            onClick={handleSignOut}
            variant="danger"
          />
        </SettingsSection>
      </div>
    </div>
  );
};
