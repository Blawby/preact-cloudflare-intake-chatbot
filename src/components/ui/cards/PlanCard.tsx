import { FunctionComponent } from 'preact';
import { CheckIcon } from '@heroicons/react/24/outline';

interface PlanCardProps {
  title: string;
  price: string;
  originalPrice?: string;
  period: string;
  features: string[];
  isSelected: boolean;
  hasDiscount?: boolean;
  discountText?: string;
  onClick: () => void;
  className?: string;
}

const PlanCard: FunctionComponent<PlanCardProps> = ({
  title,
  price,
  originalPrice,
  period,
  features,
  isSelected,
  hasDiscount = false,
  discountText,
  onClick,
  className = ''
}) => {
  return (
    <button
      type="button"
      className={`p-6 border rounded-lg text-left transition-all relative ${
        isSelected
          ? 'border-white bg-gray-800'
          : 'border-gray-700 hover:border-gray-600'
      } ${className}`}
      onClick={onClick}
      role="radio"
      aria-checked={isSelected}
      aria-label={`${title} plan - ${price} ${period}. Features: ${features.join(', ')}`}
    >
      {/* Discount Badge */}
      {hasDiscount && discountText && (
        <div className="absolute -top-2 -left-2">
          <span className="bg-accent-500 text-white text-xs font-medium px-2 py-1 rounded">
            {discountText}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-lg font-bold text-white">{title}</div>
        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-gray-400">
          {isSelected ? (
            <div className="w-5 h-5 bg-accent-500 rounded-full flex items-center justify-center">
              <CheckIcon className="w-3 h-3 text-white" />
            </div>
          ) : (
            <div className="w-3 h-3 rounded-full bg-transparent" />
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="text-sm text-white mb-1">
        {price}
        {originalPrice && (
          <span className="text-sm font-normal text-gray-400 line-through ml-1">
            {originalPrice}
          </span>
        )}
      </div>
      <div className="text-sm text-gray-400 mb-3">{period}</div>

      {/* Features */}
      <ul className="text-sm text-gray-400 space-y-1">
        {features.map((feature) => (
          <li key={feature}>• {feature}</li>
        ))}
      </ul>
    </button>
  );
};

export default PlanCard;
