import { Button } from '../Button';

interface LineItem {
  id: string;
  label: string;
  value: string;
  emphasis?: boolean;
}

interface PricingSummaryProps {
  heading: string;
  planName: string;
  planDescription: string;
  lineItems: LineItem[];
  primaryAction: {
    label: string;
    onClick: () => void;
  };
}

export const PricingSummary = ({
  heading,
  planName,
  planDescription,
  lineItems,
  primaryAction
}: PricingSummaryProps) => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">{heading}</h3>
      
      <div className="space-y-3 mb-6">
        <div className="flex justify-between">
          <span className="text-gray-300">{planName}</span>
          <span className="font-medium">{planDescription}</span>
        </div>
        
        <div className="border-t border-gray-700 pt-3 space-y-2">
          {lineItems.map((item) => (
            <div key={item.id} className={`flex justify-between ${item.emphasis ? 'text-lg font-semibold' : ''}`}>
              <span className={item.emphasis ? 'text-white' : 'text-gray-300'}>{item.label}</span>
              <span className={item.emphasis ? 'text-white' : 'text-gray-300'}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={primaryAction.onClick}
        className="w-full"
        size="lg"
      >
        {primaryAction.label}
      </Button>
    </div>
  );
};
