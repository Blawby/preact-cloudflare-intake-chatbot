import { FunctionComponent } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Button } from './ui/Button';
import PlanCard from './ui/cards/PlanCard';
// Removed unused imports: UserGroupIcon, CalendarIcon, CurrencyDollarIcon
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
  const [selectedTier] = useState<SubscriptionTier>(getTierFromUrl());
  const [planType, setPlanType] = useState<'annual' | 'monthly'>('monthly');
  const [userCount, setUserCount] = useState(1);
  const [cartSession, setCartSession] = useState<CartSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for cart session creation
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  
  // Refs for race condition protection
  const requestIdRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get pricing plans
  const pricingPlans = mockPricingDataService.getPricingPlans();
  const selectedPlan = pricingPlans.find(plan => plan.id === selectedTier);

  // Create or update cart session when plan data changes
  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the effect to prevent rapid consecutive calls
    timeoutRef.current = setTimeout(() => {
      const currentRequestId = ++requestIdRef.current;
      
      const planData: PlanData = {
        planTier: selectedTier as 'plus' | 'business',
        planType,
        userCount
      };

      setIsCreatingSession(true);
      setSessionError(null);

      try {
        const session = mockPaymentDataService.createCartSession(planData);
        
        // Only update state if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setCartSession(session);
          setSessionError(null);
        }
      } catch (error) {
        // console.error('Failed to create cart session:', error);
        
        // Only update state if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setCartSession(null);
          setSessionError(error instanceof Error ? error.message : 'Failed to create cart session');
        }
      } finally {
        // Only update loading state if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setIsCreatingSession(false);
        }
      }
    }, 300); // 300ms debounce delay

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, [selectedTier, planType, userCount]);

  const handleUserCountChange = (delta: number) => {
    const newCount = Math.max(1, userCount + delta);
    setUserCount(newCount);
  };

  const handleProceedToCheckout = () => {
    if (!cartSession) return;
    
    // Clear any existing navigation timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    
    setIsLoading(true);
    
    // Simulate navigation delay
    navigationTimeoutRef.current = setTimeout(() => {
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
                price={selectedPlan ? `${selectedPlan.currency} ${formatPrice(selectedPlan.priceAmount)}` : "USD $40"}
                originalPrice={undefined}
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
                price={selectedPlan ? `${selectedPlan.currency} ${formatPrice(selectedPlan.priceAmount)}` : "USD $40"}
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
                  variant="secondary"
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
                      const value = Math.max(1, parseInt((e.target as HTMLInputElement).value) || 1);
                      setUserCount(value);
                    }}
                    className="w-full h-10 px-4 bg-gray-800 border border-gray-600 rounded-lg text-white text-center text-lg font-medium focus:outline-none focus:border-white"
                    min="1"
                  />
                </div>
                <Button
                  variant="secondary"
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

            {/* Loading state */}
            {isCreatingSession && (
              <div className="space-y-4">
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                  <span className="ml-3 text-white">Creating cart session...</span>
                </div>
              </div>
            )}

            {/* Error state */}
            {sessionError && !isCreatingSession && (
              <div className="space-y-4">
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-400">
                        Failed to create cart session
                      </h3>
                      <div className="mt-2 text-sm text-red-300">
                        {sessionError}
                      </div>
                      <div className="mt-3">
                        <button
                          onClick={() => {
                            setSessionError(null);
                            // Trigger a new session creation by updating a dependency
                            setUserCount(userCount);
                          }}
                          className="text-sm text-red-400 hover:text-red-300 underline"
                        >
                          Try again
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success state - show cart session */}
            {cartSession && !isCreatingSession && !sessionError && (
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
                <div className="border-t border-gray-700" />

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
                <div className="border-t border-gray-700" />

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
                    disabled={!cartSession || isLoading || isCreatingSession}
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
