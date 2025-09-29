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
import MatterTab from './MatterTab';
import { useMatterState, MatterData } from '../hooks/useMatterState';
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
  children
}) => {
  // Matter state management
  const { matter, status: matterStatus } = useMatterState(chatMessages);
  
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
      {/* Left Sidebar - Fixed width, hidden on mobile */}
      {features.enableLeftSidebar && (
        <div className="w-20 overflow-y-auto hidden lg:block">
          <LeftSidebar
            currentRoute={currentTab}
            onOpenMenu={() => onToggleMobileSidebar(true)}
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

/**
 * Analyze matter content to identify missing information
 * Reused from MatterTab component logic
 */
function analyzeMissingInfo(matter: MatterData): string[] {
  const missingInfo: string[] = [];
  
  // Check if matter summary is empty or very basic
  if (!matter.matterSummary || matter.matterSummary.trim().length < 50) {
    missingInfo.push('Detailed matter description');
  }
  
  // Check for common missing fields based on service type
  const summaryLower = matter.matterSummary.toLowerCase();
  
  // Check for timeline information
  if (!summaryLower.includes('when') && !summaryLower.includes('date') && !summaryLower.includes('timeline')) {
    missingInfo.push('Timeline of events');
  }
  
  // Check for location information
  if (!summaryLower.includes('where') && !summaryLower.includes('location') && !summaryLower.includes('state')) {
    missingInfo.push('Location/venue information');
  }
  
  // Check for evidence/documentation
  if (!summaryLower.includes('document') && !summaryLower.includes('evidence') && !summaryLower.includes('proof')) {
    missingInfo.push('Supporting documents or evidence');
  }
  
  // Service-specific checks
  if (matter.service.toLowerCase().includes('family')) {
    if (!summaryLower.includes('child') && !summaryLower.includes('children') && !summaryLower.includes('custody')) {
      missingInfo.push('Information about children (if applicable)');
    }
    if (!summaryLower.includes('marriage') && !summaryLower.includes('divorce') && !summaryLower.includes('relationship')) {
      missingInfo.push('Relationship/marriage details');
    }
  }
  
  if (matter.service.toLowerCase().includes('employment')) {
    if (!summaryLower.includes('employer') && !summaryLower.includes('company') && !summaryLower.includes('work')) {
      missingInfo.push('Employer/company information');
    }
    if (!summaryLower.includes('termination') && !summaryLower.includes('fired') && !summaryLower.includes('laid off')) {
      missingInfo.push('Employment status details');
    }
  }
  
  if (matter.service.toLowerCase().includes('business')) {
    if (!summaryLower.includes('contract') && !summaryLower.includes('agreement')) {
      missingInfo.push('Contract or agreement details');
    }
    if (!summaryLower.includes('damage') && !summaryLower.includes('loss') && !summaryLower.includes('financial')) {
      missingInfo.push('Financial impact or damages');
    }
  }
  
  // Check answers for completeness
  if (matter.answers) {
    const answerValues = Object.values(matter.answers);
    const hasSubstantialAnswers = answerValues.some(answer => {
      if (typeof answer === 'string') {
        return answer.length > 20;
      }
      return false;
    });
    
    if (!hasSubstantialAnswers) {
      missingInfo.push('Detailed responses to questions');
    }
  }
  
  return missingInfo;
}

export default AppLayout; 