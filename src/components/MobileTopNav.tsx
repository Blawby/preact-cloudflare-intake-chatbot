import { Bars3Icon } from '@heroicons/react/24/outline';

interface MobileTopNavProps {
  teamConfig: {
    name: string;
    profileImage: string | null;
    teamId: string;
  };
  onOpenSidebar: () => void;
}

const MobileTopNav = ({ teamConfig, onOpenSidebar }: MobileTopNavProps) => {
  return (
    <div className="mobile-top-nav">
      {/* Team Profile Section */}
      <button 
        className="mobile-top-nav-profile"
        onClick={onOpenSidebar}
        aria-label="Open team menu"
      >
        <div className="mobile-top-nav-team">
          <img 
            src={teamConfig.profileImage || '/blawby-favicon-iframe.png'} 
            alt={teamConfig.name}
            className="mobile-top-nav-image"
          />
          <div className="mobile-top-nav-info">
            <span className="mobile-top-nav-name">{teamConfig.name}</span>
            <span className="mobile-top-nav-status">Online</span>
          </div>
        </div>
      </button>

      {/* Menu Button */}
      <button 
        className="mobile-top-nav-menu"
        onClick={onOpenSidebar}
        aria-label="Open menu"
      >
        <Bars3Icon className="w-6 h-6" />
      </button>
    </div>
  );
};

export default MobileTopNav; 