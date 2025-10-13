import { useState, useCallback } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { PRODUCTS, PRICES, PriceId } from '../../utils/stripe-products';
import { QuantitySelector } from './QuantitySelector';
import { PricingSummary } from '../ui/cards/PricingSummary';
import { Button } from '../ui/Button';
import { CheckIcon } from '@heroicons/react/24/outline';

export const CartPage = () => {
  const location = useLocation();
  const [selectedPriceId, setSelectedPriceId] = useState<PriceId>('price_monthly');
  const [quantity, setQuantity] = useState(2);

  const selectedPrice = PRICES[selectedPriceId];
  const isAnnual = selectedPrice.recurring.interval === 'year';
  const monthlySeatPrice = PRICES.price_monthly.unit_amount / 100;
  const annualSeatPricePerYear = PRICES.price_annual.unit_amount / 100;
  const annualSeatPricePerMonth = annualSeatPricePerYear / 12;

  // Keyboard navigation for radiogroup
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const priceIds: PriceId[] = ['price_annual', 'price_monthly'];
    const currentIndex = priceIds.indexOf(selectedPriceId);
    
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : priceIds.length - 1;
        setSelectedPriceId(priceIds[prevIndex]);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = currentIndex < priceIds.length - 1 ? currentIndex + 1 : 0;
        setSelectedPriceId(priceIds[nextIndex]);
        break;
    }
  }, [selectedPriceId]);

  const subtotal = isAnnual
    ? monthlySeatPrice * quantity * 12 // baseline yearly cost at monthly rate
    : monthlySeatPrice * quantity;

  const annualTotal = annualSeatPricePerYear * quantity;
  const discount = isAnnual ? subtotal - annualTotal : 0;
  const total = isAnnual ? annualTotal : subtotal;

  const handleContinue = () => {
    // Store cart data for Stripe Elements integration
    const cartData = {
      product_id: selectedPrice.product,
      price_id: selectedPriceId,
      quantity
    };

    try {
      // Attempt to store in localStorage
      const cartDataString = JSON.stringify(cartData);
      localStorage.setItem('cartData', cartDataString);
    } catch (error) {
      // Log the error with context
      console.error('Failed to store cart data in localStorage:', {
        error: error instanceof Error ? error.message : String(error),
        cartData,
        storageAvailable: typeof Storage !== 'undefined',
        localStorageAvailable: typeof localStorage !== 'undefined'
      });

      // Fallback to sessionStorage if available
      try {
        if (typeof sessionStorage !== 'undefined') {
          const cartDataString = JSON.stringify(cartData);
          sessionStorage.setItem('cartData', cartDataString);
          console.log('Cart data stored in sessionStorage as fallback');
        }
      } catch (sessionError) {
        console.error('Failed to store cart data in sessionStorage:', {
          error: sessionError instanceof Error ? sessionError.message : String(sessionError),
          cartData
        });
        // Continue without persisting - checkout should not be blocked
      }
    }
    
    // TODO: Integrate with Stripe Elements
    // This will redirect to Stripe checkout or open Stripe Elements modal
    console.log('Proceeding to Stripe checkout with:', {
      product_id: selectedPrice.product,
      price_id: selectedPriceId,
      quantity,
      unit_amount: selectedPrice.unit_amount,
      total: total * 100 // Convert to cents for Stripe
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="py-4">
        <div className="max-w-7xl mx-auto px-8">
          <img 
            src="/blawby-favicon-iframe.png" 
            alt="Blawby" 
            className="h-8 w-8"
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Price selection */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Pick your plan</h2>
            
            {/* Price cards */}
            <div 
              role="radiogroup" 
              aria-label="Billing plan selection"
              className="grid grid-cols-2 gap-4 mb-8"
              onKeyDown={handleKeyDown}
            >
              <button
                onClick={() => setSelectedPriceId('price_annual')}
                role="radio"
                aria-checked={selectedPriceId === 'price_annual'}
                aria-label="Annual plan - $25/user/month. Features: Billed annually, Minimum 2 users, Add and reassign users"
                tabIndex={selectedPriceId === 'price_annual' ? 0 : -1}
                className={`p-6 border rounded-lg text-left transition-all relative ${
                  selectedPriceId === 'price_annual' 
                    ? 'border-white bg-gray-800' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {/* Floating discount badge */}
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <span className="bg-accent-500 text-white text-xs font-medium px-2 py-1 rounded">
                    Save 17%
                  </span>
                </div>

                {/* Header with radio indicator */}
                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg font-bold text-white">Annual</div>
                  <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center">
                    {selectedPriceId === 'price_annual' && (
                      <div className="w-3 h-3 bg-accent-500 rounded-full"></div>
                    )}
                  </div>
                </div>

                {/* Pricing with strikethrough for discounts */}
                <div className="text-sm text-white mb-1">
                  $25/user/month
                  <span className="text-sm text-gray-400 line-through ml-1">$30</span>
                </div>
                <div className="text-sm text-gray-400 mb-3">per user / month</div>

                {/* Feature list */}
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Billed annually</li>
                  <li>• Minimum 2 users</li>
                  <li>• Add and reassign users</li>
                </ul>
              </button>
              
              <button
                onClick={() => setSelectedPriceId('price_monthly')}
                role="radio"
                aria-checked={selectedPriceId === 'price_monthly'}
                aria-label="Monthly plan - $30/user/month. Features: Billed monthly, Minimum 2 users, Add or remove users"
                tabIndex={selectedPriceId === 'price_monthly' ? 0 : -1}
                className={`p-6 border rounded-lg text-left transition-all relative ${
                  selectedPriceId === 'price_monthly' 
                    ? 'border-white bg-gray-800' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {/* Header with radio indicator */}
                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg font-bold text-white">Monthly</div>
                  <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center">
                    {selectedPriceId === 'price_monthly' && (
                      <div className="w-3 h-3 bg-accent-500 rounded-full"></div>
                    )}
                  </div>
                </div>

                {/* Pricing */}
                <div className="text-sm text-white mb-1">$30/user/month</div>
                <div className="text-sm text-gray-400 mb-3">per user / month</div>

                {/* Feature list */}
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Billed monthly</li>
                  <li>• Minimum 2 users</li>
                  <li>• Add or remove users</li>
                </ul>
              </button>
            </div>

            <QuantitySelector
              quantity={quantity}
              onChange={setQuantity}
              min={2}
              helperText="Minimum of 2 seats"
            />
          </div>

          {/* Right: Summary */}
          <div>
            <PricingSummary
              heading="Summary"
              planName={PRODUCTS.business.name}
              planDescription={`${quantity} users • ${isAnnual ? 'Billed annually' : 'Billed monthly'}`}
              pricePerSeat={`$${(isAnnual ? annualSeatPricePerMonth : monthlySeatPrice).toFixed(2)} per user / month`}
              isAnnual={isAnnual}
              billingNote={
                isAnnual
                  ? `Billed annually at $${total.toFixed(2)}/year`
                  : `Billed monthly at $${total.toFixed(2)}/month`
              }
              lineItems={[
                { 
                  id: 'subtotal', 
                  label: 'Subtotal', 
                  value: `$${subtotal.toFixed(2)}`,
                  numericValue: subtotal
                },
                { 
                  id: 'discount', 
                  label: 'Discount', 
                  value: discount > 0 ? `-$${discount.toFixed(2)}` : '$0.00',
                  numericValue: -discount
                },
                { 
                  id: 'total', 
                  label: "Today's total", 
                  value: `$${total.toFixed(2)}`, 
                  emphasis: true,
                  numericValue: total
                }
              ]}
              primaryAction={{
                label: 'Continue',
                onClick: handleContinue
              }}
              secondaryAction={{
                label: 'Cancel',
                onClick: () => location.route('/')
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};
