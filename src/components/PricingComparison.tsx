import { FunctionComponent } from 'preact';
import { useTranslation } from '@/i18n/hooks';
import { getBusinessPrices } from '../utils/stripe-products';
import { buildPriceDisplay } from '../utils/currencyFormatter';
import { mockUserDataService } from '../utils/mockUserData';
import { type SubscriptionTier } from '../utils/mockUserData';
import { 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon, 
  UserGroupIcon, 
  ShieldCheckIcon,
  ClockIcon,
  CloudIcon
} from '@heroicons/react/24/outline';

interface PricingComparisonProps {
  currentTier?: SubscriptionTier;
  onUpgrade?: (tier: SubscriptionTier) => void;
  showAllPlans?: boolean;
  className?: string;
}

const PricingComparison: FunctionComponent<PricingComparisonProps> = ({
  currentTier = 'free',
  onUpgrade,
  showAllPlans = true,
  className = ''
}) => {
  const { t } = useTranslation('pricing');
  
  // Get user preferences for locale and currency
  const preferences = mockUserDataService.getPreferences();
  const userLocale = preferences.language === 'auto-detect' ? 'en' : preferences.language;
  const userCurrency = 'USD'; // TODO: Add currency preference to user preferences
  
  const _prices = getBusinessPrices(userLocale, userCurrency);
  
  const allPlans = [
    {
      id: 'free',
      name: t('plans.free.name'),
      price: t('plans.free.price'),
      description: t('plans.free.description'),
      features: [
        {
          icon: ChatBubbleLeftRightIcon,
          text: t('plans.free.features.basicChat.text'),
          description: t('plans.free.features.basicChat.description')
        },
        {
          icon: DocumentTextIcon,
          text: t('plans.free.features.documentAnalysis.text'),
          description: t('plans.free.features.documentAnalysis.description')
        },
        {
          icon: ClockIcon,
          text: t('plans.free.features.responseTime.text'),
          description: t('plans.free.features.responseTime.description')
        }
      ],
      buttonText: t('plans.free.buttonText'),
      isRecommended: false,
      popular: false,
      limitations: [
        t('plans.free.limitations.documentLimit'),
        t('plans.free.limitations.noTeam'),
        t('plans.free.limitations.basicAI'),
        t('plans.free.limitations.noPriority')
      ],
      benefits: [
        t('plans.free.benefits.personalUse'),
        t('plans.free.benefits.noCard'),
        t('plans.free.benefits.fullAccess')
      ]
    },
    {
      id: 'business',
      name: t('plans.business.name'),
      price: buildPriceDisplay(40, userCurrency, 'month', userLocale, t),
      description: t('plans.business.description'),
      features: [
        {
          icon: UserGroupIcon,
          text: t('plans.business.features.teamCollaboration.text'),
          description: t('plans.business.features.teamCollaboration.description')
        },
        {
          icon: DocumentTextIcon,
          text: t('plans.business.features.unlimitedDocuments.text'),
          description: t('plans.business.features.unlimitedDocuments.description')
        },
        {
          icon: ShieldCheckIcon,
          text: t('plans.business.features.advancedSecurity.text'),
          description: t('plans.business.features.advancedSecurity.description')
        },
        {
          icon: CloudIcon,
          text: t('plans.business.features.cloudStorage.text'),
          description: t('plans.business.features.cloudStorage.description')
        },
        {
          icon: ClockIcon,
          text: t('plans.business.features.prioritySupport.text'),
          description: t('plans.business.features.prioritySupport.description')
        }
      ],
      buttonText: t('plans.business.buttonText'),
      isRecommended: currentTier !== 'business',
      popular: true,
      limitations: [],
      benefits: [
        t('plans.business.benefits.unlimitedProcessing'),
        t('plans.business.benefits.teamTools'),
        t('plans.business.benefits.advancedAI'),
        t('plans.business.benefits.prioritySupport'),
        t('plans.business.benefits.customIntegrations')
      ]
    }
  ];

  // Filter plans based on showAllPlans prop
  const plans = showAllPlans ? allPlans : allPlans.filter(plan => plan.id !== 'free');

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={`relative rounded-xl p-6 transition-all duration-200 ${
            plan.isRecommended
              ? 'bg-dark-card-bg border-2 border-accent-500'
              : 'bg-dark-card-bg border border-dark-border'
          }`}
        >
          {/* Recommended Badge */}
          {plan.isRecommended && (
            <div className="absolute -top-3 left-6">
              <span className="bg-accent-500 text-gray-900 text-xs font-medium px-3 py-1 rounded-full">
                {t('modal.recommended').toUpperCase()}
              </span>
            </div>
          )}

          {/* Popular Badge */}
          {plan.popular && (
            <div className="absolute -top-3 right-6">
              <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                {t('modal.popular').toUpperCase()}
              </span>
            </div>
          )}

          {/* Plan Header */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold mb-2 text-white">{plan.name}</h3>
            <div className="text-3xl font-bold mb-2 text-white">
              {plan.price}
            </div>
            <p className="text-gray-300">{plan.description}</p>
          </div>

          {/* Action Button */}
          <button
            onClick={() => onUpgrade?.(plan.id as SubscriptionTier)}
            disabled={plan.id === currentTier}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors mb-6 ${
              plan.id === currentTier
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : plan.isRecommended
                ? 'bg-accent-500 text-gray-900 hover:bg-accent-600'
                : 'bg-transparent border border-dark-border text-white hover:bg-dark-hover'
            }`}
          >
            {plan.id === currentTier ? t('modal.currentPlan') : plan.buttonText}
          </button>

          {/* Features List */}
          <div className="space-y-3">
            {plan.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <feature.icon className="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-400" />
                <div>
                  <span className="text-sm text-gray-300">{feature.text}</span>
                  {feature.description && (
                    <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Benefits */}
          {plan.benefits && plan.benefits.length > 0 && (
            <div className="mt-6 pt-4 border-t border-dark-border">
              <h4 className="text-sm font-medium text-white mb-2">{t('sections.benefits')}</h4>
              <ul className="space-y-1">
                {plan.benefits.map((benefit, index) => (
                  <li key={index} className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="w-1 h-1 bg-accent-500 rounded-full" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Limitations */}
          {plan.limitations && plan.limitations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-dark-border">
              <h4 className="text-sm font-medium text-white mb-2">{t('sections.limitations')}</h4>
              <ul className="space-y-1">
                {plan.limitations.map((limitation, index) => (
                  <li key={index} className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-1 h-1 bg-gray-500 rounded-full" />
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PricingComparison;