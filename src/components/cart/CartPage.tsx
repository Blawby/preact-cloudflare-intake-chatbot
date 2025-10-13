import { useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { PRODUCTS, PRICES, PriceId } from '../../utils/stripe-products';
import { QuantitySelector } from './QuantitySelector';
import { PricingSummary } from '../ui/cards/PricingSummary';
import { Button } from '../ui/Button';
import { CheckIcon } from '@heroicons/react/24/outline';

export const CartPage = () => {
  const navigate = useLocation();
  const [selectedPriceId, setSelectedPriceId] = useState<PriceId>('price_monthly');
  const [quantity, setQuantity] = useState(2);

  const selectedPrice = PRICES[selectedPriceId];
  const isAnnual = selectedPrice.recurring.interval === 'year';
  const unitAmount = selectedPrice.unit_amount / 100; // Convert cents to dollars
  
  // Calculate pricing with discount for annual
  const monthlyPrice = 30; // Base monthly price per user
  const annualMonthlyPrice = 25; // Annual price per user per month
  const subtotal = unitAmount * quantity;
  const discount = isAnnual ? (monthlyPrice - annualMonthlyPrice) * quantity : 0;
  const total = subtotal;

  const handleContinue = () => {
    // Store cart data for Stripe Elements integration
    localStorage.setItem('cartData', JSON.stringify({
      product_id: selectedPrice.product,
      price_id: selectedPriceId,
      quantity
    }));
    
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
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => setSelectedPriceId('price_annual')}
                role="radio"
                aria-checked={selectedPriceId === 'price_annual'}
                aria-label="Annual plan - $25/user/month. Features: Billed annually, Minimum 2 users, Add and reassign users"
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
              planDescription={`${quantity} ${quantity === 1 ? 'user' : 'users'} • ${isAnnual ? 'Billed annually' : 'Billed monthly'}`}
              pricePerSeat={`$${unitAmount.toFixed(2)} per user / month`}
              isAnnual={isAnnual}
              billingNote={isAnnual ? `Billed annually at $${(total * 12).toFixed(2)}/year` : `Billed monthly at $${total.toFixed(2)}/month`}
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
                  numericValue: discount
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
                onClick: () => navigate('/')
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};
