import { Bars3Icon } from '@heroicons/react/24/outline';
import ThemeToggle from './ThemeToggle';

interface MobileTopNavProps {
  teamConfig: {
    name: string;
    profileImage: string | null;
    teamId: string;
    description?: string;
  };
  onOpenSidebar: () => void;
}

const MobileTopNav = ({ teamConfig, onOpenSidebar }: MobileTopNavProps) => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border lg:hidden z-50">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Team Profile Section */}
        <button
          onClick={onOpenSidebar}
          aria-label="Open team menu"
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-all duration-200 border-none bg-transparent"
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
        </button>

        {/* Right Section - Theme Toggle and Menu */}
        <div className="flex items-center">
          <ThemeToggle />
          <button
            onClick={onOpenSidebar}
            aria-label="Open menu"
            className="flex items-center justify-center w-12 h-12 rounded-lg cursor-pointer text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors duration-200 border-none bg-transparent leading-none p-0"
          >
            <Bars3Icon className="w-6 h-6 block" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileTopNav; 