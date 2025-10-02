import { useLocation } from 'preact-iso';
import { SettingsSection } from './SettingsSection';
import { SettingsItem } from './SettingsItem';
import { GeneralPage } from './pages/GeneralPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AccountPage } from './pages/AccountPage';
import { PreferencesPage } from './pages/PreferencesPage';
import { SecurityPage } from './pages/SecurityPage';
import { MFAEnrollmentPage } from './pages/MFAEnrollmentPage';
import { SidebarNavigation, SidebarNavigationItem } from '../ui/SidebarNavigation';
import { 
  UserIcon, 
  ShieldCheckIcon, 
  Cog6ToothIcon,
  DocumentTextIcon,
  XMarkIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { useNavigation } from '../../utils/navigation';
import { useToastContext } from '../../contexts/ToastContext';
import { cn } from '../../utils/cn';

// Type for icon components
type IconComponent = preact.ComponentType<{ className?: string }>;


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
  const { showSuccess } = useToastContext();
  const { navigate } = useNavigation();
  const location = useLocation();
  
  // Get current page from URL path
  const getCurrentPage = () => {
    const path = location.path;
    if (path === '/settings' || path === '/settings/') {
      return 'general'; // Default to general page
    }
    const segments = path.split('/').filter(Boolean);
    return segments[1] || 'general'; // Get the page from /settings/page
  };
  
  const currentPage = getCurrentPage();

  const handleNavigation = (page: string) => {
    navigate(`/settings/${page}`);
  };

  const handleBack = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleSignOut = async () => {
    // Remove mock user data and refresh
    localStorage.removeItem('mockUser');
    showSuccess('Signed out successfully', 'You have been signed out');
    if (onClose) {
      onClose();
    }
    // Refresh the page to update the UI
    window.location.reload();
  };


  // Define navigation items with ChatGPT-like structure
  const navigationItems: SidebarNavigationItem[] = [
    { id: 'general', label: 'General', icon: Cog6ToothIcon as IconComponent },
    { id: 'notifications', label: 'Notifications', icon: BellIcon as IconComponent },
    { id: 'account', label: 'Account', icon: UserIcon as IconComponent },
    { id: 'preferences', label: 'Preferences', icon: Cog6ToothIcon as IconComponent },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon as IconComponent },
    { id: 'data', label: 'Data & Privacy', icon: DocumentTextIcon as IconComponent }
  ];


  // Render content based on current page
  const renderContent = () => {
    switch (currentPage) {
      case 'general':
        return <GeneralPage isMobile={isMobile} onClose={onClose} className="h-full" />;
      case 'notifications':
        return <NotificationsPage isMobile={isMobile} onClose={onClose} className="h-full" />;
      case 'account':
        return <AccountPage isMobile={isMobile} onClose={onClose} className="h-full" />;
      case 'preferences':
        return <PreferencesPage isMobile={isMobile} onClose={onClose} className="h-full" />;
      case 'security':
        return <SecurityPage isMobile={isMobile} onClose={onClose} className="h-full" />;
      case 'mfa-enrollment':
        return <MFAEnrollmentPage className="h-full" />;
      case 'data':
        return (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-dark-border">
              <div className="flex-1">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Data & Privacy
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Control your data and privacy settings
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <SettingsSection
                title="Data Export"
                description="Download your data"
              >
                <SettingsItem
                  label="Export Chat History"
                  description="Download all your conversation data"
                  type="action"
                  onClick={() => showSuccess('Export started', 'Your chat history will be downloaded shortly')}
                />
                <SettingsItem
                  label="Export Account Data"
                  description="Download all your account information"
                  type="action"
                  onClick={() => showSuccess('Export started', 'Your account data will be downloaded shortly')}
                />
              </SettingsSection>

              <SettingsSection
                title="Privacy"
                description="Control your privacy settings"
              >
                <SettingsItem
                  label="Privacy Policy"
                  description="View our privacy policy and data practices"
                  type="external"
                  href="https://blawby.com/privacy"
                />
                <SettingsItem
                  label="Terms of Service"
                  description="View our terms of service"
                  type="external"
                  href="https://blawby.com/terms"
                />
              </SettingsSection>

              <SettingsSection
                title="Support"
                description="Get help and support"
              >
                <SettingsItem
                  label="Help & Support"
                  description="Get help and contact our support team"
                  type="external"
                  href="https://blawby.com/help"
                />
                <SettingsItem
                  label="Contact Us"
                  description="Reach out to our team"
                  type="external"
                  href="https://blawby.com/contact"
                />
              </SettingsSection>

              <SettingsSection
                title="Account Actions"
                description="Manage your account session"
              >
                <SettingsItem
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
      default:
        return <AccountPage isMobile={isMobile} onClose={onClose} className="h-full" />;
    }
  };

  // For MFA enrollment, render as full page without sidebar
  if (currentPage === 'mfa-enrollment') {
    return (
      <div className={cn('h-full', className)}>
        {renderContent()}
      </div>
    );
  }

  return (
    <div className={cn('h-full flex relative', className)}>
      {/* Close Button - Top Left Corner */}
      <button
        onClick={handleBack}
        className="absolute top-4 left-7 z-10 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        aria-label="Close settings"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>

      {/* Left Navigation Panel */}
      <div className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-dark-border flex flex-col">
        {/* Navigation Items */}
        <div className="pt-12">
          <SidebarNavigation
            items={navigationItems}
            activeItem={currentPage}
            onItemClick={handleNavigation}
          />
        </div>
      </div>

      {/* Right Content Panel */}
      <div className="flex-1 bg-white dark:bg-dark-bg">
        {renderContent()}
      </div>
    </div>
  );
};
