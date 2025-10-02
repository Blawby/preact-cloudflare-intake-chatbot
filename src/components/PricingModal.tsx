import { FunctionComponent } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Modal from './Modal';
import { Button } from './ui/Button';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import { SettingsDropdown } from './settings/components/SettingsDropdown';
import { type SubscriptionTier } from '../utils/mockUserData';
import { mockPricingDataService, type PricingPlan } from '../utils/mockPricingData';
import { mockUserDataService, getLanguageForCountry } from '../utils/mockUserData';

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
  const [selectedCountry, setSelectedCountry] = useState('vn');

  const countryOptions = [
    { value: 'af', label: 'Afghanistan' },
    { value: 'al', label: 'Albania' },
    { value: 'dz', label: 'Algeria' },
    { value: 'ad', label: 'Andorra' },
    { value: 'ao', label: 'Angola' },
    { value: 'ag', label: 'Antigua & Barbuda' },
    { value: 'ar', label: 'Argentina' },
    { value: 'am', label: 'Armenia' },
    { value: 'au', label: 'Australia' },
    { value: 'at', label: 'Austria' },
    { value: 'az', label: 'Azerbaijan' },
    { value: 'bs', label: 'Bahamas' },
    { value: 'bh', label: 'Bahrain' },
    { value: 'bd', label: 'Bangladesh' },
    { value: 'bb', label: 'Barbados' },
    { value: 'by', label: 'Belarus' },
    { value: 'be', label: 'Belgium' },
    { value: 'bz', label: 'Belize' },
    { value: 'bj', label: 'Benin' },
    { value: 'bt', label: 'Bhutan' },
    { value: 'bo', label: 'Bolivia' },
    { value: 'ba', label: 'Bosnia & Herzegovina' },
    { value: 'bw', label: 'Botswana' },
    { value: 'br', label: 'Brazil' },
    { value: 'bn', label: 'Brunei' },
    { value: 'bg', label: 'Bulgaria' },
    { value: 'bf', label: 'Burkina Faso' },
    { value: 'bi', label: 'Burundi' },
    { value: 'kh', label: 'Cambodia' },
    { value: 'cm', label: 'Cameroon' },
    { value: 'ca', label: 'Canada' },
    { value: 'cv', label: 'Cape Verde' },
    { value: 'cf', label: 'Central African Republic' },
    { value: 'td', label: 'Chad' },
    { value: 'cl', label: 'Chile' },
    { value: 'cn', label: 'China' },
    { value: 'co', label: 'Colombia' },
    { value: 'km', label: 'Comoros' },
    { value: 'cg', label: 'Congo' },
    { value: 'cd', label: 'Congo (Democratic Republic)' },
    { value: 'cr', label: 'Costa Rica' },
    { value: 'ci', label: 'Côte d\'Ivoire' },
    { value: 'hr', label: 'Croatia' },
    { value: 'cu', label: 'Cuba' },
    { value: 'cy', label: 'Cyprus' },
    { value: 'cz', label: 'Czech Republic' },
    { value: 'dk', label: 'Denmark' },
    { value: 'dj', label: 'Djibouti' },
    { value: 'dm', label: 'Dominica' },
    { value: 'do', label: 'Dominican Republic' },
    { value: 'ec', label: 'Ecuador' },
    { value: 'eg', label: 'Egypt' },
    { value: 'sv', label: 'El Salvador' },
    { value: 'gq', label: 'Equatorial Guinea' },
    { value: 'er', label: 'Eritrea' },
    { value: 'ee', label: 'Estonia' },
    { value: 'et', label: 'Ethiopia' },
    { value: 'fj', label: 'Fiji' },
    { value: 'fi', label: 'Finland' },
    { value: 'fr', label: 'France' },
    { value: 'ga', label: 'Gabon' },
    { value: 'gm', label: 'Gambia' },
    { value: 'ge', label: 'Georgia' },
    { value: 'de', label: 'Germany' },
    { value: 'gh', label: 'Ghana' },
    { value: 'gr', label: 'Greece' },
    { value: 'gd', label: 'Grenada' },
    { value: 'gt', label: 'Guatemala' },
    { value: 'gn', label: 'Guinea' },
    { value: 'gw', label: 'Guinea-Bissau' },
    { value: 'gy', label: 'Guyana' },
    { value: 'ht', label: 'Haiti' },
    { value: 'hn', label: 'Honduras' },
    { value: 'hu', label: 'Hungary' },
    { value: 'is', label: 'Iceland' },
    { value: 'in', label: 'India' },
    { value: 'id', label: 'Indonesia' },
    { value: 'ir', label: 'Iran' },
    { value: 'iq', label: 'Iraq' },
    { value: 'ie', label: 'Ireland' },
    { value: 'il', label: 'Israel' },
    { value: 'it', label: 'Italy' },
    { value: 'jm', label: 'Jamaica' },
    { value: 'jp', label: 'Japan' },
    { value: 'jo', label: 'Jordan' },
    { value: 'kz', label: 'Kazakhstan' },
    { value: 'ke', label: 'Kenya' },
    { value: 'ki', label: 'Kiribati' },
    { value: 'kp', label: 'Korea (North)' },
    { value: 'kr', label: 'Korea (South)' },
    { value: 'kw', label: 'Kuwait' },
    { value: 'kg', label: 'Kyrgyzstan' },
    { value: 'la', label: 'Laos' },
    { value: 'lv', label: 'Latvia' },
    { value: 'lb', label: 'Lebanon' },
    { value: 'ls', label: 'Lesotho' },
    { value: 'lr', label: 'Liberia' },
    { value: 'ly', label: 'Libya' },
    { value: 'li', label: 'Liechtenstein' },
    { value: 'lt', label: 'Lithuania' },
    { value: 'lu', label: 'Luxembourg' },
    { value: 'mk', label: 'Macedonia' },
    { value: 'mg', label: 'Madagascar' },
    { value: 'mw', label: 'Malawi' },
    { value: 'my', label: 'Malaysia' },
    { value: 'mv', label: 'Maldives' },
    { value: 'ml', label: 'Mali' },
    { value: 'mt', label: 'Malta' },
    { value: 'mh', label: 'Marshall Islands' },
    { value: 'mr', label: 'Mauritania' },
    { value: 'mu', label: 'Mauritius' },
    { value: 'mx', label: 'Mexico' },
    { value: 'fm', label: 'Micronesia' },
    { value: 'md', label: 'Moldova' },
    { value: 'mc', label: 'Monaco' },
    { value: 'mn', label: 'Mongolia' },
    { value: 'me', label: 'Montenegro' },
    { value: 'ma', label: 'Morocco' },
    { value: 'mz', label: 'Mozambique' },
    { value: 'mm', label: 'Myanmar' },
    { value: 'na', label: 'Namibia' },
    { value: 'nr', label: 'Nauru' },
    { value: 'np', label: 'Nepal' },
    { value: 'nl', label: 'Netherlands' },
    { value: 'nz', label: 'New Zealand' },
    { value: 'ni', label: 'Nicaragua' },
    { value: 'ne', label: 'Niger' },
    { value: 'ng', label: 'Nigeria' },
    { value: 'no', label: 'Norway' },
    { value: 'om', label: 'Oman' },
    { value: 'pk', label: 'Pakistan' },
    { value: 'pw', label: 'Palau' },
    { value: 'pa', label: 'Panama' },
    { value: 'pg', label: 'Papua New Guinea' },
    { value: 'py', label: 'Paraguay' },
    { value: 'pe', label: 'Peru' },
    { value: 'ph', label: 'Philippines' },
    { value: 'pl', label: 'Poland' },
    { value: 'pt', label: 'Portugal' },
    { value: 'qa', label: 'Qatar' },
    { value: 'ro', label: 'Romania' },
    { value: 'ru', label: 'Russia' },
    { value: 'rw', label: 'Rwanda' },
    { value: 'kn', label: 'Saint Kitts & Nevis' },
    { value: 'lc', label: 'Saint Lucia' },
    { value: 'vc', label: 'Saint Vincent & the Grenadines' },
    { value: 'ws', label: 'Samoa' },
    { value: 'sm', label: 'San Marino' },
    { value: 'st', label: 'São Tomé & Príncipe' },
    { value: 'sa', label: 'Saudi Arabia' },
    { value: 'sn', label: 'Senegal' },
    { value: 'rs', label: 'Serbia' },
    { value: 'sc', label: 'Seychelles' },
    { value: 'sl', label: 'Sierra Leone' },
    { value: 'sg', label: 'Singapore' },
    { value: 'sk', label: 'Slovakia' },
    { value: 'si', label: 'Slovenia' },
    { value: 'sb', label: 'Solomon Islands' },
    { value: 'so', label: 'Somalia' },
    { value: 'za', label: 'South Africa' },
    { value: 'ss', label: 'South Sudan' },
    { value: 'es', label: 'Spain' },
    { value: 'lk', label: 'Sri Lanka' },
    { value: 'sd', label: 'Sudan' },
    { value: 'sr', label: 'Suriname' },
    { value: 'sz', label: 'Swaziland' },
    { value: 'se', label: 'Sweden' },
    { value: 'ch', label: 'Switzerland' },
    { value: 'sy', label: 'Syria' },
    { value: 'tw', label: 'Taiwan' },
    { value: 'tj', label: 'Tajikistan' },
    { value: 'tz', label: 'Tanzania' },
    { value: 'th', label: 'Thailand' },
    { value: 'tl', label: 'Timor-Leste' },
    { value: 'tg', label: 'Togo' },
    { value: 'to', label: 'Tonga' },
    { value: 'tt', label: 'Trinidad & Tobago' },
    { value: 'tn', label: 'Tunisia' },
    { value: 'tr', label: 'Turkey' },
    { value: 'tm', label: 'Turkmenistan' },
    { value: 'tv', label: 'Tuvalu' },
    { value: 'ug', label: 'Uganda' },
    { value: 'ua', label: 'Ukraine' },
    { value: 'ae', label: 'United Arab Emirates' },
    { value: 'gb', label: 'United Kingdom' },
    { value: 'us', label: 'United States' },
    { value: 'uy', label: 'Uruguay' },
    { value: 'uz', label: 'Uzbekistan' },
    { value: 'vu', label: 'Vanuatu' },
    { value: 'va', label: 'Vatican City' },
    { value: 've', label: 'Venezuela' },
    { value: 'vn', label: 'Vietnam' },
    { value: 'ye', label: 'Yemen' },
    { value: 'zm', label: 'Zambia' },
    { value: 'zw', label: 'Zimbabwe' }
  ];

  // Load user's current country preference
  useEffect(() => {
    const preferences = mockUserDataService.getPreferences();
    setSelectedCountry(preferences.country ?? 'us');
  }, []);

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    // Get the appropriate language for the selected country
    const language = getLanguageForCountry(country);
    // Update user preferences with both country and language
    mockUserDataService.setPreferences({ 
      country,
      language 
    });
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

        {/* Country Toggle */}
        <div className="absolute bottom-4 right-4">
          <SettingsDropdown
            label=""
            value={selectedCountry}
            options={countryOptions}
            onChange={handleCountryChange}
            className="py-0"
            direction="up"
          />
        </div>
      </div>
    </Modal>
  );
};

export default PricingModal;
