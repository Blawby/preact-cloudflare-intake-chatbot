import { FunctionComponent } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Button } from './ui/Button';
import { ArrowLeftIcon, CreditCardIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { mockPaymentDataService, type CartSession } from '../utils/mockPaymentData';
import { useNavigation } from '../utils/navigation';

interface PricingCheckoutProps {
  className?: string;
}

const PricingCheckout: FunctionComponent<PricingCheckoutProps> = ({ className = '' }) => {
  const { navigate } = useNavigation();
  const [cartSession, setCartSession] = useState<CartSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get current cart session
  useEffect(() => {
    const currentCart = mockPaymentDataService.getCurrentCart();
    setCartSession(currentCart);
  }, []);

  const handleBackToCart = () => {
    navigate('/pricing/cart');
  };

  const handleStripeCheckout = () => {
    setIsLoading(true);
    
    // Simulate Stripe Elements integration
    setTimeout(() => {
      // In a real implementation, this would redirect to Stripe Checkout
      console.log('Redirecting to Stripe Checkout...');
      alert('Stripe Elements integration would be implemented here');
      setIsLoading(false);
    }, 1000);
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (!cartSession) {
    return (
      <div className={`max-w-2xl mx-auto p-6 ${className}`}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            No Cart Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please add items to your cart first.
          </p>
          <Button
            variant="primary"
            onClick={() => navigate('/pricing/cart')}
            icon={<ArrowLeftIcon className="w-5 h-5" />}
          >
            Back to Cart
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-2xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToCart}
          icon={<ArrowLeftIcon className="w-4 h-4" />}
          className="mb-4"
        >
          Back to Cart
        </Button>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Checkout
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Complete your purchase securely with Stripe
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Order Summary
        </h2>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              {cartSession.planTier.charAt(0).toUpperCase() + cartSession.planTier.slice(1)} Plan
            </span>
            <span className="text-gray-900 dark:text-white">
              {formatPrice(cartSession.pricing.subtotal)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              {cartSession.userCount} users
            </span>
            <span className="text-gray-900 dark:text-white">
              {cartSession.planType === 'annual' ? 'Annual billing' : 'Monthly billing'}
            </span>
          </div>

          {cartSession.pricing.discount > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Annual discount</span>
              <span>-{formatPrice(cartSession.pricing.discount)}</span>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex justify-between text-lg font-semibold">
              <span className="text-gray-900 dark:text-white">Total</span>
              <span className="text-gray-900 dark:text-white">
                {formatPrice(cartSession.pricing.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Elements Placeholder */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 mb-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCardIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Stripe Elements Integration
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This is where Stripe Elements would be integrated to handle:
          </p>

          <div className="grid md:grid-cols-2 gap-4 text-left mb-6">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">Payment Details</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Credit card information</li>
                <li>• Billing address</li>
                <li>• Payment method selection</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">Security Features</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• PCI DSS compliance</li>
                <li>• Fraud protection</li>
                <li>• Secure tokenization</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
            <ShieldCheckIcon className="w-4 h-4" />
            <span>Secured by Stripe</span>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleStripeCheckout}
            disabled={isLoading}
            icon={<CreditCardIcon className="w-5 h-5" />}
          >
            {isLoading ? 'Processing...' : 'Continue with Stripe'}
          </Button>
        </div>
      </div>

      {/* Security Notice */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          Your payment information is encrypted and secure. 
          We never store your credit card details.
        </p>
      </div>
    </div>
  );
};

export default PricingCheckout;
