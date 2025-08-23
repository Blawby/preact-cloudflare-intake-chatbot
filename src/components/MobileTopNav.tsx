import { Bars3Icon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import { useTheme } from '../hooks/useTheme';

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
            {/* Team Profile Section */}
            <Button
              variant="ghost"
              size="md"
              onClick={onOpenSidebar}
              aria-label={`Open ${teamConfig.name || 'team'} menu`}
            >
              <div className="flex items-center gap-3">
                <img 
                  src={teamConfig.profileImage || '/blawby-favicon-iframe.png'} 
                  alt={teamConfig.name}
                  className="w-10 h-10 rounded-lg object-cover shadow-sm"
                />
                <div className="flex flex-col items-start min-w-0">
                  <span 
                    className="text-sm font-medium text-gray-900 dark:text-white leading-tight truncate max-w-[120px] sm:max-w-[180px] md:max-w-[220px]"
                    title={teamConfig.name}
                  >
                    {teamConfig.name.split(' ').slice(0, 2).join(' ')}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Online</span>
                </div>
              </div>
            </Button>

            {/* Right Section - Theme Toggle and Menu */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="lg"
                onClick={toggleTheme}
                icon={isDark ? <SunIcon className="w-6 h-6" aria-hidden="true" /> : <MoonIcon className="w-6 h-6" aria-hidden="true" />}
                aria-label="Toggle theme"
                aria-pressed={isDark}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              />
              <Button
                variant="ghost"
                size="lg"
                onClick={onOpenSidebar}
                icon={<Bars3Icon className="w-6 h-6" aria-hidden="true" focusable="false" />}
                aria-label="Open menu"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileTopNav; 