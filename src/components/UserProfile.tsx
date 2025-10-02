import { useState, useEffect } from 'preact/hooks';
import { UserIcon } from '@heroicons/react/24/outline';
// No authentication required - authClient removed
import { sanitizeUserImageUrl } from '../utils/urlValidation';
import { useNavigation } from '../utils/navigation';
import { type SubscriptionTier } from '../utils/mockUserData';
import { mockPricingDataService } from '../utils/mockPricingData';

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { navigateToAuth, navigate } = useNavigation();

  useEffect(() => {
    checkAuthStatus();
    
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
        checkAuthStatus();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStateChanged', handleAuthStateChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleAuthStateChange as EventListener);
    };
  }, []);


  const checkAuthStatus = async () => {
    // Check if user is "logged in" (stored in localStorage for demo)
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
      <div className={`${isCollapsed ? 'py-2' : 'p-4'} border-t border-gray-200 dark:border-dark-border`}>
        <button
          onClick={handleSignIn}
          className={`flex items-center w-full rounded-lg text-left transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover ${
            isCollapsed 
              ? 'justify-center py-2' 
              : 'gap-3 px-3 py-2'
          }`}
          title={isCollapsed ? 'Sign In' : undefined}
        >
          <UserIcon className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">Sign In</span>}
        </button>
      </div>
    );
  }

  return (
    <div className={`${isCollapsed ? 'py-2' : 'p-4'} border-t border-gray-200 dark:border-dark-border`}>
      {isCollapsed ? (
        // Collapsed state - just show avatar
        <button
          onClick={() => navigate('/settings')}
          className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mx-auto"
          title={user.name}
          aria-label={`User profile for ${user.name}`}
        >
          {(() => {
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
          })()}
        </button>
      ) : (
        // Expanded state - show full profile with tier and upgrade button
        <div className="space-y-3">
          {/* Profile Section */}
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-3 w-full text-left hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg p-2 -m-2 transition-colors"
            aria-label={`Open settings for ${user.name}`}
          >
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              {(() => {
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
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-300 truncate">
                {getTierDisplayName(user.subscriptionTier || 'free')}
              </p>
            </div>
          </button>

          {/* Upgrade Button - only show for Free tier */}
          {user.subscriptionTier === 'free' && (
            <button
              onClick={handleUpgrade}
              className="w-full px-3 py-2 text-xs font-medium text-white bg-transparent border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Upgrade
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default UserProfile;
