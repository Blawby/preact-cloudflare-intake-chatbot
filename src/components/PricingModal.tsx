import { FunctionComponent } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Modal from './Modal';
import { Button } from './ui/Button';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import { SettingsDropdown } from './settings/components/SettingsDropdown';
import { type SubscriptionTier } from '../utils/mockUserData';
import { mockPricingDataService, type PricingPlan } from '../utils/mockPricingData';
import { mockUserDataService } from '../utils/mockUserData';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: SubscriptionTier;
  onUpgrade?: (tier: SubscriptionTier) => void;
}


const PricingModal: FunctionComponent<PricingModalProps> = ({
  isOpen,
  onClose,
  currentTier = 'free',
  onUpgrade
}) => {
  const [selectedTab, setSelectedTab] = useState<'personal' | 'business'>('business');
  const [selectedLanguage, setSelectedLanguage] = useState('vi');

  const languageOptions = [
    { value: 'auto-detect', label: 'Auto-detect' },
    { value: 'en', label: 'English' },
    { value: 'vi', label: 'Vietnam' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'zh', label: 'Chinese' },
    { value: 'ja', label: 'Japanese' }
  ];

  // Load user's current language preference
  useEffect(() => {
    const preferences = mockUserDataService.getPreferences();
    setSelectedLanguage(preferences.language);
  }, []);

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    // Update user preferences
    mockUserDataService.setPreferences({ language: language as 'auto-detect' | 'en' | 'vi' | 'es' | 'fr' | 'de' | 'zh' | 'ja' });
  };

  // Get pricing plans from mock data service
  const allPlans = mockPricingDataService.getPricingPlans();
  
  // Show different plans based on selected tab
  const mainPlans: PricingPlan[] = (() => {
    if (selectedTab === 'personal') {
      // Personal tab: show Free and Plus (Plus is recommended)
      return allPlans
        .filter(plan => plan.id !== 'business')
        .map(plan => ({
          ...plan,
          isCurrent: plan.id === currentTier,
          buttonText: plan.id === currentTier ? 'Your current plan' : plan.buttonText,
          isRecommended: plan.id === 'plus' // Plus is recommended for personal
        }));
    } else {
      // Business tab: show Free and Business (Business is recommended)
      return allPlans
        .filter(plan => plan.id !== 'plus')
        .map(plan => ({
          ...plan,
          isCurrent: plan.id === currentTier,
          buttonText: plan.id === currentTier ? 'Your current plan' : plan.buttonText,
          isRecommended: plan.id === 'business' // Business is recommended for business
        }));
    }
  })();
  

  const handleUpgrade = (tier: SubscriptionTier) => {
    if (onUpgrade) {
      onUpgrade(tier);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      type="fullscreen"
      showCloseButton={false}
    >
      <div className="h-full bg-dark-bg text-white flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="relative p-6 border-b border-dark-border">
          {/* Close Button */}
          <Button
            onClick={onClose}
            variant="icon"
            size="sm"
            className="absolute top-4 right-4"
            aria-label="Close modal"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            }
          />
          
          {/* Centered Content */}
          <div className="flex flex-col items-center space-y-6">
            <h1 className="text-2xl font-semibold text-white">Upgrade your plan</h1>
            <div className="flex bg-dark-card-bg rounded-lg p-1">
              <button
                onClick={() => setSelectedTab('personal')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedTab === 'personal'
                    ? 'bg-dark-bg text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Personal
              </button>
              <button
                onClick={() => setSelectedTab('business')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedTab === 'business'
                    ? 'bg-dark-bg text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Business
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
            {mainPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-xl p-6 transition-all duration-200 flex flex-col h-full ${
                  plan.isRecommended
                    ? 'bg-dark-card-bg border-2 border-accent-500'
                    : 'bg-dark-card-bg border border-dark-border'
                }`}
              >
                {/* Recommended Badge */}
                {plan.isRecommended && (
                  <div className="absolute -top-3 left-6">
                    <span className="bg-accent-500 text-gray-900 text-xs font-medium px-3 py-1 rounded-full">
                      RECOMMENDED
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2 text-white">{plan.name}</h3>
                  <div className="text-3xl font-bold mb-2 text-white">
                    {plan.price.split(' ')[0]}
                    <span className="text-lg font-normal text-gray-300 ml-1">
                      {plan.price.split(' ').slice(1).join(' ')}
                    </span>
                  </div>
                  <p className="text-gray-300">{plan.description}</p>
                </div>

                {/* Action Button */}
                <div className="mb-6">
                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={plan.isCurrent}
                    variant={plan.isCurrent ? 'secondary' : 'primary'}
                    size="lg"
                    className="w-full"
                  >
                    {plan.buttonText}
                  </Button>
                </div>

                {/* Features List */}
                <div className="space-y-3 flex-1">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <feature.icon className="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-300">{feature.text}</span>
                    </div>
                  ))}
                </div>

                {/* Footer Text */}
                {plan.id === 'free' && (
                  <div className="mt-6 pt-4 border-t border-dark-border">
                    <p className="text-xs text-gray-400">
                      Have an existing plan?{' '}
                    <button className="underline hover:text-white">
                      See billing help
                    </button>
                    </p>
                  </div>
                )}

                {plan.id === 'business' && (
                  <div className="mt-6 pt-4 border-t border-dark-border">
                    <p className="text-xs text-gray-400 mb-1">
                      For 2+ users, billed annually
                    </p>
                    <p className="text-xs text-gray-400">
                      Unlimited subject to abuse guardrails.{' '}
                    <button className="underline hover:text-white">
                      Learn more
                    </button>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Enterprise Section */}
        <div className="border-t border-dark-border p-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <UserGroupIcon className="w-8 h-8 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">Need more capabilities for your business?</p>
              <button 
                className="text-white underline hover:text-gray-300"
                onClick={() => {
                  // Redirect to enterprise page
                  window.open('/enterprise', '_blank');
                }}
              >
                See Blawby Enterprise
              </button>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
};

export default PricingModal;
