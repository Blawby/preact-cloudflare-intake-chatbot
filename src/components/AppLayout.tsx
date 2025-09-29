import { FunctionComponent, useRef, useEffect } from 'preact';
import { ErrorBoundary } from './ErrorBoundary';
import { TeamNotFound } from './TeamNotFound';
import LeftSidebar from './LeftSidebar';
import MobileTopNav from './MobileTopNav';
import MediaSidebar from './MediaSidebar';
import PrivacySupportSidebar from './PrivacySupportSidebar';
import TeamProfile from './TeamProfile';
import { DebugOverlay } from './DebugOverlay';
import { features } from '../config/features';
import { ChatMessageUI, FileAttachment } from '../../worker/types';
import { useNavbarScroll } from '../hooks/useChatScroll';
import { UserIcon } from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
import ActivityTimeline from './ActivityTimeline';
import MatterTab from './MatterTab';
import { useMatterState } from '../hooks/useMatterState';
import { analyzeMissingInfo } from '../utils/matterAnalysis';

// Simple messages object for localization
const messages = {
  findLawyer: 'Find Lawyer'
};

interface AppLayoutProps {
  teamNotFound: boolean;
  teamId: string;
  onRetryTeamConfig: () => void;
  currentTab: 'chats' | 'matter';
  onTabChange: (tab: 'chats' | 'matter') => void;
  isMobileSidebarOpen: boolean;
  onToggleMobileSidebar: (open: boolean) => void;
  teamConfig: {
    name: string;
    profileImage: string | null;
    description?: string | null;
  };
  messages: ChatMessageUI[];
  onRequestConsultation?: () => void | Promise<void>;
  onSendMessage?: (message: string) => void;
  onUploadDocument?: (files: File[], metadata?: { documentType?: string; matterId?: string }) => Promise<FileAttachment[]>;
  children: React.ReactNode; // ChatContainer component
}

