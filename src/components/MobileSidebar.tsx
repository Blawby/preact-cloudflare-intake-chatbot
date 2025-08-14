import { FunctionComponent } from 'preact/compat';
import { Button } from './ui/Button';
import TeamProfile from './TeamProfile';
import MediaSidebar from './MediaSidebar';
import PrivacySupportSidebar from './PrivacySupportSidebar';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
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
  teamConfig, 
  messages,
  onRequestConsultation
}: MobileSidebarProps) => {
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
              description={teamConfig.description}
              variant="sidebar"
              showVerified={true}
              onRequestConsultation={onRequestConsultation}
            />
          </div>

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