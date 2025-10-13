import { Button } from '../ui/Button';

interface OrderSummaryCardProps {
  planName: string;
  quantity: number;
  interval: 'month' | 'year';
  subtotal: number;
  vat: number;
  total: number;
  onSubmit: () => void;
  isSubmitting: boolean;
  isValid: boolean;
  error?: string;
}

export const OrderSummaryCard = ({
  planName,
  quantity,
  interval,
  subtotal,
  vat,
  total,
  onSubmit,
  isSubmitting,
  isValid,
  error
}: OrderSummaryCardProps) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
      
      <div className="space-y-3 mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">{planName}</span>
          <span className="font-medium">{quantity} users</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Billing</span>
          <span className="font-medium capitalize">{interval}ly</span>
        </div>
        
        <div className="border-t pt-3">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">VAT (20%)</span>
            <span>${vat.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-lg font-semibold border-t pt-2">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <Button
        onClick={onSubmit}
        disabled={!isValid || isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? 'Processing...' : 'Complete Order'}
      </Button>
    </div>
  );
};
