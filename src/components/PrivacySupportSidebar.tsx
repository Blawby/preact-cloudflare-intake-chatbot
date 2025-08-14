import { 
  ShieldCheckIcon, 
  QuestionMarkCircleIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

interface PrivacySupportSidebarProps {
  className?: string;
}

const PrivacySupportSidebar = ({}: PrivacySupportSidebarProps) => {

  return (
    <div className="flex flex-col gap-6">

      {/* Privacy & Support Section */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs sm:text-sm lg:text-base font-semibold text-gray-900 dark:text-white">Privacy & Support</h4>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2">
            <a 
              href="https://blawby.com/privacy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-accent dark:hover:text-accent transition-colors duration-200"
            >
              <ShieldCheckIcon className="w-4 h-4" />
              Privacy Policy
              <ArrowTopRightOnSquareIcon className="w-3 h-3" />
            </a>
            <a 
              href="https://blawby.com/help" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-accent dark:hover:text-accent transition-colors duration-200"
            >
              <QuestionMarkCircleIcon className="w-4 h-4" />
              Help & Support
              <ArrowTopRightOnSquareIcon className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacySupportSidebar; 