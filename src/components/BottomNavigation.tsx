import { 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon
} from '@heroicons/react/24/solid';

interface BottomNavigationProps {
  activeTab: 'chats' | 'matters';
  onTabChange: (tab: 'chats' | 'matters') => void;
}

const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  return (
    <div className="mobile-bottom-nav">
      <button
        className={`bottom-nav-item ${activeTab === 'chats' ? 'active' : ''}`}
        onClick={() => onTabChange('chats')}
        aria-label="Chats"
      >
        <ChatBubbleLeftRightIcon className="bottom-nav-icon" />
        <span className="bottom-nav-label">Chats</span>
      </button>
      
      <button
        className={`bottom-nav-item ${activeTab === 'matters' ? 'active' : ''}`}
        onClick={() => onTabChange('matters')}
        aria-label="Matters"
      >
        <DocumentTextIcon className="bottom-nav-icon" />
        <span className="bottom-nav-label">Matters</span>
      </button>
      

    </div>
  );
};

export default BottomNavigation; 