const AppLayout: FunctionComponent<AppLayoutProps> = ({
  teamNotFound,
  teamId,
  onRetryTeamConfig,
  currentTab,
  onTabChange,
  isMobileSidebarOpen,
  onToggleMobileSidebar,
  teamConfig,
  messages: chatMessages,
  onRequestConsultation,
  onSendMessage,
  onUploadDocument,
  children
}) => {
  // Matter state management
  const { matter, status: matterStatus } = useMatterState(chatMessages);
  
  // Focus management for mobile sidebar
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const mobileSidebarRef = useRef<HTMLDivElement>(null);
  
  // Handle focus management when mobile sidebar opens/closes
  useEffect(() => {
    if (isMobileSidebarOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Focus the first interactive element in the sidebar after a brief delay
      // to ensure the sidebar is fully rendered
      setTimeout(() => {
        const firstButton = mobileSidebarRef.current?.querySelector('button');
        if (firstButton) {
          firstButton.focus();
        }
      }, 100);
    } else if (previousActiveElement.current) {
      // Restore focus to the previously focused element when sidebar closes
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isMobileSidebarOpen]);
  
  // Tab switching handlers
  const handleGoToChats = () => {
    onTabChange('chats');
  };

  // Enhanced handler for continuing in chat with context
  const handleContinueInChat = () => {
    // Switch to chat tab first
    onTabChange('chats');
    
    // If we have missing information and can send a message, provide context
    if (matter && matterStatus === 'incomplete' && onSendMessage) {
      // Analyze what's missing to provide helpful context
      const missingInfo = analyzeMissingInfo(matter);
      
      if (missingInfo.length > 0) {
        // Create a contextual message to help the agent guide the user
        const contextMessage = `I need help completing my ${matter.service} matter. I'm missing some information: ${missingInfo.slice(0, 3).join(', ')}${missingInfo.length > 3 ? `, and ${missingInfo.length - 3} more items` : ''}. Can you help me provide the missing details?`;
        
        // Send the message after a short delay to ensure the chat tab is loaded
        setTimeout(() => {
          onSendMessage(contextMessage);
        }, 100);
      }
    }
  };
  
  const handleGoToMatter = () => {
    onTabChange('matter');
  };
  const { isNavbarVisible } = useNavbarScroll({ 
    threshold: 50, 
    debounceMs: 0
  });

  if (teamNotFound) {
    return <TeamNotFound teamId={teamId} onRetry={onRetryTeamConfig} />;
  }

  // Async-safe wrapper for consultation request
  const handleRequestConsultation = async () => {
    if (!onRequestConsultation) return;
    
    try {
      await onRequestConsultation();
    } catch (_error) {
      // Surface error to user - could be enhanced with a toast notification
      // For now, silently handle the error
      // console.error('Error requesting consultation:', _error);
    }
  };

  return (
    <div className="max-md:h-[100dvh] md:h-screen w-full flex bg-white dark:bg-dark-bg">
      {/* Left Sidebar - Desktop: always visible, Mobile: slide-out */}
      {features.enableLeftSidebar && (
        <>
          {/* Desktop Sidebar */}
          <div className="overflow-y-auto hidden lg:block">
            <LeftSidebar
              currentRoute={currentTab}
              onGoToChats={handleGoToChats}
              onGoToMatter={handleGoToMatter}
              matterStatus={matterStatus}
              teamConfig={{
                name: teamConfig.name,
                profileImage: teamConfig.profileImage,
                teamId
              }}
            />
          </div>
          
          {/* Mobile Sidebar - Conditionally rendered for accessibility */}
          {isMobileSidebarOpen && (
            <div ref={mobileSidebarRef} className="fixed inset-0 z-[2000] lg:hidden">
              {/* Overlay */}
              <button 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm w-full h-full focus:outline-none focus:ring-2 focus:ring-accent-500"
                onClick={() => onToggleMobileSidebar(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleMobileSidebar(false);
                  }
                }}
                aria-label="Close mobile sidebar"
                type="button"
              />
              {/* Sidebar */}
              <div className="relative w-64 h-full overflow-y-auto overscroll-contain bg-light-card-bg dark:bg-dark-card-bg">
                <LeftSidebar
                  currentRoute={currentTab}
                  onGoToChats={() => {
                    handleGoToChats();
                    onToggleMobileSidebar(false);
                  }}
                  onGoToMatter={() => {
                    handleGoToMatter();
                    onToggleMobileSidebar(false);
                  }}
                  matterStatus={matterStatus}
                  teamConfig={{
                    name: teamConfig.name,
                    profileImage: teamConfig.profileImage,
                    teamId
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Main Content Area - Flex grow, full width on mobile */}
      <div className="flex-1 bg-white dark:bg-dark-bg overflow-y-auto">
        <ErrorBoundary>
          {currentTab === 'chats' ? children : (
            <div className="h-full">
              <MatterTab
                matter={matter}
                status={matterStatus}
                onStartChat={handleGoToChats}
                onViewInChat={handleContinueInChat}
                onPayNow={() => {/* TODO: Implement payment flow */}}
                onViewPDF={() => {/* TODO: Implement PDF viewing */}}
                onShareMatter={() => {/* TODO: Implement matter sharing */}}
                onUploadDocument={onUploadDocument}
              />
            </div>
          )}
        </ErrorBoundary>
      </div>

      {/* Right Sidebar - Fixed width, hidden on mobile */}
      <div className="w-80 overflow-y-auto scrollbar-hide hidden lg:block p-2">
        <div className="bg-light-card-bg dark:bg-dark-card-bg rounded-lg p-6 text-gray-900 dark:text-white flex flex-col gap-6 h-full">
          <TeamProfile
            name={teamConfig.name}
            profileImage={teamConfig.profileImage}
            teamId={teamId}
            description={teamConfig.description}
            variant="sidebar"
            showVerified={true}
          />

          {/* Request Consultation Button - Primary Action */}
          {onRequestConsultation && (
            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={handleRequestConsultation}
                variant="primary"
                type="button"
                icon={<UserIcon className="w-4 h-4" />}
              >
                {messages.findLawyer}
              </Button>
            </div>
          )}

          {/* Activity Timeline Section */}
          <ActivityTimeline teamId={teamId} />

          {/* Media Section */}
          <MediaSidebar messages={chatMessages} />

          {/* Privacy & Support Section */}
          <PrivacySupportSidebar />
        </div>
      </div>


      <MobileTopNav
        teamConfig={{
          name: teamConfig.name,
          profileImage: teamConfig.profileImage,
          teamId,
          description: teamConfig.description
        }}
        onOpenSidebar={() => onToggleMobileSidebar(true)}
        isVisible={isNavbarVisible}
      />

      {/* Debug Overlay - Only when explicitly enabled */}
      {import.meta.env.VITE_DEBUG_OVERLAY === 'true' && (
        <DebugOverlay isVisible={true} />
      )}
    </div>
  );
};


export default AppLayout; 