import { 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon,
  EyeIcon
} from '@heroicons/react/24/solid';
import { Button } from './ui/Button';

interface BottomNavigationProps {
  activeTab: 'chats' | 'matters' | 'review';
  onTabChange: (tab: 'chats' | 'matters' | 'review') => void;
}

const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  return (
    <div className="mobile-bottom-nav">
      <Button
        variant="ghost"
        onClick={() => onTabChange('chats')}
        aria-label="Chats"
        className={`bottom-nav-item ${activeTab === 'chats' ? 'active' : ''}`}
      >
        <ChatBubbleLeftRightIcon className="bottom-nav-icon" />
        <span className="bottom-nav-label">Chats</span>
      </Button>
      
      <Button
        variant="ghost"
        onClick={() => onTabChange('matters')}
        aria-label="Matters"
        className={`bottom-nav-item ${activeTab === 'matters' ? 'active' : ''}`}
      >
        <DocumentTextIcon className="bottom-nav-icon" />
        <span className="bottom-nav-label">Matters</span>
      </Button>
      
      <Button
        variant="ghost"
        onClick={() => onTabChange('review')}
        aria-label="Review"
        className={`bottom-nav-item ${activeTab === 'review' ? 'active' : ''}`}
      >
        <EyeIcon className="bottom-nav-icon" />
        <span className="bottom-nav-label">Review</span>
      </Button>
    </div>
  );
};

export default BottomNavigation; 