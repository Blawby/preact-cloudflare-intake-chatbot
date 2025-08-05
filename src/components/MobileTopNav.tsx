import { Bars3Icon } from '@heroicons/react/24/outline';
import ThemeToggle from './ThemeToggle';
import { Button } from './ui/Button';

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
      <Button 
        variant="ghost"
        onClick={onOpenSidebar}
        aria-label="Open team menu"
        className="mobile-top-nav-profile"
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
      </Button>

      {/* Theme Toggle Button */}
      <ThemeToggle />

      {/* Menu Button */}
      <Button 
        variant="ghost"
        onClick={onOpenSidebar}
        aria-label="Open menu"
        className="mobile-top-nav-menu"
      >
        <Bars3Icon className="w-6 h-6" />
      </Button>
    </div>
  );
};

export default MobileTopNav; 