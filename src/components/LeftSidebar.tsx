import { 
  ChatBubbleOvalLeftIcon, 
  DocumentIcon,
  Bars3Icon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
import { useTheme } from '../hooks/useTheme';
import { MatterStatus } from '../hooks/useMatterState';

interface LeftSidebarProps {
  currentRoute: string;
  onOpenMenu?: () => void;
  onGoToChats?: () => void;
  onGoToMatter?: () => void;
  matterStatus?: MatterStatus;
  teamConfig?: {
    name: string;
    profileImage: string | null;
    teamId: string;
  };
}

const LeftSidebar = ({ currentRoute, onOpenMenu, onGoToChats, onGoToMatter, matterStatus, teamConfig }: LeftSidebarProps) => {
  const { isDark, toggleTheme } = useTheme();

  // Get badge color based on matter status
  const getBadgeColor = (status?: MatterStatus) => {
    switch (status) {
      case 'ready':
        return 'bg-green-500';
      case 'incomplete':
        return 'bg-orange-500';
      case 'empty':
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-2">
      <div className="flex flex-col h-full bg-light-card-bg dark:bg-dark-card-bg rounded-lg justify-between p-4">
        {/* Top Section */}
        <div className="flex flex-col items-center gap-6">
          {/* Chats Section */}
          <div className="flex flex-col items-center">
            <Button
              variant={currentRoute === 'chats' ? 'primary' : 'ghost'}
              size="lg"
              icon={<ChatBubbleOvalLeftIcon className="w-6 h-6" />}
              title="Chats"
              onClick={onGoToChats || (() => {})}
              aria-current={currentRoute === 'chats' ? 'page' : undefined}
            />
          </div>

          {/* Matter Section */}
          <div className="flex flex-col items-center relative">
            <Button
              variant={currentRoute === 'matter' ? 'primary' : 'ghost'}
              size="lg"
              icon={<DocumentIcon className="w-6 h-6" />}
              title="Matter"
              aria-label={`Matter${matterStatus ? `, ${matterStatus}` : ''}`}
              onClick={onGoToMatter || (() => {})}
              aria-current={currentRoute === 'matter' ? 'page' : undefined}
            />
            {/* Badge indicator */}
            {matterStatus && matterStatus !== 'empty' && (
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getBadgeColor(matterStatus)} border-2 border-white dark:border-dark-bg`} aria-hidden="true" />
            )}
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