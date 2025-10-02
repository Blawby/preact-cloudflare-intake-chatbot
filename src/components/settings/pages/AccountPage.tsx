import { useState, useEffect } from 'preact/hooks';
import { Button } from '../../ui/Button';
import { SettingsDropdown } from '../components/SettingsDropdown';
import Modal from '../../Modal';
import { 
  EnvelopeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useToastContext } from '../../../contexts/ToastContext';
import { useNavigation } from '../../../utils/navigation';
import { mockUserDataService, MockUserLinks, MockEmailSettings, type SubscriptionTier } from '../../../utils/mockUserData';
import { mockPricingDataService } from '../../../utils/mockPricingData';


export interface AccountPageProps {
  isMobile?: boolean;
  onClose?: () => void;
  className?: string;
}

export const AccountPage = ({
  isMobile: _isMobile = false,
  onClose: _onClose,
  className = ''
}: AccountPageProps) => {
  const { showSuccess, showError } = useToastContext();
  const { navigate } = useNavigation();
  const [links, setLinks] = useState<MockUserLinks | null>(null);
  const [emailSettings, setEmailSettings] = useState<MockEmailSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // For demo purposes - change this to test different tiers: 'free', 'plus', 'business'
  const currentTier: SubscriptionTier = 'free';
  const currentPlanFeatures = mockPricingDataService.getFeaturesForTier(currentTier);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [domainError, setDomainError] = useState<string | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Extract data loading logic to eliminate duplication
  const loadAccountData = async () => {
    try {
      setError(null);
      setLoading(true);
      const linksData = mockUserDataService.getUserLinks();
      const emailData = mockUserDataService.getEmailSettings();
      
      setLinks(linksData);
      setEmailSettings(emailData);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load account data:', error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  // Load mock data
  useEffect(() => {
    loadAccountData();
  }, []);

  const handleUpgrade = () => {
    if (!currentTier) {
      showSuccess('Upgrade', 'Redirecting to upgrade page...');
      return;
    }
    const upgradePath = mockPricingDataService.getUpgradePath(currentTier);
    if (upgradePath.length > 0) {
      const nextTier = upgradePath[0];
      showSuccess('Upgrade', `Redirecting to upgrade to ${nextTier.name}...`);
    } else {
      showSuccess('Account', 'You are already on the highest tier!');
    }
    // Here you would redirect to the upgrade page
  };

  // Simple computed values for demo
  const upgradePath = mockPricingDataService.getUpgradePath(currentTier);
  const upgradeButtonText = upgradePath.length > 0 ? `Upgrade to ${upgradePath[0].name}` : 'Current Plan';
  const sectionTitle = currentTier === 'free' ? 'Get ChatGPT Plus' : 
                       currentTier === 'plus' ? 'Get ChatGPT Business' : 
                       'Current Plan';

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(true);
    setDeleteConfirmInput('');
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    const userEmail = emailSettings?.email || 'chris@whynot.earth';
    
    if (deleteConfirmInput.trim() !== userEmail) {
      setDeleteError('Please type your email address exactly as shown to confirm deletion.');
      return;
    }

    try {
      // Use the proper delete account method
      await mockUserDataService.deleteAccount();
      
      setShowDeleteConfirm(false);
      setDeleteConfirmInput('');
      setDeleteError(null);
      
      showSuccess('Account deleted', 'Your account has been permanently deleted.');
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('authStateChanged', { detail: null }));
      
      // Close the settings modal first
      if (_onClose) {
        _onClose();
      }
      
      // Navigate to root page after a short delay
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (_error) {
      setDeleteError('Failed to delete account. Please try again.');
      showError('Account deletion failed', 'There was an error deleting your account. Please try again.');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmInput('');
    setDeleteError(null);
  };

  // Domain validation function
  const validateDomain = (domain: string): string | null => {
    const trimmed = domain.trim();
    
    if (!trimmed) {
      return 'Domain cannot be empty';
    }
    
    if (trimmed !== domain) {
      return 'Domain cannot have leading or trailing spaces';
    }
    
    // Basic domain format validation regex
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(trimmed)) {
      return 'Please enter a valid domain format (e.g., example.com)';
    }
    
    // Check for duplicates (case-insensitive)
    const existingDomains = links?.customDomains?.map(d => d.domain.toLowerCase()) || [];
    if (existingDomains.includes(trimmed.toLowerCase())) {
      return 'This domain has already been added';
    }
    
    return null;
  };

  const handleOpenDomainModal = () => {
    setShowDomainModal(true);
    setDomainInput('');
    setDomainError(null);
  };

  const handleCloseDomainModal = () => {
    setShowDomainModal(false);
    setDomainInput('');
    setDomainError(null);
  };

  const handleDomainSubmit = () => {
    const error = validateDomain(domainInput);
    if (error) {
      setDomainError(error);
      showError('Invalid Domain', error);
      return;
    }

    const normalized = domainInput.trim().toLowerCase();
    const updatedLinks = mockUserDataService.setUserLinks({
      selectedDomain: normalized,
      customDomains: [
        ...(links?.customDomains || []),
        {
          domain: normalized,
          verified: false,
          verifiedAt: null
        }
      ]
    });
    
    setLinks(updatedLinks);
    handleCloseDomainModal();
    showSuccess('Domain added', `Domain ${normalized} has been added and is pending verification.`);
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
      handleOpenDomainModal();
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

  // Features are now loaded dynamically from the pricing service

  if (loading) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm font-medium">Failed to load account data</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{error}</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={loadAccountData}
          >
            Retry
          </Button>
        </div>
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
                {sectionTitle}
              </h3>
            </div>
            <div className="ml-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleUpgrade}
              >
                {upgradeButtonText}
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border" />

          {/* Plan Features Section */}
          <div className="py-3">
            <div className="space-y-2">
              {currentPlanFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="text-gray-500 dark:text-gray-400">
                    <feature.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {feature.text}
                  </span>
                </div>
              ))}
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
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={handleCancelDelete}
        title="Delete Account"
        showCloseButton={true}
        type="modal"
        disableBackdropClick={true}
      >
        <div 
          className="space-y-4" 
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
          role="presentation"
        >
          {/* Confirmation Content */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Are you sure you want to delete your account?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  This action cannot be undone. All your data, conversations, and settings will be permanently deleted.
                </p>
                <div 
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4" 
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
                  role="presentation"
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>This will permanently delete:</strong>
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                    <li>• All your conversations and chat history</li>
                    <li>• Your account settings and preferences</li>
                    <li>• Any uploaded files and documents</li>
                    <li>• Your subscription and billing information</li>
                  </ul>
                </div>
                
                {/* Confirmation Input */}
                <div 
                  className="space-y-2" 
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
                  role="presentation"
                >
                  <label htmlFor="delete-confirm" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                    To confirm, type your email address: <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{emailSettings?.email || 'chris@whynot.earth'}</span>
                  </label>
                  <input
                    id="delete-confirm"
                    type="text"
                    value={deleteConfirmInput}
                    onChange={(e) => {
                      setDeleteConfirmInput(e.currentTarget.value);
                      setDeleteError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleConfirmDelete();
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    onFocus={(e) => {
                      e.stopPropagation();
                    }}
                    placeholder="Type your email address here"
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                      deleteError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                    }`}
                  />
                  {deleteError && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {deleteError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div 
            className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700" 
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
            role="presentation"
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancelDelete}
              className="min-w-[80px]"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={deleteConfirmInput.trim() !== (emailSettings?.email || 'chris@whynot.earth')}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 focus:ring-red-500 min-w-[80px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>

      {/* Domain Input Modal */}
      <Modal
        isOpen={showDomainModal}
        onClose={handleCloseDomainModal}
        title="Add New Domain"
        showCloseButton={true}
        type="modal"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="domain-input" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Domain
            </label>
            <input
              id="domain-input"
              type="text"
              value={domainInput}
              onChange={(e) => {
                setDomainInput(e.currentTarget.value);
                setDomainError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleDomainSubmit();
                }
              }}
              placeholder="example.com"
              className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 ${
                domainError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
              }`}
            />
            {domainError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {domainError}
              </p>
            )}
          </div>
          
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCloseDomainModal}
              className="min-w-[80px]"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDomainSubmit}
              className="min-w-[80px]"
            >
              Add Domain
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
