import { FunctionComponent } from 'preact';
import { KeyboardEvent, forwardRef } from 'preact/compat';
import { CheckIcon } from '@heroicons/react/24/outline';

export interface PlanCardProps {
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
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

const PlanCard = forwardRef<HTMLButtonElement, PlanCardProps>(({
  title,
  price,
  originalPrice,
  period,
  features,
  isSelected,
  hasDiscount = false,
  discountText,
  onClick,
  className = '',
  onKeyDown,
  onFocus,
  onBlur
}, ref) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
      return;
    }

    onKeyDown?.(event);
  };

  return (
    <button
      ref={ref}
      type="button"
      className={`p-6 border rounded-lg text-left transition-all relative ${
        isSelected
          ? 'border-white bg-gray-800'
          : 'border-gray-700 hover:border-gray-600'
      } ${className}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      role="radio"
      aria-checked={isSelected}
      aria-label={`${title} plan - ${price} ${period}. Features: ${features.join(', ')}`}
      tabIndex={isSelected ? 0 : -1}
    >
      {/* Discount Badge */}
      {hasDiscount && discountText && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
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
});

PlanCard.displayName = 'PlanCard';

export default PlanCard;
