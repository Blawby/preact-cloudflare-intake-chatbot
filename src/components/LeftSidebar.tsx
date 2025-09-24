import { 
  ChatBubbleOvalLeftIcon, 
  Bars3Icon,
  SunIcon,
  MoonIcon,
  PlusIcon,
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
import { useTheme } from '../hooks/useTheme';
import { useConversationList } from '../hooks/useConversationList';

interface LeftSidebarProps {
  currentRoute: string;
  currentSessionId?: string;
  onOpenMenu?: () => void;
  onGoToChats?: () => void;
  onSwitchConversation?: (sessionId: string) => void;
  onNewConversation?: () => void;
  teamConfig?: {
    name: string;
    profileImage: string | null;
    teamId: string;
  };
}

const LeftSidebar = ({ 
  currentRoute, 
  currentSessionId,
  onOpenMenu, 
  onGoToChats, 
  onSwitchConversation,
  onNewConversation,
  teamConfig 
}: LeftSidebarProps) => {
  const { isDark, toggleTheme } = useTheme();
  
  // Get conversations for the current team
  const effectiveTeamId = teamConfig?.teamId || 'blawby-ai';
  console.log('🔍 LeftSidebar: teamConfig:', teamConfig, 'effectiveTeamId:', effectiveTeamId);
  
  const { conversations, isLoading, createNewConversation } = useConversationList({
    teamId: effectiveTeamId,
    enabled: !!teamConfig?.teamId
  });

  const handleNewChat = async () => {
    try {
      const newSessionId = await createNewConversation();
      if (newSessionId && onNewConversation) {
        onNewConversation();
        // Switch to the new conversation
        if (onSwitchConversation) {
          onSwitchConversation(newSessionId);
        }
      }
    } catch (error) {
      console.error('Failed to create new conversation:', error);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Now';
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border">
      {/* Header with New Chat Button */}
      <div className="p-4 border-b border-gray-200 dark:border-dark-border">
        <Button
          variant="primary"
          size="sm"
          onClick={handleNewChat}
          icon={<PlusIcon className="w-4 h-4" />}
          className="w-full justify-center"
        >
          New Chat
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4">
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center">
            <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
              <ChatBubbleOvalLeftIcon className="w-8 h-8" />
              <div className="text-sm">
                <div className="font-medium">No conversations yet</div>
                <div className="text-xs mt-1">Start a new chat to begin</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.sessionId}
                onClick={() => onSwitchConversation?.(conversation.sessionId)}
                className={`w-full text-left p-3 rounded-lg transition-colors duration-200 mb-2 hover:bg-gray-100 dark:hover:bg-dark-hover ${
                  currentSessionId === conversation.sessionId 
                    ? 'bg-gray-100 dark:bg-dark-hover border border-gray-300 dark:border-dark-border' 
                    : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <DocumentTextIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {conversation.title}
                    </div>
                    {conversation.preview && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                        {conversation.preview}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <ClockIcon className="w-3 h-3" />
                      <span>{formatRelativeTime(conversation.updatedAt)}</span>
                      {conversation.messageCount > 0 && (
                        <span className="ml-auto">
                          {conversation.messageCount} msg{conversation.messageCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Section - Theme Toggle and Menu */}
      <div className="p-4 border-t border-gray-200 dark:border-dark-border">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            icon={isDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenMenu?.()}
            icon={<Bars3Icon className="w-4 h-4" />}
            title="Menu"
            aria-label="Open menu"
          />
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar; 