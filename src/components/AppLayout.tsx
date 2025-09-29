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
import { useNavbarScroll } from '../hooks/useChatScroll';
import { UserIcon } from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
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
  children: React.ReactNode; // ChatContainer component
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
    } catch (error) {
      // Surface error to user - could be enhanced with a toast notification
      // For now, silently handle the error
      console.error('Error requesting consultation:', error);
    }
  };

  return (
    <div className="max-md:h-[100dvh] md:h-screen w-full flex bg-white dark:bg-dark-bg">
      {/* Left Sidebar - Fixed width, hidden on mobile */}
      {features.enableLeftSidebar && (
        <div className="w-20 overflow-y-auto hidden lg:block">
          <LeftSidebar
            currentRoute={currentTab}
            onOpenMenu={() => onToggleMobileSidebar(true)}
            teamConfig={{
              name: teamConfig.name,
              profileImage: teamConfig.profileImage,
              teamId
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
          teamId,
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
          teamId,
          description: teamConfig.description
        }}
        messages={chatMessages}
        onRequestConsultation={onRequestConsultation}
      />

      {/* Debug Overlay - Only when explicitly enabled */}
      {import.meta.env.VITE_DEBUG_OVERLAY === 'true' && (
        <DebugOverlay isVisible={true} />
      )}
    </div>
  );
};

export default AppLayout; 