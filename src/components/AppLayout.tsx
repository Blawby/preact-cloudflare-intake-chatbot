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
import features from '../config/features';
import { ChatMessageUI } from '../../worker/types';

interface AppLayoutProps {
  teamNotFound: boolean;
  teamId: string;
  onRetryTeamConfig: () => void;
  currentTab: string;
  isMobileSidebarOpen: boolean;
  onToggleMobileSidebar: (open: boolean) => void;
  teamConfig: {
    name: string;
    profileImage: string | null;
    description?: string | null;
  };
  messages: ChatMessageUI[];
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
  children
}) => {
  if (teamNotFound) {
    return <TeamNotFound teamId={teamId} onRetry={onRetryTeamConfig} />;
  }

  return (
    <div id="app" className="h-screen w-screen">
      {/* Left Column */}
      {features.enableLeftSidebar && (
        <div className="grid-left bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border overflow-y-auto">
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

      {/* Center Column - Main Content */}
      <div className="grid-center bg-white dark:bg-dark-bg overflow-y-auto">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>

      {/* Right Column - Hidden on mobile, content moved to mobile sidebar */}
      <div className="grid-right bg-white dark:bg-dark-bg border-l border-gray-200 dark:border-dark-border overflow-y-auto hidden lg:block">
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
          <PrivacySupportSidebar />
        </div>
      </div>

      {/* Mobile Top Navigation */}
      <MobileTopNav
        teamConfig={{
          name: teamConfig.name,
          profileImage: teamConfig.profileImage,
          teamId: teamId,
          description: teamConfig.description
        }}
        onOpenSidebar={() => onToggleMobileSidebar(true)}
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
      />
    </div>
  );
};

export default AppLayout; 