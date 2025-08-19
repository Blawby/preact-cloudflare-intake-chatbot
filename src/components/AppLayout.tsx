import { FunctionComponent } from 'preact';
import { ErrorBoundary } from './ErrorBoundary';
import { TeamNotFound } from './TeamNotFound';
import LeftSidebar from './LeftSidebar';
import MobileSidebar from './MobileSidebar';
import MobileTopNav from './MobileTopNav';
import BottomNavigation from './BottomNavigation';
import MediaSidebar from './MediaSidebar';
import PrivacySupportSidebar from './PrivacySupportSidebar';
import TeamProfile from './TeamProfile';
import { features } from '../config/features';
import { ChatMessageUI } from '../../worker/types';
import { useEffect, useState } from 'preact/hooks';
import { useNavbarScroll } from '../hooks/useChatScroll';

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
  messages,
  onRequestConsultation,
  children
}) => {
  if (teamNotFound) {
    return <TeamNotFound teamId={teamId} onRetry={onRetryTeamConfig} />;
  }

  const { isNavbarVisible } = useNavbarScroll({ 
    threshold: 200, 
    debounceMs: 100
  });

  return (
    <div className="h-screen w-screen flex">
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
      <div className="w-80 bg-white dark:bg-dark-bg border-l border-gray-200 dark:border-dark-border overflow-y-auto hidden lg:block">
        <div className="p-6 text-gray-900 dark:text-white flex flex-col gap-6">
          <TeamProfile
            name={teamConfig.name}
            profileImage={teamConfig.profileImage}
            teamId={teamId}
            description={teamConfig.description}
            variant="sidebar"
            showVerified={true}
          />

          {/* Media Section */}
          <div className="border-t border-gray-200 dark:border-dark-border pt-4">
            <MediaSidebar messages={messages} />
          </div>

          {/* Privacy & Support Section */}
          <PrivacySupportSidebar onRequestConsultation={onRequestConsultation} />
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

      {/* Mobile Bottom Navigation */}
      {features.enableMobileBottomNav && (
        <BottomNavigation
          activeTab={currentTab}
        />
      )}

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
        messages={messages}
        onRequestConsultation={onRequestConsultation}
      />
    </div>
  );
};

export default AppLayout; 