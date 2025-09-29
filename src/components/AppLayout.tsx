import { FunctionComponent } from 'preact';
import { ErrorBoundary } from './ErrorBoundary';
import { TeamNotFound } from './TeamNotFound';
import LeftSidebar from './LeftSidebar';
import MobileSidebar from './MobileSidebar';
import MobileTopNav from './MobileTopNav';
import MediaSidebar from './MediaSidebar';
import PrivacySupportSidebar from './PrivacySupportSidebar';
import TeamProfile from './TeamProfile';
import { DebugOverlay } from './DebugOverlay';
import { features } from '../config/features';
import { ChatMessageUI } from '../../worker/types';
import { useEffect, useState } from 'preact/hooks';
import { useNavbarScroll } from '../hooks/useChatScroll';
import { UserIcon } from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/Accordian';
import ActivityTimeline from './ActivityTimeline';

// Simple messages object for localization
const messages = {
  findLawyer: 'Find Lawyer'
};

interface AppLayoutProps {
  teamNotFound: boolean;
  teamId: string;
  onRetryTeamConfig: () => void;
  currentTab: 'chats';
  isMobileSidebarOpen: boolean;
  onToggleMobileSidebar: (open: boolean) => void;
  teamConfig: {
    name: string;
    profileImage: string | null;
    description?: string | null;
  };
  messages: ChatMessageUI[];
  onRequestConsultation?: () => void | Promise<void>;
  children: any; // ChatContainer component
}

const AppLayout: FunctionComponent<AppLayoutProps> = ({
  teamNotFound,
  teamId,
  onRetryTeamConfig,
  currentTab,
  isMobileSidebarOpen,
  onToggleMobileSidebar,
  teamConfig,
  messages: chatMessages,
  onRequestConsultation,
  children
}) => {
  if (teamNotFound) {
    return <TeamNotFound teamId={teamId} onRetry={onRetryTeamConfig} />;
  }

  const { isNavbarVisible } = useNavbarScroll({ 
    threshold: 50, 
    debounceMs: 0
  });

  // Async-safe wrapper for consultation request
  const handleRequestConsultation = async () => {
    if (!onRequestConsultation) return;
    
    try {
      await onRequestConsultation();
    } catch (error) {
      console.error('Error requesting consultation:', error);
      // Surface error to user - could be enhanced with a toast notification
      // For now, just log to console
    }
  };

  return (
    <div className="max-md:h-[100dvh] md:h-screen w-full flex">
      {/* Left Sidebar - Fixed width, hidden on mobile */}
      {features.enableLeftSidebar && (
        <div className="w-20 bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border overflow-y-auto hidden lg:block">
          <LeftSidebar
            currentRoute={currentTab}
            onOpenMenu={() => onToggleMobileSidebar(true)}
            teamConfig={{
              name: teamConfig.name,
              profileImage: teamConfig.profileImage,
              teamId: teamId
            }}
          />
        </div>
      )}

      {/* Main Content Area - Flex grow, full width on mobile */}
      <div className="flex-1 bg-white dark:bg-dark-bg overflow-y-auto">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>

      {/* Right Sidebar - Fixed width, hidden on mobile */}
      <div className="w-80 bg-white dark:bg-dark-bg border-l border-gray-200 dark:border-dark-border overflow-y-auto scrollbar-hide hidden lg:block">
        <div className="p-6 text-gray-900 dark:text-white flex flex-col gap-6">
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
          <ActivityTimeline />

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
          teamId: teamId,
          description: teamConfig.description
        }}
        onOpenSidebar={() => onToggleMobileSidebar(true)}
        isVisible={isNavbarVisible}
      />

      {/* Mobile Bottom Navigation - Removed to fix scrolling issues */}

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => onToggleMobileSidebar(false)}
        teamConfig={{
          name: teamConfig.name,
          profileImage: teamConfig.profileImage,
          teamId: teamId,
          description: teamConfig.description
        }}
        messages={chatMessages}
        onRequestConsultation={onRequestConsultation}
      />

      {/* Debug Overlay - Only in development */}
      {import.meta.env.MODE === 'development' && (
        <DebugOverlay isVisible={true} />
      )}
    </div>
  );
};

export default AppLayout; 