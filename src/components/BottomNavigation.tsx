import { 
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/solid';
import { Button } from './ui/Button';

interface BottomNavigationProps {
  activeTab: 'chats';
}

const BottomNavigation = ({ activeTab }: BottomNavigationProps) => {
  return (
    <div className="mobile-bottom-nav">
      <Button
        variant="ghost"
        aria-label="Chats"
        className={`bottom-nav-item ${activeTab === 'chats' ? 'active' : ''}`}
      >
        <ChatBubbleLeftRightIcon className="bottom-nav-icon" />
        <span className="bottom-nav-label">Chats</span>
      </Button>
    </div>
  );
};

export default BottomNavigation; 