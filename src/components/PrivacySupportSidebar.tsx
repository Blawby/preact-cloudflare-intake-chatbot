import { 
  ShieldCheckIcon, 
  QuestionMarkCircleIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

interface PrivacySupportSidebarProps {
  className?: string;
}

const PrivacySupportSidebar = () => {
  return (
    <div className="team-section">
      <h4 className="section-title">Privacy & Support</h4>
      <div className="section-content">
        <div className="privacy-support-links">
          <a 
            href="https://blawby.com/privacy" 
            target="_blank" 
            rel="noopener noreferrer"
            className="privacy-support-link"
          >
            Privacy Policy
          </a>
          <a 
            href="https://blawby.com/help" 
            target="_blank" 
            rel="noopener noreferrer"
            className="privacy-support-link"
          >
            Help & Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default PrivacySupportSidebar; 