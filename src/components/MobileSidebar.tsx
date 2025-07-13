import { XMarkIcon } from '@heroicons/react/24/outline';
import TeamProfile from './TeamProfile';
import MatterCanvas from './MatterCanvas';
import MediaSidebar from './MediaSidebar';
import PrivacySupportSidebar from './PrivacySupportSidebar';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  teamConfig: {
    name: string;
    profileImage: string | null;
    teamId: string;
  };
  sidebarMatter: {
    matterId?: string;
    matterNumber?: string;
    service: string;
    matterSummary: string;
    qualityScore?: any;
    answers?: Record<string, string>;
  } | null;
  messages: any[];
  onViewMatter: () => void;
}

const MobileSidebar = ({ 
  isOpen, 
  onClose, 
  teamConfig, 
  sidebarMatter, 
  messages, 
  onViewMatter 
}: MobileSidebarProps) => {
  return (
    <>
      {/* Overlay */}
      <div 
        className={`mobile-sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Sidebar Panel */}
      <div className={`mobile-sidebar-panel ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="mobile-sidebar-header">
          <h3 className="mobile-sidebar-title">Menu</h3>
          <button 
            className="mobile-sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="mobile-sidebar-content">
          {/* Team Profile */}
          <div className="mobile-sidebar-section">
            <TeamProfile
              name={teamConfig.name}
              profileImage={teamConfig.profileImage}
              teamId={teamConfig.teamId}
              variant="sidebar"
              showVerified={true}
            />
          </div>

          {/* Actions Row */}
          <div className="mobile-sidebar-section">
            <div className="team-actions">
              <button 
                className="action-button view-matter-button"
                onClick={onViewMatter}
                title={sidebarMatter ? "View matter details" : "Create a new matter"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {sidebarMatter ? 'View Matter' : 'Create Matter'}
              </button>
            </div>
          </div>

          {/* Matter Canvas */}
          {sidebarMatter && (
            <div className="mobile-sidebar-section">
              <h4 className="section-title">
                {sidebarMatter.matterNumber ? `Matter ${sidebarMatter.matterNumber}` : 'Case Summary'}
              </h4>
              <div className="section-content">
                <MatterCanvas
                  matterId={sidebarMatter.matterId}
                  matterNumber={sidebarMatter.matterNumber}
                  service={sidebarMatter.service}
                  matterSummary={sidebarMatter.matterSummary}
                  qualityScore={sidebarMatter.qualityScore}
                  answers={sidebarMatter.answers}
                />
              </div>
            </div>
          )}

          {/* Media Section */}
          <div className="mobile-sidebar-section">
            <MediaSidebar messages={messages} />
          </div>

          {/* Privacy & Support Section */}
          <div className="mobile-sidebar-section">
            <PrivacySupportSidebar />
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileSidebar; 