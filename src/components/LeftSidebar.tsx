import { 
  ChatBubbleOvalLeftIcon, 
  Bars3Icon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
import { useTheme } from '../hooks/useTheme';

interface LeftSidebarProps {
  currentRoute: string;
  onOpenMenu?: () => void;
  onGoToChats?: () => void;
  teamConfig?: {
    name: string;
    profileImage: string | null;
    teamId: string;
  };
}

const LeftSidebar = ({ currentRoute, onOpenMenu, onGoToChats, teamConfig }: LeftSidebarProps) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border">
      <div className="flex flex-col h-full justify-between p-4">
        {/* Top Section */}
        <div className="flex flex-col items-center gap-6">
          {/* Chats Section */}
          <div className="flex flex-col items-center">
            <Button
              variant={currentRoute === 'chats' ? 'primary' : 'ghost'}
              size="lg"
              icon={<ChatBubbleOvalLeftIcon className="w-6 h-6" />}
              title="Chats"
              onClick={onGoToChats}
              aria-current={currentRoute === 'chats' ? 'page' : undefined}
            />
          </div>
        </div>

        {/* Bottom Section - Theme Toggle and Menu */}
        <div className="flex flex-col items-center gap-3">
          <Button
            variant="ghost"
            size="lg"
            onClick={toggleTheme}
            icon={isDark ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          />
          <Button
            variant="ghost"
            size="lg"
            onClick={() => onOpenMenu?.()}
            icon={<Bars3Icon className="w-6 h-6" />}
            title="Menu"
            aria-label="Open menu"
          />
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar; 