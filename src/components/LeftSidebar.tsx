import { 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon, 
  Bars3Icon 
} from '@heroicons/react/24/solid';
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
            >
              <ChatBubbleLeftRightIcon className="left-sidebar-icon" />
              <span style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Chats</span>
            </div>
          </div>

          {/* Matters Section */}
          <div className="left-sidebar-section">
            <div 
              className={`left-sidebar-header ${currentRoute === 'matters' ? 'active' : ''}`}
              onClick={() => onTabChange('matters')}
            >
              <DocumentTextIcon className="left-sidebar-icon" />
              <span style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Matters</span>
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
            >
              <Bars3Icon className="left-sidebar-icon" />
              <span style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Menu</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar; 