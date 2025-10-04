import { FunctionComponent } from 'preact';
import { Button } from '../Button';
import { LoadingSpinner } from '../layout/LoadingSpinner';

// Constants for line item IDs to avoid fragile label-based lookups
const LINE_ITEM_IDS = {
  SUBTOTAL: 'subtotal',
  DISCOUNT: 'discount',
  TOTAL_DUE_TODAY: 'total'
} as const;

// Helper function to get line item value by stable ID
const getLineItemValue = (lineItems: PricingLineItem[], id: string): string => {
  return lineItems.find(item => item.id === id)?.value || '—';
};

export interface PricingLineItem {
  id: string;
  label: string;
  value: string;
  numericValue?: number;
  emphasis?: boolean;
  valueClassName?: string;
}

export interface PricingSummaryError {
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface PricingSummaryNotice {
  message: string;
  type?: 'info' | 'warning' | 'success' | 'error';
}

export interface PricingSummaryProps {
  heading: string;
  planName: string;
  planDescription: string;
  pricePerSeat: string;
  lineItems: PricingLineItem[];
  billingNote: string;
  isAnnual?: boolean;
  primaryAction: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    isLoading?: boolean;
    loadingLabel?: string;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  isLoading?: boolean;
  error?: PricingSummaryError | null;
  notice?: PricingSummaryNotice | null;
}

const noticeStyles: Record<NonNullable<PricingSummaryNotice['type']>, string> = {
  info: 'bg-blue-900/20 border-blue-500/40 text-blue-200',
  warning: 'bg-amber-900/20 border-amber-500/40 text-amber-200',
  success: 'bg-emerald-900/20 border-emerald-500/40 text-emerald-200',
  error: 'bg-red-900/20 border-red-500/40 text-red-200'
};

export const PricingSummary: FunctionComponent<PricingSummaryProps> = ({
  heading,
  planName,
  planDescription,
  pricePerSeat,
  lineItems,
  billingNote,
  isAnnual = false,
  primaryAction,
  secondaryAction,
  isLoading = false,
  error = null,
  notice = null
}) => {
  const primaryLabel = primaryAction.isLoading && primaryAction.loadingLabel
    ? primaryAction.loadingLabel
    : primaryAction.label;

  // Compute discount percentage from actual values
  const computeDiscountPercentage = (): number | null => {
    const subtotalItem = lineItems.find(item => item.id === LINE_ITEM_IDS.SUBTOTAL);
    const discountItem = lineItems.find(item => item.id === LINE_ITEM_IDS.DISCOUNT);
    
    if (!subtotalItem || !discountItem) {
      return null;
    }

    // Prefer numeric values when available
    let subtotal: number;
    let discount: number;

    if (subtotalItem.numericValue !== undefined && discountItem.numericValue !== undefined) {
      subtotal = subtotalItem.numericValue;
      discount = Math.abs(discountItem.numericValue);
    } else {
      // Fallback to parsing formatted currency strings
      const extractNumericValue = (value: string): number => {
        // Normalize the string by removing currency symbols and grouping separators
        // Handle different locale decimal separators
        const normalized = value
          .replace(/[^\d.,-]/g, '') // Remove currency symbols
          .replace(/,/g, '') // Remove grouping separators
          .replace(/-/g, ''); // Remove negative signs (we'll handle sign separately)
        
        return parseFloat(normalized) || 0;
      };

      subtotal = extractNumericValue(subtotalItem.value);
      discount = Math.abs(extractNumericValue(discountItem.value));
    }
    
    if (subtotal === 0) {
      return null;
    }

    return Math.round((discount / subtotal) * 100);
  };

  const discountPercentage = computeDiscountPercentage();

  return (
    <section aria-labelledby="pricing-summary-heading" className="bg-gray-900 text-white">
      <header className="mb-6">
        <h2 id="pricing-summary-heading" className="text-lg font-medium">
          {heading}
        </h2>
      </header>

      {isLoading && (
        <div className="space-y-4" role="status" aria-live="polite">
          <div className="flex items-center space-x-3 py-6 justify-center">
            <LoadingSpinner size="lg" ariaLabel={heading} />
            <span className="text-sm text-gray-300">{primaryAction.loadingLabel ?? primaryAction.label}</span>
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="space-y-4" role="alert" aria-live="assertive">
          <div className="border border-red-500/40 bg-red-900/20 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-200">{error.title}</h3>
            {error.message && (
              <p className="mt-2 text-sm text-red-200/90">{error.message}</p>
            )}
            {error.action && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={error.action.onClick}
                  className="text-sm text-red-200 underline hover:text-red-100"
                >
                  {error.action.label}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-4" aria-live="polite">
          {/* Plan Details */}
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-white">
                {planName}
              </div>
              <div className="text-sm text-gray-400">
                {planDescription}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white">
                {getLineItemValue(lineItems, LINE_ITEM_IDS.SUBTOTAL)}
              </div>
              <div className="text-sm text-gray-400">
                {pricePerSeat}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700" />

          {/* Discount */}
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-white">Discount</div>
              {isAnnual && discountPercentage !== null && (
                <div className="text-sm text-gray-400">Annual (-{discountPercentage}%)</div>
              )}
            </div>
            <div className="text-sm text-white">
              {getLineItemValue(lineItems, LINE_ITEM_IDS.DISCOUNT)}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700" />

          {/* Total */}
          <div className="flex justify-between items-center">
            <div className="text-white font-bold text-lg">Today&apos;s total</div>
            <div className="text-white font-bold text-lg">
              {getLineItemValue(lineItems, LINE_ITEM_IDS.TOTAL_DUE_TODAY)}
            </div>
          </div>

          <p className="text-xs text-gray-400">{billingNote}</p>

          {notice && (
            <div className={`rounded-lg border px-4 py-3 text-sm ${noticeStyles[notice.type ?? 'info']}`}>
              {notice.message}
            </div>
          )}

          <div className="space-y-3">
            <Button
              type="button"
              variant="primary"
              className="w-full"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled || primaryAction.isLoading}
            >
              {primaryAction.isLoading ? (
                <span className="flex items-center justify-center space-x-2">
                  <LoadingSpinner size="sm" ariaHidden />
                  <span>{primaryLabel}</span>
                </span>
              ) : (
                primaryLabel
              )}
            </Button>

            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="w-full text-sm text-gray-200 hover:text-white underline"
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default PricingSummary;