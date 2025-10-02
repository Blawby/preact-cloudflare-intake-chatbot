import { useState, useEffect, useCallback } from 'preact/hooks';
import { Button } from '../../ui/Button';
import { SettingsDropdown } from '../components/SettingsDropdown';
import { 
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  CpuChipIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  FilmIcon,
  TrashIcon,
  GlobeAltIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { useNavigation } from '../../../utils/navigation';
import { useToastContext } from '../../../contexts/ToastContext';
import { mockUserDataService, MockUserProfile, MockUserLinks, MockEmailSettings } from '../../../utils/mockUserData';

// Utility function for className merging (following codebase pattern)
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface AccountPageProps {
  isMobile?: boolean;
  onClose?: () => void;
  className?: string;
}

export const AccountPage = ({
  isMobile = false,
  onClose,
  className = ''
}: AccountPageProps) => {
  const { navigate } = useNavigation();
  const { showSuccess, showError } = useToastContext();
  const [links, setLinks] = useState<MockUserLinks | null>(null);
  const [emailSettings, setEmailSettings] = useState<MockEmailSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Load mock data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const linksData = mockUserDataService.getUserLinks();
        const emailData = mockUserDataService.getEmailSettings();
        setLinks(linksData);
        setEmailSettings(emailData);
      } catch (error) {
        console.error('Failed to load account data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleUpgrade = () => {
    showSuccess('Upgrade', 'Redirecting to upgrade page...');
    // Here you would redirect to the upgrade page
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      showSuccess('Account deletion', 'Account deletion process initiated. Check your email for confirmation.');
      // Here you would initiate the account deletion process
    }
  };

  const handleAddLinkedIn = () => {
    showSuccess('LinkedIn', 'Redirecting to LinkedIn connection...');
  };

  const handleAddGitHub = () => {
    showSuccess('GitHub', 'Redirecting to GitHub connection...');
  };

  const handleDomainChange = (domain: string) => {
    if (domain === 'verify-new') {
      // Handle "Verify new domain" option
      const newDomain = prompt('Enter the domain you want to verify:');
      if (newDomain) {
        const updatedLinks = mockUserDataService.setUserLinks({
          selectedDomain: newDomain,
          customDomains: [
            ...(links?.customDomains || []),
            {
              domain: newDomain,
              verified: false,
              verifiedAt: null
            }
          ]
        });
        setLinks(updatedLinks);
        showSuccess('Domain added', `Domain ${newDomain} has been added and is pending verification.`);
      }
    } else {
      const updatedLinks = mockUserDataService.setUserLinks({ selectedDomain: domain });
      setLinks(updatedLinks);
    }
  };

  const handleFeedbackEmailsChange = (checked: boolean) => {
    const updatedEmailSettings = mockUserDataService.setEmailSettings({ 
      receiveFeedbackEmails: checked 
    });
    setEmailSettings(updatedEmailSettings);
  };

  const features = [
    { icon: <SparklesIcon className="w-4 h-4" />, text: "GPT-5 with advanced reasoning" },
    { icon: <ChatBubbleLeftRightIcon className="w-4 h-4" />, text: "Expanded messaging and uploads" },
    { icon: <PhotoIcon className="w-4 h-4" />, text: "Expanded and faster image creation" },
    { icon: <CpuChipIcon className="w-4 h-4" />, text: "Expanded memory and context" },
    { icon: <Cog6ToothIcon className="w-4 h-4" />, text: "Expanded deep research and agent mode" },
    { icon: <UserGroupIcon className="w-4 h-4" />, text: "Projects, tasks, custom GPTs" },
    { icon: <FilmIcon className="w-4 h-4" />, text: "Sora video generation" },
    { icon: <CpuChipIcon className="w-4 h-4" />, text: "Codex agent" }
  ];

  if (loading) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Account
        </h1>
        <div className="border-t border-gray-200 dark:border-dark-border mt-4" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6">
        <div className="space-y-0">
          {/* Get ChatGPT Plus Section */}
          <div className="flex items-center justify-between py-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Get ChatGPT Plus
              </h3>
            </div>
            <div className="ml-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleUpgrade}
              >
                Upgrade
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border" />

          {/* Get everything in Free, and more Section */}
          <div className="py-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Get everything in Free, and more.
              </h3>
              <div className="space-y-2">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="text-gray-500 dark:text-gray-400">
                      {feature.icon}
                    </div>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border" />

          {/* Delete account Section */}
          <div className="flex items-center justify-between py-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Delete account
              </h3>
            </div>
            <div className="ml-4">
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 focus:ring-red-500"
              >
                Delete
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border" />

          {/* Links Section */}
          <div className="py-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Links
            </h3>
            
            {/* Domain Selector */}
            <SettingsDropdown
              label="Select a domain"
              value={links?.selectedDomain || 'Select a domain'}
              options={[
                { value: "Select a domain", label: "Select a domain" },
                { value: "whynot.earth", label: "whynot.earth" },
                { value: "example.com", label: "example.com" },
                ...(links?.customDomains?.map(domain => ({
                  value: domain.domain,
                  label: domain.domain
                })) || []),
                { value: "verify-new", label: "+ Verify new domain" }
              ]}
              onChange={handleDomainChange}
            />

            {/* LinkedIn */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-black rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">in</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-gray-100">LinkedIn</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddLinkedIn}
              >
                Add
              </Button>
            </div>

            {/* GitHub */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-500 dark:text-gray-400 fill-current">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </div>
                <span className="text-sm text-gray-900 dark:text-gray-100">GitHub</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddGitHub}
              >
                Add
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border" />

          {/* Email Section */}
          <div className="py-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Email
            </h3>
            
            {/* Email Address */}
            <div className="flex items-center gap-3 py-3">
              <EnvelopeIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {emailSettings?.email || 'chris@whynot.earth'}
              </span>
            </div>

            {/* Feedback Emails Checkbox */}
            <div className="flex items-center gap-3 py-3">
              <input
                type="checkbox"
                id="feedback-emails"
                checked={emailSettings?.receiveFeedbackEmails || false}
                onChange={(e) => handleFeedbackEmailsChange(e.currentTarget.checked)}
                className="w-4 h-4 text-accent-500 bg-transparent border-gray-300 dark:border-gray-600 rounded focus:ring-accent-500 focus:ring-2"
              />
              <label htmlFor="feedback-emails" className="text-sm text-gray-900 dark:text-gray-100 cursor-pointer">
                Receive feedback emails
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
