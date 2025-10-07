import { FunctionComponent } from 'preact';
import { useTranslation } from 'react-i18next';
import { mockPricingDataService, type PricingPlan } from '../utils/mockPricingData';
import { type SubscriptionTier } from '../utils/mockUserData';
import { formatCurrency } from '../utils/currencyFormatter';

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
  const { t, i18n } = useTranslation('pricing');
  
  const rawPlans = showAllPlans 
    ? mockPricingDataService.getPricingPlans()
    : mockPricingDataService.getUpgradePath(currentTier);
    
  // Translate plans
  const plans = rawPlans.map(plan => ({
    ...plan,
    name: t(plan.name),
    description: t(plan.description),
    buttonText: t(plan.buttonText),
    price: formatCurrency(plan.priceAmount, plan.currency, i18n.language) + ' ' + 
           plan.currency.toUpperCase() + ' ' + 
           t(`billing.per${plan.billingPeriod === 'month' ? 'Month' : 'Year'}`),
    features: plan.features.map(f => ({
      ...f,
      text: t(f.text),
      description: f.description ? t(f.description) : undefined
    })),
    benefits: plan.benefits?.map(b => t(b)),
    limitations: plan.limitations?.map(l => t(l))
  }));

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
              {plan.price.split(' ')[0]}
              <span className="text-lg font-normal text-gray-300 ml-1">
                {plan.price.split(' ').slice(1).join(' ')}
              </span>
            </div>
            <p className="text-gray-300">{plan.description}</p>
          </div>

          {/* Action Button */}
          <button
            onClick={() => onUpgrade?.(plan.id)}
            disabled={plan.id === currentTier}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors mb-6 ${
              plan.id === currentTier
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : plan.isRecommended
                ? 'bg-accent-500 text-gray-900 hover:bg-accent-600'
                : 'bg-transparent border border-dark-border text-white hover:bg-dark-hover'
            }`}
          >
            {plan.id === currentTier ? t('plans.free.buttonText') : plan.buttonText}
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
              <h4 className="text-sm font-medium text-white mb-2">Benefits:</h4>
              <ul className="space-y-1">
                {plan.benefits.map((benefit, index) => (
                  <li key={index} className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="w-1 h-1 bg-accent-500 rounded-full"></span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Limitations */}
          {plan.limitations && plan.limitations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-dark-border">
              <h4 className="text-sm font-medium text-white mb-2">Limitations:</h4>
              <ul className="space-y-1">
                {plan.limitations.map((limitation, index) => (
                  <li key={index} className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
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
