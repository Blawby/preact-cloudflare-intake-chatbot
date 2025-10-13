import { useState } from 'preact/hooks';
import { useLocation } from 'preact-router';
import { PRODUCTS, PRICES, PriceId } from '../../utils/stripe-products';
import { QuantitySelector } from './QuantitySelector';
import { PricingSummary } from '../ui/cards/PricingSummary';
import { Button } from '../ui/Button';

export const CartPage = () => {
  const navigate = useLocation();
  const [selectedPriceId, setSelectedPriceId] = useState<PriceId>('price_monthly');
  const [quantity, setQuantity] = useState(2);

  const selectedPrice = PRICES[selectedPriceId];
  const isAnnual = selectedPrice.recurring.interval === 'year';
  const unitAmount = selectedPrice.unit_amount / 100; // Convert cents to dollars
  const subtotal = unitAmount * quantity;
  const discount = 0; // Or calculate if needed
  const total = subtotal - discount;

  const handleContinue = () => {
    localStorage.setItem('cartData', JSON.stringify({
      product_id: selectedPrice.product,
      price_id: selectedPriceId,
      quantity
    }));
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">Blawby</h1>
          <div className="text-sm text-gray-400">Cart</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Price selection */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Pick your plan</h2>
            
            {/* Price cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => setSelectedPriceId('price_annual')}
                className={`p-6 border-2 rounded-lg text-left transition-colors ${
                  selectedPriceId === 'price_annual' 
                    ? 'border-white bg-white/5' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="bg-accent-500 text-xs px-2 py-1 rounded mb-3 inline-block">Save 17%</div>
                <div className="text-lg font-semibold mb-2">Annual</div>
                <div className="text-2xl font-bold mb-1">$25/user/month</div>
                <div className="text-xs text-gray-400">Billed annually ($300/year)</div>
              </button>
              
              <button
                onClick={() => setSelectedPriceId('price_monthly')}
                className={`p-6 border-2 rounded-lg text-left transition-colors ${
                  selectedPriceId === 'price_monthly' 
                    ? 'border-white bg-white/5' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="text-lg font-semibold mb-2">Monthly</div>
                <div className="text-2xl font-bold mb-1">$30/user/month</div>
                <div className="text-xs text-gray-400">Billed monthly</div>
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
          <div className="lg:col-span-1">
            <PricingSummary
              heading="Summary"
              planName={PRODUCTS.business.name}
              planDescription={`${quantity} users`}
              lineItems={[
                { id: 'subtotal', label: 'Subtotal', value: `$${subtotal.toFixed(2)}` },
                { id: 'total', label: "Today's total", value: `$${total.toFixed(2)}`, emphasis: true }
              ]}
              primaryAction={{
                label: 'Continue',
                onClick: handleContinue
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};
