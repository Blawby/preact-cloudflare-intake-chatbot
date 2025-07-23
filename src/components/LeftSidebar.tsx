import { 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon, 
  Bars3Icon 
} from '@heroicons/react/24/outline';
import ThemeToggle from './ThemeToggle';

interface LeftSidebarProps {
  currentRoute: string;
  onTabChange: (tab: 'chats' | 'matters') => void;
  onOpenMenu?: () => void;
}

const LeftSidebar = ({ currentRoute, onTabChange, onOpenMenu }: LeftSidebarProps) => {
  return (
    <div className="left-sidebar">
      <div className="left-sidebar-content">
        {/* Top Section */}
        <div className="left-sidebar-top">
          {/* Chats Section */}
          <div className="left-sidebar-section">
            <div 
              className={`left-sidebar-header ${currentRoute === 'chats' ? 'active' : ''}`}
              onClick={() => onTabChange('chats')}
              title="Chats"
            >
              <ChatBubbleLeftRightIcon className="left-sidebar-icon" />
            </div>
          </div>

          {/* Matters Section */}
          <div className="left-sidebar-section">
            <div 
              className={`left-sidebar-header ${currentRoute === 'matters' ? 'active' : ''}`}
              onClick={() => onTabChange('matters')}
              title="Matters"
            >
              <DocumentTextIcon className="left-sidebar-icon" />
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