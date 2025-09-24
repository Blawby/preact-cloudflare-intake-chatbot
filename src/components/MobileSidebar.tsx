import { FunctionComponent } from 'preact/compat';
import { Button } from './ui/Button';
import TeamProfile from './TeamProfile';
import MediaSidebar from './MediaSidebar';
import PrivacySupportSidebar from './PrivacySupportSidebar';
import { useConversationList } from '../hooks/useConversationList';
import { 
  XMarkIcon, 
  UserIcon, 
  PlusIcon, 
  ChatBubbleOvalLeftIcon,
  ClockIcon,
  DocumentTextIcon 
} from '@heroicons/react/24/outline';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentSessionId?: string;
  onSwitchConversation?: (sessionId: string) => void;
  onNewConversation?: () => void;
  teamConfig: {
    name: string;
    profileImage: string | null;
    teamId: string;
    description?: string;
  };
  messages: any[];
  onRequestConsultation?: () => void;
}

const MobileSidebar = ({ 
  isOpen, 
  onClose,
  currentSessionId,
  onSwitchConversation,
  onNewConversation,
  teamConfig, 
  messages,
  onRequestConsultation
}: MobileSidebarProps) => {
  // Get conversations for the current team
  const { conversations, isLoading, createNewConversation } = useConversationList({
    teamId: teamConfig?.teamId || 'blawby-ai',
    enabled: !!teamConfig?.teamId && isOpen
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
        onClose(); // Close mobile sidebar after creating new chat
      }
    } catch (error) {
      console.error('Failed to create new conversation:', error);
    }
  };

  const handleConversationSwitch = (sessionId: string) => {
    if (onSwitchConversation) {
      onSwitchConversation(sessionId);
    }
    onClose(); // Close mobile sidebar after switching
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
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Sidebar Panel */}
      <div className={`fixed top-0 right-0 w-[85%] max-w-[400px] h-full bg-white dark:bg-dark-bg border-l border-gray-200 dark:border-dark-border z-[2001] flex flex-col overflow-hidden transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg flex-shrink-0">
          				<h3 className="text-base sm:text-lg lg:text-xl font-semibold m-0 text-gray-900 dark:text-white">Menu</h3>
          <Button 
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close sidebar"
            className="flex items-center justify-center w-10 h-10 border-none bg-none text-gray-900 dark:text-white cursor-pointer rounded-md transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-dark-hover"
          >
            <XMarkIcon className="w-6 h-6" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          {/* Team Profile */}
          <div className="flex flex-col gap-3">
            <TeamProfile
              name={teamConfig.name}
              profileImage={teamConfig.profileImage}
              teamId={teamConfig.teamId}
              variant="sidebar"
              showVerified={true}
            />
          </div>

          {/* New Chat Button */}
          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={handleNewChat}
              icon={<PlusIcon className="w-4 h-4" />}
              className="w-full justify-center"
            >
              New Chat
            </Button>
          </div>

          {/* Conversations Section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Conversations</h3>
            
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-6">
                <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                  <ChatBubbleOvalLeftIcon className="w-8 h-8" />
                  <div className="text-sm">
                    <div className="font-medium">No conversations yet</div>
                    <div className="text-xs mt-1">Start a new chat to begin</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {conversations.slice(0, 5).map((conversation) => (
                  <button
                    key={conversation.sessionId}
                    onClick={() => handleConversationSwitch(conversation.sessionId)}
                    className={`w-full text-left p-3 rounded-lg transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-dark-hover ${
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

          {/* Request Consultation Button */}
          {onRequestConsultation && (
            <div className="flex flex-col gap-3">
              <Button
                onClick={onRequestConsultation}
                variant="secondary"
                size="lg"
                icon={<UserIcon className="w-4 h-4" />}
              >
                Find Lawyer
              </Button>
            </div>
          )}

          {/* Media Section */}
          <div className="flex flex-col gap-3">
            <MediaSidebar messages={messages} />
          </div>

          {/* Privacy & Support Section */}
          <div className="flex flex-col gap-3">
            <PrivacySupportSidebar />
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileSidebar; 