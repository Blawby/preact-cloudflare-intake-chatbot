import { 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon, 
  Bars3Icon 
} from '@heroicons/react/24/solid';

const LeftSidebar = () => {
  return (
    <div className="left-sidebar">
      <div className="left-sidebar-content">
        {/* Top Section */}
        <div className="left-sidebar-top">
          {/* Chats Section */}
          <div className="left-sidebar-section">
            <div className="left-sidebar-header">
              <ChatBubbleLeftRightIcon className="left-sidebar-icon" />
              <span style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Chats</span>
            </div>
          </div>

          {/* Matters Section */}
          <div className="left-sidebar-section">
            <div className="left-sidebar-header">
              <DocumentTextIcon className="left-sidebar-icon" />
              <span style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Matters</span>
            </div>
          </div>
        </div>

        {/* Bottom Section - Menu */}
        <div className="left-sidebar-bottom">
          <div className="left-sidebar-section">
            <div className="left-sidebar-header">
              <Bars3Icon className="left-sidebar-icon" />
              <span style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Menu</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar; 