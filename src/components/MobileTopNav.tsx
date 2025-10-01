import { Menu, Sun, Moon } from 'lucide-preact';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import { useTheme } from '../hooks/useTheme';
import MobileUserProfile from './MobileUserProfile';

interface MobileTopNavProps {
  teamConfig: {
    name: string;
    profileImage: string | null;
    teamId: string;
    description?: string;
  };
  onOpenSidebar: () => void;
  isVisible?: boolean;
}

const MobileTopNav = ({ teamConfig, onOpenSidebar, isVisible = true }: MobileTopNavProps) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="fixed top-0 left-0 right-0 bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border lg:hidden z-50 pt-safe"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30
          }}
        >
          <div className="flex items-center justify-between px-4">
            {/* Left Section - Hamburger Menu + Team Profile */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="md"
                onClick={onOpenSidebar}
                icon={<Menu className="w-5 h-5" aria-hidden="true" focusable="false" />}
                aria-label="Open menu"
              />
              <img 
                src={teamConfig.profileImage || '/blawby-favicon-iframe.png'} 
                alt={teamConfig.name}
                className="w-10 h-10 rounded-lg object-cover shadow-sm"
              />
            </div>

            {/* Right Section - User Profile & Theme Toggle */}
            <div className="flex items-center gap-2">
              <MobileUserProfile />
              <Button
                variant="ghost"
                size="lg"
                onClick={toggleTheme}
                icon={isDark ? <Sun className="w-6 h-6" aria-hidden="true" /> : <Moon className="w-6 h-6" aria-hidden="true" />}
                aria-label="Toggle theme"
                aria-pressed={isDark}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileTopNav; 