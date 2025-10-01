import { useState, useEffect } from 'preact/hooks';
import { UserIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import authClient from '../lib/authClient';
import { useNavigation } from '../utils/navigation';
import { sanitizeUserImageUrl } from '../utils/urlValidation';

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  teamId?: string | null;
  role?: string | null;
  phone?: string | null;
}

const MobileUserProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const { navigate, navigateToAuth } = useNavigation();

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
      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
    );
  }

  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="Sign In"
      >
        <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowProfile(!showProfile)}
        className="w-10 h-10 rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-accent-500"
        title={user.name}
      >
        {(() => {
          const sanitizedImageUrl = sanitizeUserImageUrl(user.image);
          return sanitizedImageUrl ? (
            <img 
              src={sanitizedImageUrl} 
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-accent-500 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
          );
        })()}
      </button>

      {/* Profile Dropdown */}
      <AnimatePresence>
        {showProfile && (
          <motion.div
            className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-dark-card-bg border border-gray-200 dark:border-dark-border rounded-lg shadow-lg z-50"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
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
                  navigate('/settings');
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileUserProfile;
