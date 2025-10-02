import {
  ChatBubbleOvalLeftEllipsisIcon,
  DocumentIcon,
  Bars3Icon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { Button } from './ui/Button';
import { useState } from 'preact/hooks';
import { MatterStatus } from '../types/matter';
import UserProfile from './UserProfile';

interface LeftSidebarProps {
  currentRoute: string;
  onGoToChats?: () => void;
  onGoToMatter?: () => void;
  onClose?: () => void;
  matterStatus?: MatterStatus;
  teamConfig?: {
    name: string;
    profileImage: string | null;
    teamId: string;
  };
}

const LeftSidebar = ({ currentRoute, onGoToChats, onGoToMatter, onClose, matterStatus, teamConfig }: LeftSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // On mobile, always show expanded (no collapse functionality)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const shouldShowCollapsed = isCollapsed && !isMobile;

  // Get badge color based on matter status
  const getBadgeColor = (status?: MatterStatus) => {
    switch (status) {
      case 'ready':
        return 'bg-green-500';
      case 'incomplete':
        return 'bg-orange-500';
      case 'empty':
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="h-full">
      <div className={`flex flex-col h-full bg-light-card-bg dark:bg-dark-card-bg transition-all duration-300 ${shouldShowCollapsed ? 'w-12' : 'w-58'}`}>
      {/* Header Section - Logo and Hamburger Bars3Icon */}
      <div className={`flex items-center border-b border-gray-200 dark:border-dark-border px-3 py-2 ${shouldShowCollapsed ? 'justify-center' : 'justify-between'}`}>
        {shouldShowCollapsed ? (
          /* Collapsed state - Logo with hover hamburger menu */
          <div className="relative group w-full h-10 flex items-center justify-center">
            {teamConfig?.profileImage && (
              <button
                onClick={() => setIsCollapsed(false)}
                className="w-8 h-8 rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-accent-500"
                title="Click to expand sidebar"
                aria-label="Expand sidebar"
              >
                <img 
                  src={teamConfig.profileImage} 
                  alt={teamConfig.name}
                  className="w-full h-full object-cover"
                />
              </button>
            )}
            {/* Hamburger menu appears on hover in same container */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(false)}
                icon={<Bars3Icon className="w-4 h-4" />}
                aria-label="Expand sidebar"
                className="w-8 h-8 p-0"
              />
            </div>
          </div>
        ) : (
          /* Expanded state - Logo and close/collapse button */
          <>
            {teamConfig?.profileImage && (
              <img 
                src={teamConfig.profileImage} 
                alt={teamConfig.name}
                className="w-8 h-8 rounded-lg object-cover"
              />
            )}
            {onClose ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                icon={<XMarkIcon className="w-5 h-5" />}
                aria-label="Close sidebar"
                className="w-8 h-8 p-0"
              />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(true)}
                icon={<Bars3Icon className="w-5 h-5" />}
                aria-label="Collapse sidebar"
                className="w-8 h-8 p-0"
              />
            )}
          </>
        )}
      </div>

      {/* Navigation Section */}
      <div className={`flex-1 p-2`}>
        <div className="flex flex-col gap-2">
          {/* Chats Navigation */}
          <button
            onClick={onGoToChats || (() => {})}
            className={`flex items-center w-full rounded-lg text-left transition-colors ${
              shouldShowCollapsed 
                ? 'justify-center py-2' 
                : 'gap-2 px-2 py-2'
            } ${
              currentRoute === 'chats' 
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' 
                : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-dark-hover'
            }`}
            aria-current={currentRoute === 'chats' ? 'page' : undefined}
            title={shouldShowCollapsed ? 'Chats' : undefined}
          >
            <ChatBubbleOvalLeftEllipsisIcon className={`flex-shrink-0 ${shouldShowCollapsed ? 'w-5 h-5' : 'w-5 h-5'}`} />
            {!shouldShowCollapsed && <span className="text-sm font-medium">Chats</span>}
          </button>

          {/* Matter Navigation */}
          <div className="relative">
            <button
              onClick={onGoToMatter || (() => {})}
              className={`flex items-center w-full rounded-lg text-left transition-colors ${
                shouldShowCollapsed 
                  ? 'justify-center py-2' 
                  : 'gap-2 px-2 py-2'
              } ${
                currentRoute === 'matter' 
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' 
                  : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-dark-hover'
              }`}
              aria-current={currentRoute === 'matter' ? 'page' : undefined}
              aria-label={`Matter${matterStatus ? `, ${matterStatus}` : ''}`}
              title={shouldShowCollapsed ? 'Matter' : undefined}
            >
              <DocumentIcon className="w-5 h-5 flex-shrink-0" />
              {!shouldShowCollapsed && <span className="text-sm font-medium">Matter</span>}
            </button>
            {/* Badge indicator */}
            {matterStatus && matterStatus !== 'empty' && (
              <div className={`absolute ${shouldShowCollapsed ? 'top-1 right-1' : 'top-1 right-1'} w-2 h-2 rounded-full ${getBadgeColor(matterStatus)}`} aria-hidden="true" />
            )}
          </div>

        </div>
      </div>

      {/* User Profile Section */}
      <UserProfile isCollapsed={shouldShowCollapsed} />
    </div>
    </div>
  );
};

export default LeftSidebar; 