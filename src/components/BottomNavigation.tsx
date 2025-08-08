import { 
  ChatBubbleOvalLeftIcon
} from '@heroicons/react/24/outline';

interface BottomNavigationProps {
  activeTab: 'chats';
}

const BottomNavigation = ({ activeTab }: BottomNavigationProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 lg:hidden z-[1200]">
      <div className="flex items-center justify-center p-3">
        <button
          aria-label="Chats"
          className="flex items-center justify-center rounded-lg bg-accent-500 text-gray-900 dark:text-white hover:bg-accent-600 transition-colors leading-none p-0"
        >
          <ChatBubbleOvalLeftIcon className="w-6 h-6 block" />
        </button>
      </div>
    </div>
  );
};

export default BottomNavigation; 