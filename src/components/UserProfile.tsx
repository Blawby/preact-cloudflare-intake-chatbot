import { useState, useEffect } from 'preact/hooks';
import { UserIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import authClient from '../lib/authClient';
import { sanitizeUserImageUrl } from '../utils/urlValidation';
import { useNavigation } from '../utils/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  teamId?: string | null;
  role?: string | null;
  phone?: string | null;
}

interface UserProfileProps {
  isCollapsed?: boolean;
  isMobile?: boolean;
}

const UserProfile = ({ isCollapsed = false, isMobile: _isMobile = false }: UserProfileProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const { navigateToAuth } = useNavigation();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const result = await authClient.getSession();
      if (result.data?.user) {
        // Ensure email is present for the User interface
        const userData = result.data.user;
        if (userData.email) {
          setUser(userData as User);
        }
      }
    } catch (error) {
      console.error('Failed to get user session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      setUser(null);
      setShowProfile(false);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const handleSignIn = () => {
    // Navigate to auth page
    navigateToAuth('signin');
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
      <div className="relative">
        <button
          onClick={() => setShowProfile(!showProfile)}
          className={`flex items-center w-full rounded-lg text-left transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover ${
            isCollapsed 
              ? 'justify-center py-2' 
              : 'gap-3 px-3 py-2'
          }`}
          title={isCollapsed ? user.name : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center flex-shrink-0">
            {(() => {
              const sanitizedImageUrl = sanitizeUserImageUrl(user.image);
              return sanitizedImageUrl ? (
                <img 
                  src={sanitizedImageUrl} 
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <UserIcon className="w-5 h-5 text-white" />
              );
            })()}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>
          )}
        </button>

        {/* Profile Dropdown */}
        {showProfile && !isCollapsed && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-dark-card-bg border border-gray-200 dark:border-dark-border rounded-lg shadow-lg z-50">
            <div className="p-4 border-b border-gray-200 dark:border-dark-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent-500 flex items-center justify-center">
                  {(() => {
                    const sanitizedImageUrl = sanitizeUserImageUrl(user.image);
                    return sanitizedImageUrl ? (
                      <img 
                        src={sanitizedImageUrl} 
                        alt={user.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-6 h-6 text-white" />
                    );
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  {user.role && (
                    <p className="text-xs text-accent-600 dark:text-accent-400 truncate">{user.role}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-2">
              <button
                onClick={() => {
                  setShowProfile(false);
                  // You can implement settings functionality here
                }}
                className="flex items-center w-full gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
              >
                <Cog6ToothIcon className="w-4 h-4" />
                Settings
              </button>
              
              <button
                onClick={handleSignOut}
                className="flex items-center w-full gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
