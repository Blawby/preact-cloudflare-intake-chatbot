export interface HelpPageProps {
  onClose?: () => void;
  className?: string;
}

export const HelpPage = ({ onClose, className = '' }: HelpPageProps) => {
  const handleExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleReportBug = () => {
    // Internal navigation to bug report page
    // For now, we'll just show an alert - this can be replaced with actual navigation
    alert('Bug report functionality will be implemented');
  };

  const handleKeyboardShortcuts = () => {
    // Internal navigation to keyboard shortcuts page
    // For now, we'll just show an alert - this can be replaced with actual navigation
    alert('Keyboard shortcuts functionality will be implemented');
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Help
        </h1>
        <div className="border-t border-gray-200 dark:border-dark-border mt-4" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6">
        <div className="space-y-0">
          {/* Help Center */}
          <div className="py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Help Center
              </div>
              <button
                onClick={() => handleExternalLink('https://help.blawby.com')}
                className="flex items-center gap-2 px-3 py-1 text-sm text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <span>Visit</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Get help and find answers to common questions
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-dark-border" />
          
          {/* Release Notes */}
          <div className="py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Release Notes
              </div>
              <button
                onClick={() => handleExternalLink('https://blawby.com/release-notes')}
                className="flex items-center gap-2 px-3 py-1 text-sm text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <span>View</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              See what's new in the latest updates
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-dark-border" />
          
          {/* Terms & Policies */}
          <div className="py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Terms & Policies
              </div>
              <button
                onClick={() => handleExternalLink('https://blawby.com/terms')}
                className="flex items-center gap-2 px-3 py-1 text-sm text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <span>Read</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Read our terms of service and privacy policy
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-dark-border" />
          
          {/* Report Bug */}
          <div className="py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Report Bug
              </div>
              <button
                onClick={handleReportBug}
                className="flex items-center gap-2 px-3 py-1 text-sm text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <span>Report</span>
              </button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Help us improve by reporting issues
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-dark-border" />
          
          {/* Download Apps */}
          <div className="py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Download Apps
              </div>
              <button
                onClick={() => handleExternalLink('https://blawby.com/download')}
                className="flex items-center gap-2 px-3 py-1 text-sm text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <span>Download</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Get our mobile and desktop applications
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-dark-border" />
          
          {/* Keyboard Shortcuts */}
          <div className="py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Keyboard Shortcuts
              </div>
              <button
                onClick={handleKeyboardShortcuts}
                className="flex items-center gap-2 px-3 py-1 text-sm text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <span>View</span>
              </button>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Learn keyboard shortcuts to work faster
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
