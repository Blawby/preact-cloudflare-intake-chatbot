import { useState, useEffect, useRef } from 'preact/hooks';
import { UserIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
// No authentication required - authClient removed
import { sanitizeUserImageUrl } from '../utils/urlValidation';
import { useNavigation } from '../utils/navigation';
import { SettingsPage } from './settings/SettingsPage';

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

const UserProfile = ({ isCollapsed = false, isMobile = false }: UserProfileProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { navigateToAuth } = useNavigation();

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
        setUser(e.detail);
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

  // Handle Escape key, body scroll, and click outside for overlay
  useEffect(() => {
    // Only apply scroll lock and event listeners when modal is actually visible
    const isModalVisible = showProfile && (!isCollapsed || isMobile);
    if (!isModalVisible) return;

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowProfile(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      // Close when clicking the backdrop (both mobile and desktop now have backdrop)
      const target = event.target as HTMLElement;
      if (target.classList.contains('fixed') && target.classList.contains('inset-0')) {
        setShowProfile(false);
      }
    };

    // Prevent body scroll when overlay is open (same pattern as Modal component)
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Add class to hide scrollbars on all scrollable containers
    document.body.classList.add('modal-open');

    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleClickOutside);
      
      // Restore body scroll (same pattern as Modal component)
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [showProfile, isMobile, isCollapsed]);

  const checkAuthStatus = async () => {
    // Check if user is "logged in" (stored in localStorage for demo)
    const mockUser = localStorage.getItem('mockUser');
    if (mockUser) {
      try {
        const userData = JSON.parse(mockUser);
        setUser(userData);
      } catch (e) {
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

  const handleSignOut = () => {
    // Remove mock user data and refresh
    localStorage.removeItem('mockUser');
    setUser(null);
    setShowProfile(false);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('authStateChanged', { detail: null }));
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
          id="user-profile-button"
          onClick={() => setShowProfile(!showProfile)}
          className={`flex items-center w-full rounded-lg text-left transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover ${
            isCollapsed 
              ? 'justify-center py-2' 
              : 'gap-3 px-3 py-2'
          }`}
          title={isCollapsed ? user.name : undefined}
          aria-expanded={showProfile}
          aria-haspopup="menu"
          aria-label={isCollapsed ? user.name : `User profile for ${user.name}`}
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

        {/* Settings Overlay */}
        <AnimatePresence>
          {showProfile && (!isCollapsed || isMobile) && (
            <>
              {/* Backdrop */}
              <motion.div
                className={`fixed inset-0 z-[1500] backdrop-blur-sm ${
                  isMobile 
                    ? 'bg-black bg-opacity-50' // Darker backdrop for mobile
                    : 'bg-black bg-opacity-20' // Lighter backdrop for desktop
                }`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => setShowProfile(false)}
              />
              {/* Settings Panel */}
              <motion.div
                ref={dropdownRef}
                className={`fixed bg-white dark:bg-dark-bg z-[1600] overflow-hidden rounded-lg shadow-2xl ${
                  isMobile 
                    ? 'inset-x-0 bottom-0 top-0' // Full screen on mobile
                    : 'top-8 left-8 right-8 bottom-8 max-w-4xl mx-auto' // Centered modal on desktop
                }`}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ 
                  duration: 0.3, 
                  ease: [0.32, 0.72, 0, 1] // Custom easing for smooth slide
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-dialog-title"
              >
                <SettingsPage 
                  isMobile={isMobile}
                  onClose={() => setShowProfile(false)}
                  className="h-full"
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default UserProfile;
