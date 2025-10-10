import { useState, useEffect, useRef } from 'preact/hooks';
import { UserIcon, Cog6ToothIcon, SparklesIcon, QuestionMarkCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
// No authentication required - authClient removed
import { sanitizeUserImageUrl } from '../utils/urlValidation';
import { useNavigation } from '../utils/navigation';
import { type SubscriptionTier } from '../utils/mockUserData';
import { mockPricingDataService } from '../utils/mockPricingData';
import { mockUserDataService } from '../utils/mockUserData';
import { debounce } from '../utils/debounce';
import { useTranslation } from 'react-i18next';

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  teamId?: string | null;
  role?: string | null;
  phone?: string | null;
  subscriptionTier?: SubscriptionTier;
}

interface UserProfileProps {
  isCollapsed?: boolean;
  isMobile?: boolean;
}

const UserProfile = ({ isCollapsed = false }: UserProfileProps) => {
  const { t } = useTranslation(['profile', 'common']);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { navigateToAuth, navigate } = useNavigation();

  useEffect(() => {
    checkAuthStatus();
    
    // Mobile detection with debouncing
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    
    // Create debounced resize handler for performance
    const debouncedResizeHandler = debounce(checkMobile, 100);
    window.addEventListener('resize', debouncedResizeHandler);
    
    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mockUser') {
        checkAuthStatus();
      }
    };
    
    // Listen for custom auth state changes (same tab)
    const handleAuthStateChange = (e: CustomEvent) => {
      if (e.detail) {
        const userWithTier = {
          ...e.detail,
          subscriptionTier: e.detail.subscriptionTier || 'free'
        };
        setUser(userWithTier);
      } else {
        // User logged out, clear the user state
        setUser(null);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStateChanged', handleAuthStateChange as EventListener);
    
    return () => {
      window.removeEventListener('resize', debouncedResizeHandler);
      debouncedResizeHandler.cancel();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleAuthStateChange as EventListener);
    };
  }, []);

  // Handle dropdown close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);


  const checkAuthStatus = async () => {
    // Check if user is "logged in" - only consider signed in if mockUser exists in localStorage
    const mockUser = localStorage.getItem('mockUser');
    if (mockUser) {
      try {
        const userData = JSON.parse(mockUser);
        // Ensure subscription tier is set (default to 'free' if not present)
        const userWithTier = {
          ...userData,
          subscriptionTier: userData.subscriptionTier || 'free'
        };
        setUser(userWithTier);
      } catch (_error) {
        localStorage.removeItem('mockUser');
        setUser(null);
      }
    } else {
      // No mockUser in localStorage means user is signed out
      setUser(null);
    }
    setLoading(false);
  };


  const handleSignIn = () => {
    // Navigate to auth page (no actual auth required)
    navigateToAuth('signin');
  };


  const handleUpgrade = () => {
    // Navigate to #pricing hash to open the modal
    window.location.hash = '#pricing';
  };

  const handleProfileClick = () => {
    if (isMobile) {
      // On mobile, directly navigate to settings (skip dropdown)
      navigate('/settings');
    } else {
      // On desktop, show dropdown
      setShowDropdown(!showDropdown);
    }
  };

  const handleSettingsClick = () => {
    setShowDropdown(false);
    navigate('/settings');
  };

  const handleUpgradeClick = () => {
    setShowDropdown(false);
    window.location.hash = '#pricing';
  };

  const handleHelpClick = () => {
    setShowDropdown(false);
    navigate('/settings/help');
  };

  const handleLogoutClick = () => {
    setShowDropdown(false);
    // Use the mock data service to properly clear all data
    mockUserDataService.resetToDefaults();
    
    // Also clear the legacy mockUser key for backward compatibility
    localStorage.removeItem('mockUser');
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('authStateChanged', { detail: null }));
    
    // Refresh the page to update the UI
    window.location.reload();
  };


  const getTierDisplayName = (tier: SubscriptionTier) => {
    return mockPricingDataService.getTierDisplayName(tier);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderAvatar = () => {
    const sanitizedImageUrl = sanitizeUserImageUrl(user.image);
    return sanitizedImageUrl ? (
      <img 
        src={sanitizedImageUrl} 
        alt={user.name}
        className="w-full h-full rounded-full object-cover"
      />
    ) : (
      <span className="text-white text-sm font-medium">
        {getInitials(user.name)}
      </span>
    );
  };

  const renderDropdown = () => {
    if (!showDropdown || isMobile) return null;
    
    return (
      <div className="absolute bottom-full right-0 mb-2 w-full max-w-xs bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
        {/* Upgrade Plan */}
        {user.subscriptionTier === 'free' && (
          <button
            onClick={handleUpgradeClick}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <SparklesIcon className="w-4 h-4" />
            {t('profile:menu.upgrade')}
          </button>
        )}
        
        {/* Settings */}
        <button
          onClick={handleSettingsClick}
          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <Cog6ToothIcon className="w-4 h-4" />
          {t('profile:menu.settings')}
        </button>
        
        {/* Separator */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
        
        {/* Help */}
        <button
          onClick={handleHelpClick}
          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <QuestionMarkCircleIcon className="w-4 h-4" />
          {t('profile:menu.help')}
        </button>
        
        {/* Log out */}
        <button
          onClick={handleLogoutClick}
          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          {t('profile:menu.signOut')}
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`flex items-center ${isCollapsed ? 'justify-center py-2' : 'gap-3 px-3 py-2'}`}>
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        {!isCollapsed && <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />}
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`p-2 border-t border-gray-200 dark:border-dark-border`}>
        <button
          onClick={handleSignIn}
          className={`flex items-center w-full rounded-lg text-left transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover ${
            isCollapsed 
              ? 'justify-center py-2' 
              : 'gap-3 px-3 py-2'
          }`}
          title={isCollapsed ? t('profile:menu.signIn') : undefined}
          aria-label={t('profile:aria.signInButton')}
        >
          <UserIcon className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">{t('profile:menu.signIn')}</span>}
        </button>
      </div>
    );
  }

  return (
    <div className={`p-2 border-t border-gray-200 dark:border-dark-border`}>
      {isCollapsed ? (
        // Collapsed state - just show avatar with dropdown
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleProfileClick}
            className="w-8 h-8 rounded-full bg-gray-600 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mx-auto"
            title={user.name}
            aria-label={`User profile for ${user.name}`}
          >
            {renderAvatar()}
          </button>
          
          {/* Dropdown - only show on desktop */}
          {renderDropdown()}
        </div>
      ) : (
        // Expanded state - show full profile with tier and upgrade button
        <div className="space-y-3">
          {/* Profile Section */}
          <div className="relative flex items-center gap-2 min-w-0" ref={dropdownRef}>
            <button
              onClick={handleProfileClick}
              className="flex items-center gap-3 flex-1 text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-2 transition-colors"
              aria-label={t('profile:aria.userProfile', { name: user.name })}
            >
              <div className="w-8 h-8 rounded-full bg-gray-600 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                {renderAvatar()}
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={user.name}>{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-300 truncate" title={getTierDisplayName(user.subscriptionTier || 'free')}>
                  {getTierDisplayName(user.subscriptionTier || 'free')}
                </p>
              </div>
            </button>
            
            {/* Upgrade Button - inline with profile */}
            {user.subscriptionTier === 'free' && (
              <button
                onClick={handleUpgrade}
                className="px-2 py-1 text-xs font-medium text-gray-900 dark:text-white bg-transparent border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                title="Upgrade your plan"
              >
                {t('profile:menu.upgradeShort')}
              </button>
            )}
            
            {/* Dropdown - only show on desktop */}
            {renderDropdown()}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
