import { 
  ShieldCheckIcon, 
  QuestionMarkCircleIcon,
  ArrowTopRightOnSquareIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface PrivacySupportSidebarProps {
  className?: string;
  onRequestConsultation?: () => void;
}

const PrivacySupportSidebar = ({ onRequestConsultation }: PrivacySupportSidebarProps) => {

  return (
    <div className="flex flex-col gap-6">
      {/* Request Consultation Section */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs sm:text-sm lg:text-base font-semibold text-gray-900 dark:text-white">Need Legal Help?</h4>
        <button
          onClick={onRequestConsultation}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent-dark text-white rounded-lg font-medium text-sm transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          <UserIcon className="w-4 h-4" />
          Request Consultation
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Ready to speak with a lawyer? Click above to start the consultation process.
        </p>
      </div>

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