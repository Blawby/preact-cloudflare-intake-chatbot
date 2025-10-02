import { useLocation } from 'preact-iso';
import { GeneralPage } from './pages/GeneralPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AccountPage } from './pages/AccountPage';
import { SecurityPage } from './pages/SecurityPage';
import { MFAEnrollmentPage } from './pages/MFAEnrollmentPage';
import { HelpPage } from './pages/HelpPage';
import { SidebarNavigation, SidebarNavigationItem } from '../ui/SidebarNavigation';
import { 
  UserIcon, 
  ShieldCheckIcon, 
  Cog6ToothIcon,
  XMarkIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';
import { useNavigation } from '../../utils/navigation';
import { useToastContext } from '../../contexts/ToastContext';
import { cn } from '../../utils/cn';
import { mockUserDataService } from '../../utils/mockUserData';


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
    // Use the mock data service to properly clear all data
    mockUserDataService.resetToDefaults();
    
    // Also clear the legacy mockUser key for backward compatibility
    localStorage.removeItem('mockUser');
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('authStateChanged', { detail: null }));
    
    showSuccess('Signed out successfully', 'You have been signed out');
    if (onClose) {
      onClose();
    }
    // Refresh the page to update the UI
    window.location.reload();
  };


  // Define navigation items with ChatGPT-like structure
  // Note: Icons are now properly typed to accept SVG props like className, aria-hidden, strokeWidth, etc.
  const navigationItems: SidebarNavigationItem[] = [
    { id: 'general', label: 'General', icon: Cog6ToothIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'account', label: 'Account', icon: UserIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
    { id: 'help', label: 'Help', icon: QuestionMarkCircleIcon },
    { id: 'signout', label: 'Sign Out', icon: ArrowRightOnRectangleIcon, isAction: true, onClick: handleSignOut, variant: 'danger' }
  ];


  // Render content based on current page
  const renderContent = () => {
    switch (currentPage) {
      case 'general':
        return <GeneralPage isMobile={isMobile} onClose={onClose} className="h-full" />;
      case 'notifications':
        return <NotificationsPage className="h-full" />;
      case 'account':
        return <AccountPage isMobile={isMobile} onClose={onClose} className="h-full" />;
      case 'security':
        return <SecurityPage isMobile={isMobile} onClose={onClose} className="h-full" />;
      case 'help':
        return <HelpPage onClose={onClose} className="h-full" />;
      case 'mfa-enrollment':
        return <MFAEnrollmentPage className="h-full" />;
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
    <div className={cn('h-full flex', className)}>
      {/* Left Navigation Panel */}
      <div className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-dark-border flex flex-col">
        {/* Close Button - Top of Sidebar */}
        <button
          onClick={handleBack}
          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-lg text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close settings"
        >
          <XMarkIcon className="w-5 h-5 flex-shrink-0" />
        </button>
        
        {/* Navigation Items */}
        <div>
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
