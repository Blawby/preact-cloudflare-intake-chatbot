import { useState, useEffect, useRef } from 'preact/hooks';
import { Button } from '../../ui/Button';
import { Select, FormLabel, FormControl, SectionDivider } from '../../ui';
import { FormItem } from '../../ui/form';
import Modal from '../../Modal';
import { 
  EnvelopeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useToastContext } from '../../../contexts/ToastContext';
import { useNavigation } from '../../../utils/navigation';
import { mockUserDataService, MockUserLinks, MockEmailSettings, type SubscriptionTier } from '../../../utils/mockUserData';
import { mockPricingDataService } from '../../../utils/mockPricingData';
import { useTranslation } from 'react-i18next';


export interface AccountPageProps {
  isMobile?: boolean;
  onClose?: () => void;
  className?: string;
}

const DOMAIN_SELECT_VALUE = '__select__';

export const AccountPage = ({
  isMobile: _isMobile = false,
  onClose: _onClose,
  className = ''
}: AccountPageProps) => {
  const { showSuccess, showError } = useToastContext();
  const { navigate } = useNavigation();
  const { t } = useTranslation(['settings', 'common']);
  const [links, setLinks] = useState<MockUserLinks | null>(null);
  const [emailSettings, setEmailSettings] = useState<MockEmailSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [domainError, setDomainError] = useState<string | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Ref to store verification timeout ID for cleanup
  const verificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Extract data loading logic to eliminate duplication
  const loadAccountData = async () => {
    try {
      setError(null);
      setLoading(true);
      const linksData = mockUserDataService.getUserLinks();
      const emailData = mockUserDataService.getEmailSettings();
      const profile = mockUserDataService.getUserProfile();
      
      
      setLinks(linksData);
      setEmailSettings(emailData);
      setCurrentTier(profile.subscriptionTier);
    } catch (error) {
       
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

  // Cleanup verification timeout on unmount
  useEffect(() => {
    return () => {
      if (verificationTimeoutRef.current !== null) {
        clearTimeout(verificationTimeoutRef.current);
      }
    };
  }, []);


  // Listen for auth state changes to update tier
  useEffect(() => {
    const handleAuthStateChange = () => {
      loadAccountData();
    };

    window.addEventListener('authStateChanged', handleAuthStateChange);
    
    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange);
    };
  }, []);

  // Simple computed values for demo - only compute when currentTier is available
  const upgradePath = currentTier ? mockPricingDataService.getUpgradePath(currentTier) : [];
  const upgradeButtonText = currentTier && upgradePath.length > 0
    ? t('settings:account.plan.upgradeButton', { plan: upgradePath[0].name })
    : t('settings:account.plan.currentButton');
  const currentPlanFeatures = currentTier ? mockPricingDataService.getFeaturesForTier(currentTier) : [];
  const emailFallback = t('settings:account.email.addressFallback');
  const emailAddress = emailSettings?.email || emailFallback;
  const customDomainOptions = (links?.customDomains || []).map(domain => ({
    value: domain.domain,
    label: domain.domain
  }));
  const deleteListItems = t('settings:account.delete.listItems', { returnObjects: true }) as string[];
  const confirmLabel = t('settings:account.delete.confirmLabel', { email: emailAddress });
  const selectedDomain = links?.selectedDomain && links.selectedDomain !== 'Select a domain'
    ? links.selectedDomain
    : DOMAIN_SELECT_VALUE;

  const handleUpgrade = () => {
    if (!currentTier) {
      showSuccess(
        t('settings:account.plan.toasts.upgrade.title'),
        t('settings:account.plan.toasts.upgrade.body')
      );
      return;
    }
    if (upgradePath.length > 0) {
      const nextTier = upgradePath[0];
      
      if (nextTier.id === 'business' || nextTier.id === 'business-plus') {
        // Get the plan data to use its productId and priceId
        const allPlans = mockPricingDataService.getPricingPlans();
        const selectedPlan = allPlans.find(plan => plan.id === nextTier.id);
        
        // Use plan properties with safe fallbacks
        const productId = selectedPlan?.productId || 'prod_business';
        const priceId = selectedPlan?.priceId || 'price_monthly';
        
        // Navigate to cart for business upgrades
        try {
          localStorage.setItem('cartData', JSON.stringify({
            product_id: productId,
            price_id: priceId,
            quantity: 2
          }));
        } catch (error) {
          console.error('Failed to save cart data to localStorage:', error);
          showError(
            t('settings:account.plan.toasts.cartSaveError.title'),
            t('settings:account.plan.toasts.cartSaveError.body')
          );
          // Fallback: navigate with query params instead of localStorage
          navigate(`/cart?product_id=${productId}&price_id=${priceId}&quantity=2`);
          return;
        }
        navigate('/cart');
      } else {
        // Handle plus tier upgrade (mock for now)
        const profile = mockUserDataService.getUserProfile();
        const updatedProfile = { ...profile, subscriptionTier: nextTier.id as SubscriptionTier };
        mockUserDataService.setUserProfile(updatedProfile);
        
        // Update local state
        setCurrentTier(nextTier.id as SubscriptionTier);
        
        showSuccess(
          t('settings:account.plan.toasts.upgradeWithPlan.title'),
          t('settings:account.plan.toasts.upgradeWithPlan.body', { plan: nextTier.name })
        );
      }
    } else {
      showSuccess(
        t('settings:account.plan.toasts.highest.title'),
        t('settings:account.plan.toasts.highest.body')
      );
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(true);
    setDeleteConfirmInput('');
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    const normalizedInput = deleteConfirmInput.trim();

    if (normalizedInput !== emailAddress) {
      const message = t('settings:account.delete.errorMismatch');
      setDeleteError(message);
      showError(t('settings:account.delete.toastFailedTitle'), message);
      return;
    }

    try {
      // Use the proper delete account method
      await mockUserDataService.deleteAccount();
      
      setShowDeleteConfirm(false);
      setDeleteConfirmInput('');
      setDeleteError(null);
      
      showSuccess(
        t('settings:account.delete.toastSuccessTitle'),
        t('settings:account.delete.toastSuccessBody')
      );
      
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
      const message = t('settings:account.delete.errorFailed');
      setDeleteError(message);
      showError(
        t('settings:account.delete.toastFailedTitle'),
        t('settings:account.delete.toastFailedBody')
      );
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
      return 'settings:account.domainErrors.empty';
    }
    
    if (trimmed !== domain) {
      return 'settings:account.domainErrors.spaces';
    }
    
    // Basic domain format validation regex
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(trimmed)) {
      return 'settings:account.domainErrors.format';
    }
    
    // Check for duplicates (case-insensitive)
    const existingDomains = links?.customDomains?.map(d => d.domain.toLowerCase()) || [];
    if (existingDomains.includes(trimmed.toLowerCase())) {
      return 'settings:account.domainErrors.duplicate';
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
    const errorKey = validateDomain(domainInput);
    if (errorKey) {
      const message = t(errorKey);
      setDomainError(message);
      showError(t('settings:account.links.invalidDomainToast.title'), message);
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
    showSuccess(
      t('settings:account.links.addDomainToast.title'),
      t('settings:account.links.addDomainToast.body', { domain: normalized })
    );
    
    // Simulate domain verification process with cancellable timeout
    // Clear any existing verification timeout to prevent race conditions
    if (verificationTimeoutRef.current !== null) {
      clearTimeout(verificationTimeoutRef.current);
    }
    
    verificationTimeoutRef.current = setTimeout(() => {
      // Use functional state update to avoid overwriting concurrent changes
      setLinks(currentLinks => {
        if (!currentLinks) return currentLinks;
        
        const updatedVerifyLinks = {
          ...currentLinks,
          customDomains: currentLinks.customDomains?.map(domain => 
            domain.domain === normalized 
              ? { ...domain, verified: true, verifiedAt: new Date().toISOString() }
              : domain
          ) || []
        };
        
        // Update the mock service with the latest state
        mockUserDataService.setUserLinks(updatedVerifyLinks);
        
        // Show success toast with translated strings
        showSuccess(
          t('settings:account.links.verifiedToast.title'),
          t('settings:account.links.verifiedToast.body', { domain: normalized })
        );
        
        return updatedVerifyLinks;
      });
      
      // Clear the timeout reference
      verificationTimeoutRef.current = null;
    }, 3000); // Simulate 3-second verification process
  };

  const handleAddLinkedIn = () => {
    showSuccess(
      t('settings:account.links.linkedinToast.title'),
      t('settings:account.links.linkedinToast.body')
    );
  };

  const handleAddGitHub = () => {
    showSuccess(
      t('settings:account.links.githubToast.title'),
      t('settings:account.links.githubToast.body')
    );
  };

  const handleDomainChange = (domain: string) => {
    if (domain === 'verify-new') {
      // Handle "Verify new domain" option
      handleOpenDomainModal();
    } else if (domain !== DOMAIN_SELECT_VALUE) {
      const updatedLinks = mockUserDataService.setUserLinks({ selectedDomain: domain });
      setLinks(updatedLinks);
    } else {
      setLinks(prev => (prev ? { ...prev, selectedDomain: prev.selectedDomain ?? domain } : prev));
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
            <p className="text-sm font-medium">{t('settings:account.loadingError')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{error}</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={loadAccountData}
          >
            {t('settings:account.retry')}
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
          {t('settings:account.title')}
        </h1>
        <div className="border-t border-gray-200 dark:border-dark-border mt-4" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6">
        <div className="space-y-0">
          {/* Current Plan Section */}
          <div className="flex items-center justify-between py-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {currentTier 
                  ? t('settings:account.plan.currentPlanLabel', { tier: t(`settings:account.plan.tiers.${currentTier}`) })
                  : t('settings:account.plan.currentPlanLabel', { tier: '' })
                }
              </h3>
              {currentTier && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t(`settings:account.plan.descriptions.${currentTier}`)}
                </p>
              )}
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
              {t('settings:account.links.title')}
            </h3>
            
            {/* Domain Selector */}
            <FormItem>
              <div className="flex-1 min-w-0">
                <FormLabel>{t('settings:account.links.domainLabel')}</FormLabel>
              </div>
              <div className="ml-4">
                <Select
                  value={selectedDomain}
                  options={[
                    { value: DOMAIN_SELECT_VALUE, label: t('settings:account.links.selectOption') },
                    { value: 'whynot.earth', label: 'whynot.earth' },
                    { value: 'example.com', label: 'example.com' },
                    ...customDomainOptions,
                    { value: 'verify-new', label: `+ ${t('settings:account.links.verifyNew')}` }
                  ]}
                  onChange={handleDomainChange}
                />
              </div>
            </FormItem>

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
                {t('settings:account.links.addButton')}
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
                {t('settings:account.links.addButton')}
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border" />

          {/* Email Section */}
          <div className="py-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('settings:account.email.title')}
            </h3>
            
            {/* Email Address */}
            <div className="flex items-center gap-3 py-3">
              <EnvelopeIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {emailAddress}
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
                {t('settings:account.email.receiveFeedback')}
              </label>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border" />

          {/* Delete account Section */}
          <div className="flex items-center justify-between py-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('settings:account.delete.sectionTitle')}
              </h3>
            </div>
            <div className="ml-4">
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 focus:ring-red-500"
              >
                {t('settings:account.delete.button')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={handleCancelDelete}
        title={t('settings:account.delete.modalTitle')}
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
                  {t('settings:account.delete.heading')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {t('settings:account.delete.description')}
                </p>
                <div 
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4" 
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.key === 'Enter' && e.stopPropagation()}
                  role="presentation"
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>{t('settings:account.delete.listIntro')}</strong>
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                    {deleteListItems.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
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
                    {confirmLabel} <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{emailAddress}</span>
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
                    placeholder={t('settings:account.delete.inputPlaceholder')}
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
              {t('settings:account.delete.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={deleteConfirmInput.trim() !== emailAddress}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 focus:ring-red-500 min-w-[80px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('settings:account.delete.confirmButton')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Domain Input Modal */}
      <Modal
        isOpen={showDomainModal}
        onClose={handleCloseDomainModal}
        title={t('settings:account.domainModal.title')}
        showCloseButton={true}
        type="modal"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="domain-input" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t('settings:account.domainModal.label')}
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
              placeholder={t('settings:account.links.domainPlaceholder')}
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
              {t('settings:account.domainModal.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDomainSubmit}
              className="min-w-[80px]"
            >
              {t('settings:account.domainModal.submit')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
