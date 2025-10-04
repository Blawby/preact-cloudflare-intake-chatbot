import { FunctionComponent } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Button } from './ui/Button';
import { UserGroupIcon, CalendarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { type SubscriptionTier } from '../utils/mockUserData';
import { mockPricingDataService } from '../utils/mockPricingData';
import { mockPaymentDataService, type CartSession, type PlanData } from '../utils/mockPaymentData';
import { useNavigation } from '../utils/navigation';

interface PricingCartProps {
  className?: string;
}

const PricingCart: FunctionComponent<PricingCartProps> = ({ className = '' }) => {
  const { navigate } = useNavigation();
  
  // State for plan selection
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('plus');
  const [planType, setPlanType] = useState<'annual' | 'monthly'>('monthly');
  const [userCount, setUserCount] = useState(2);
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
    const newCount = Math.max(2, userCount + delta);
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
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Choose Your Plan
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Select the plan that best fits your needs
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Plan Selection */}
        <div className="space-y-6">
          {/* Plan Tier Selection */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Plan Type
            </h2>
            <div className="grid gap-4">
              {pricingPlans.filter(plan => plan.id !== 'free').map((plan) => (
                <div
                  key={plan.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedTier === plan.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedTier(plan.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {plan.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {plan.price}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Billing Period Selection */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Billing Period
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  planType === 'monthly'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setPlanType('monthly')}
              >
                <div className="font-semibold text-gray-900 dark:text-white">Monthly</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Billed monthly</div>
              </button>
              <button
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  planType === 'annual'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setPlanType('annual')}
              >
                <div className="font-semibold text-gray-900 dark:text-white">Annual</div>
                <div className="text-sm text-green-600 dark:text-green-400">Save 16%</div>
              </button>
            </div>
          </div>

          {/* User Count Selection */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Number of Users
            </h2>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUserCountChange(-1)}
                disabled={userCount <= 2}
                icon={<span className="text-lg">−</span>}
              />
              <div className="flex items-center space-x-2">
                <UserGroupIcon className="w-5 h-5 text-gray-500" />
                <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {userCount}
                </span>
                <span className="text-gray-600 dark:text-gray-400">users</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUserCountChange(1)}
                icon={<span className="text-lg">+</span>}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Minimum 2 users required
            </p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Order Summary
          </h2>

          {cartSession && (
            <div className="space-y-4">
              {/* Plan Details */}
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {selectedPlan?.name} Plan
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {planType === 'annual' ? 'Annual billing' : 'Monthly billing'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {formatPrice(cartSession.pricing.subtotal)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    per {planType === 'annual' ? 'year' : 'month'}
                  </div>
                </div>
              </div>

              {/* User Count */}
              <div className="flex justify-between items-center">
                <div className="text-gray-600 dark:text-gray-400">
                  {userCount} users
                </div>
                <div className="text-gray-900 dark:text-white">
                  {formatPrice(cartSession.pricing.subtotal)}
                </div>
              </div>

              {/* Annual Savings */}
              {planType === 'annual' && (
                <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                  <div className="flex items-center space-x-1">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Annual savings</span>
                  </div>
                  <div className="font-medium">
                    -{formatPrice(getAnnualSavings())}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700"></div>

              {/* Total */}
              <div className="flex justify-between items-center text-lg font-semibold">
                <div className="text-gray-900 dark:text-white">Total</div>
                <div className="text-gray-900 dark:text-white">
                  {formatPrice(cartSession.pricing.total)}
                </div>
              </div>

              {/* Billing Note */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {planType === 'annual' 
                  ? 'Billed annually, cancel anytime'
                  : 'Billed monthly, cancel anytime'
                }
              </div>

              {/* Proceed Button */}
              <Button
                variant="primary"
                size="lg"
                className="w-full mt-6"
                onClick={handleProceedToCheckout}
                disabled={!cartSession || isLoading}
                icon={<CurrencyDollarIcon className="w-5 h-5" />}
              >
                {isLoading ? 'Processing...' : 'Proceed to Checkout'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingCart;
