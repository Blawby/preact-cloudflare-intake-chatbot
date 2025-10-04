import { FunctionComponent } from 'preact';
import { Button } from '../Button';
import { LoadingSpinner } from '../layout/LoadingSpinner';

export interface PricingLineItem {
  id?: string;
  label: string;
  value: string;
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
                {lineItems.find(item => item.label === 'Subtotal')?.value || '—'}
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
              {isAnnual && (
                <div className="text-sm text-gray-400">Annual (-16%)</div>
              )}
            </div>
            <div className="text-sm text-white">
              {lineItems.find(item => item.label === 'Discount')?.value || '—'}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700" />

          {/* Total */}
          <div className="flex justify-between items-center">
            <div className="text-white font-bold text-lg">Today&apos;s total</div>
            <div className="text-white font-bold text-lg">
              {lineItems.find(item => item.label === 'Total due today')?.value || '—'}
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