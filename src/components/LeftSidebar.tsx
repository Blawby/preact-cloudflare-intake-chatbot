import { 
  ChatBubbleLeftRightIcon, 
  Bars3Icon 
} from '@heroicons/react/24/outline';
import ThemeToggle from './ThemeToggle';

interface LeftSidebarProps {
  currentRoute: string;
  onOpenMenu?: () => void;
}

const LeftSidebar = ({ currentRoute, onOpenMenu }: LeftSidebarProps) => {
  return (
    <div className="left-sidebar">
      <div className="left-sidebar-content">
        {/* Top Section */}
        <div className="left-sidebar-top">
          {/* Chats Section */}
          <div className="left-sidebar-section">
            <div 
              className={`left-sidebar-header ${currentRoute === 'chats' ? 'active' : ''}`}
              title="Chats"
            >
              <ChatBubbleLeftRightIcon className="left-sidebar-icon" />
            </div>
          </div>
        </div>

        {/* Bottom Section - Theme Toggle and Menu */}
        <div className="left-sidebar-bottom">
          <div className="left-sidebar-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <ThemeToggle />
            <div 
              className="left-sidebar-header"
              onClick={onOpenMenu}
              title="Menu"
            >
              <Bars3Icon className="left-sidebar-icon" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar; 