import { 
  ChatBubbleOvalLeftIcon, 
  Bars3Icon 
} from '@heroicons/react/24/outline';
import ThemeToggle from './ThemeToggle';

interface LeftSidebarProps {
  currentRoute: string;
  onOpenMenu?: () => void;
  teamConfig?: {
    name: string;
    profileImage: string | null;
    teamId: string;
  };
}

const LeftSidebar = ({ currentRoute, onOpenMenu, teamConfig }: LeftSidebarProps) => {
  return (
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-dark-border">
      <div className="flex flex-col h-full justify-between p-4">
        {/* Top Section */}
        <div className="flex flex-col items-center gap-6">
          {/* Chats Section */}
          <div className="flex flex-col items-center">
            <button
              className={`flex items-center justify-center w-12 h-12 rounded-lg cursor-pointer transition-all duration-200 border-none bg-transparent ${
                currentRoute === 'chats' 
                  ? 'bg-accent-500 text-gray-900 dark:text-white' 
                  : 'text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover'
              }`}
              title="Chats"
            >
              <ChatBubbleOvalLeftIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Bottom Section - Theme Toggle and Menu */}
        <div className="flex flex-col items-center gap-3">
          <ThemeToggle />
          <button
            onClick={onOpenMenu}
            title="Menu"
            className="flex items-center justify-center w-12 h-12 rounded-lg cursor-pointer text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover transition-all duration-200 border-none bg-transparent"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar; 