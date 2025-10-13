import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'preact-router';
import { PRICES } from '../../utils/stripe-products';
import { OrderSummaryCard } from './OrderSummaryCard';
import { FormLabel } from '../ui/form/FormLabel';
import { Input } from '../ui/input/Input';
import { Checkbox } from '../ui/input/Checkbox';
import { usePaymentUpgrade } from '../../hooks/usePaymentUpgrade';
import { useOrganizationManagement } from '../../hooks/useOrganizationManagement';

export const CheckoutPage = () => {
  const navigate = useLocation();
  const { submitUpgrade, submitting, error } = usePaymentUpgrade();
  const { currentOrganization } = useOrganizationManagement();
  
  // Form state
  const [cardholderName, setCardholderName] = useState('');
  const [email, setEmail] = useState('');
  const [address1, setAddress1] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('US');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Cart data
  const [cartData, setCartData] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('cartData');
    if (stored) {
      setCartData(JSON.parse(stored));
    } else {
      // Redirect to cart if no data
      navigate('/cart');
    }
  }, [navigate]);

  if (!cartData) {
    return <div>Loading...</div>;
  }

  const { price_id, quantity } = cartData;
  const price = PRICES[price_id];
  const unitAmount = price.unit_amount / 100;
  const subtotal = unitAmount * quantity;
  const vat = subtotal * 0.2; // 20% VAT
  const total = subtotal + vat;

  const isValid = cardholderName && email && address1 && city && postalCode && acceptTerms;

  const handleSubmit = async () => {
    const data = {
      organizationName: currentOrganization?.name || 'New Organization',
      existingOrganizationId: currentOrganization?.id,
      price_id: price_id,
      quantity: quantity,
      billing: {
        name: cardholderName,
        email: email,
        address: {
          line1: address1,
          city: city,
          postal_code: postalCode,
          country: country
        }
      }
    };

    await submitUpgrade(data);
    localStorage.removeItem('cartData');
    navigate('/?upgraded=business');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Blawby</h1>
          <div className="text-sm text-gray-500">Checkout</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Billing form */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Billing Information</h2>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
              <div>
                <FormLabel htmlFor="cardholder-name">Cardholder Name</FormLabel>
                <Input
                  id="cardholder-name"
                  value={cardholderName}
                  onChange={setCardholderName}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <FormLabel htmlFor="email">Email</FormLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <FormLabel htmlFor="address1">Address</FormLabel>
                <Input
                  id="address1"
                  value={address1}
                  onChange={setAddress1}
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FormLabel htmlFor="city">City</FormLabel>
                  <Input
                    id="city"
                    value={city}
                    onChange={setCity}
                    placeholder="New York"
                  />
                </div>
                <div>
                  <FormLabel htmlFor="postal-code">Postal Code</FormLabel>
                  <Input
                    id="postal-code"
                    value={postalCode}
                    onChange={setPostalCode}
                    placeholder="10001"
                  />
                </div>
              </div>

              <div>
                <FormLabel htmlFor="country">Country</FormLabel>
                <Input
                  id="country"
                  value={country}
                  onChange={setCountry}
                  placeholder="United States"
                />
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onChange={setAcceptTerms}
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                </label>
              </div>
            </div>
          </div>

          {/* Right: Order summary */}
          <div className="lg:col-span-1">
            <OrderSummaryCard
              planName="Business Plan"
              quantity={quantity}
              interval={price.recurring.interval}
              subtotal={subtotal}
              vat={vat}
              total={total}
              onSubmit={handleSubmit}
              isSubmitting={submitting}
              isValid={isValid}
              error={error}
            />
          </div>
        </div>
      </main>
    </div>
  );
};
