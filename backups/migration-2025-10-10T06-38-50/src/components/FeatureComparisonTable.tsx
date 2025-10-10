import { FunctionComponent } from 'preact';
import { mockPricingDataService } from '../utils/mockPricingData';
import { type SubscriptionTier } from '../utils/mockUserData';

interface FeatureComparisonTableProps {
  className?: string;
}

const FeatureComparisonTable: FunctionComponent<FeatureComparisonTableProps> = ({
  className = ''
}) => {
  const comparison = mockPricingDataService.getPricingComparison();
  const plans = comparison.plans;
  const features = comparison.features;

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-dark-border">
            <th className="text-left py-4 px-6 text-white font-medium">Features</th>
            {plans.map((plan) => (
              <th key={plan.id} className="text-center py-4 px-6 text-white font-medium">
                <div>
                  <div className="text-lg font-bold">{plan.name}</div>
                  <div className="text-sm text-gray-400">{plan.price}</div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(features).map(([featureKey, feature]) => (
            <tr key={featureKey} className="border-b border-dark-border">
              <td className="py-4 px-6">
                <div className="flex items-center gap-3">
                  <feature.icon className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-white font-medium">{feature.name}</div>
                    <div className="text-sm text-gray-400">{feature.description}</div>
                  </div>
                </div>
              </td>
              {plans.map((plan) => {
                const value = feature.tiers[plan.id];
                return (
                  <td key={plan.id} className="text-center py-4 px-6">
                    {typeof value === 'boolean' ? (
                      value ? (
                        <span className="text-accent-500 text-lg">✓</span>
                      ) : (
                        <span className="text-gray-500 text-lg">✗</span>
                      )
                    ) : (
                      <span className="text-gray-300 text-sm">{value}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FeatureComparisonTable;
