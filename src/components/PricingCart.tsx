import { FunctionComponent } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Button } from './ui/Button';
import PlanCard from './ui/cards/PlanCard';
import { UserGroupIcon, CalendarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { type SubscriptionTier } from '../utils/mockUserData';
import { mockPricingDataService } from '../utils/mockPricingData';
import { mockPaymentDataService, type CartSession, type PlanData } from '../utils/mockPaymentData';
import { useNavigation } from '../utils/navigation';
import { useTranslation } from './ui/i18n/useTranslation';

interface PricingCartProps {
  className?: string;
}

const PricingCart: FunctionComponent<PricingCartProps> = ({ className = '' }) => {
  const { navigate } = useNavigation();
  const { t } = useTranslation('common');
  
  // Get tier from URL parameters
  const getTierFromUrl = (): SubscriptionTier => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tier = urlParams.get('tier') as SubscriptionTier;
      if (tier && ['plus', 'business'].includes(tier)) {
        return tier;
      }
    }
    return 'plus'; // Default to plus
  };
  
  // State for plan selection
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(getTierFromUrl());
  const [planType, setPlanType] = useState<'annual' | 'monthly'>('monthly');
  const [userCount, setUserCount] = useState(1);
  const [cartSession, setCartSession] = useState<CartSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get pricing plans
  const pricingPlans = mockPricingDataService.getPricingPlans();
  const selectedPlan = pricingPlans.find(plan => plan.id === selectedTier);

  // Create or update cart session when plan data changes
  useEffect(() => {
    const planData: PlanData = {
      planTier: selectedTier as 'plus' | 'business',
      planType,
      userCount
    };

    try {
      const session = mockPaymentDataService.createCartSession(planData);
      setCartSession(session);
    } catch (error) {
      console.error('Failed to create cart session:', error);
    }
  }, [selectedTier, planType, userCount]);

  const handleUserCountChange = (delta: number) => {
    const newCount = Math.max(1, userCount + delta);
    setUserCount(newCount);
  };

  const handleProceedToCheckout = () => {
    if (!cartSession) return;
    
    setIsLoading(true);
    
    // Simulate navigation delay
    setTimeout(() => {
      navigate('/pricing/checkout');
      setIsLoading(false);
    }, 500);
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getAnnualSavings = () => {
    if (planType === 'monthly') return 0;
    const monthlyTotal = cartSession?.pricing.subtotal || 0;
    return monthlyTotal * 0.16; // 16% annual discount
  };

  return (
    <div className={`min-h-screen bg-gray-900 text-white ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header - Logo only */}
        <div className="mb-6 sm:mb-8">
          <img src="/blawby-favicon-iframe.png" alt="Blawby Logo" className="w-12 h-12" />
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column - Pick your plan */}
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-white text-center">
              {t('pricing.pickYourPlan')}
            </h2>
            
            {/* Billing Period Selection - Responsive cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PlanCard
                title={t('pricing.annual')}
                price="USD $40"
                originalPrice="$40"
                period="per user/month"
                features={[
                  t('pricing.billedAnnuallyFeature'),
                  t('pricing.minimumUsers'), 
                  t('pricing.addAndReassignUsers')
                ]}
                isSelected={planType === 'annual'}
                hasDiscount={true}
                discountText={planType === 'annual' ? t('pricing.youreSaving16Percent') : t('pricing.save16Percent')}
                onClick={() => setPlanType('annual')}
              />
              
              <PlanCard
                title={t('pricing.monthly')}
                price="USD $40"
                period="per user/month"
                features={[
                  t('pricing.billedMonthlyFeature'),
                  t('pricing.minimumUsers'),
                  t('pricing.addOrRemoveUsers')
                ]}
                isSelected={planType === 'monthly'}
                onClick={() => setPlanType('monthly')}
              />
            </div>

            {/* Users Section - Below the plan cards */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">
                {t('pricing.users')}
              </h3>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUserCountChange(-1)}
                  disabled={userCount <= 1}
                  className="w-10 h-10 p-0 border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 flex-shrink-0"
                >
                  <span className="text-lg">−</span>
                </Button>
                <div className="flex-1">
                  <input
                    type="number"
                    value={userCount}
                    onChange={(e) => {
                      const value = Math.max(1, parseInt(e.target.value) || 1);
                      setUserCount(value);
                    }}
                    className="w-full h-10 px-4 bg-gray-800 border border-gray-600 rounded-lg text-white text-center text-lg font-medium focus:outline-none focus:border-white"
                    min="1"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUserCountChange(1)}
                  className="w-10 h-10 p-0 border-gray-600 text-gray-300 hover:bg-gray-700 flex-shrink-0"
                >
                  <span className="text-lg">+</span>
                </Button>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {t('pricing.addMoreSeats')}
              </p>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div>
            <h2 className="text-lg font-medium text-white mb-6">
              {t('pricing.summary')}
            </h2>

            {cartSession && (
              <div className="space-y-4">
                {/* Plan Details */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm text-white">
                      {selectedPlan?.name} Plan
                    </div>
                    <div className="text-sm text-gray-400">
                      {userCount} users{planType === 'annual' ? ' x 12 months' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white">
                      {formatPrice(cartSession.pricing.subtotal)}
                    </div>
                    <div className="text-sm text-gray-400">
                      ${selectedPlan?.priceAmount}/seat
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-700"></div>

                {/* Discount */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm text-white">{t('pricing.discount')}</div>
                    {planType === 'annual' && (
                      <div className="text-sm text-gray-400">{t('pricing.annualDiscount')}</div>
                    )}
                  </div>
                  <div className="text-sm text-white">
                    -{formatPrice(cartSession.pricing.discount)}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-700"></div>

                {/* Total */}
                <div className="flex justify-between items-center">
                  <div className="text-white font-bold text-lg">{t('pricing.todaysTotal')}</div>
                  <div className="text-white font-bold text-lg">
                    USD {formatPrice(cartSession.pricing.total)}
                  </div>
                </div>

                {/* Billing Note */}
                <div className="text-sm text-gray-400">
                  {planType === 'annual' ? t('pricing.billedAnnually') : t('pricing.billedMonthly')}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 mt-6">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleProceedToCheckout}
                    disabled={!cartSession || isLoading}
                  >
                    {isLoading ? 'Processing...' : t('pricing.continueToBilling')}
                  </Button>
                  
                  <button
                    className="w-full text-center text-white hover:text-gray-300 transition-colors"
                    onClick={() => window.history.back()}
                  >
                    {t('pricing.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingCart;
