import { FunctionComponent } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import { useNavigation } from '../utils/navigation';
import { mockPaymentDataService, type CartSession } from '../utils/mockPaymentData';
import { formatCurrency } from '../utils/intl';
import { useAnalytics } from '../hooks/useAnalytics';
import { useToastContext } from '../contexts/ToastContext';

import { useTranslation } from './ui/i18n/useTranslation';
import { Breadcrumb } from './ui/layout';
import { PricingSummary } from './ui/cards';
import { LoadingSpinner } from './ui/layout/LoadingSpinner';

interface PricingConfirmationProps {
  className?: string;
}

const PricingConfirmation: FunctionComponent<PricingConfirmationProps> = ({ className = '' }) => {
  const { navigate } = useNavigation();
  const { track } = useAnalytics();
  const { showError } = useToastContext();
  const { t, i18n } = useTranslation('common');

  const locale = i18n.language || 'en';
  const [cartSummary] = useState<CartSession | null>(() => mockPaymentDataService.getCurrentCart());
  const [isProcessing, setIsProcessing] = useState(true);
  const [hasError, setHasError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    const processSubscription = async () => {
      try {
        if (cartSummary) {
          await mockPaymentDataService.updateUserSubscription(cartSummary.planTier);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update subscription';
        setHasError(message);
        showError(t('pricing.confirmation.toast.errorTitle'), message);
        track('pricing_confirmation_error', { message });
      } finally {
        mockPaymentDataService.clearAllSessions();
        setIsProcessing(false);
      }
    };

    processSubscription();
  }, [cartSummary, showError, t]);

  const breadcrumbSteps = useMemo(
    () => [
      {
        id: 'cart',
        label: t('pricing.breadcrumb.cart'),
        href: '/pricing/cart',
        status: 'completed' as const
      },
      {
        id: 'checkout',
        label: t('pricing.breadcrumb.checkout'),
        href: '/pricing/checkout',
        status: 'completed' as const
      },
      {
        id: 'confirmation',
        label: t('pricing.breadcrumb.confirmation'),
        status: 'current' as const
      }
    ],
    [t]
  );

  const summaryLineItems = useMemo(() => {
    if (!cartSummary) {
      return [
        { label: t('pricing.summary.subtotal'), value: t('pricing.summary.placeholder') },
        { label: t('pricing.summary.discount'), value: t('pricing.summary.placeholder') },
        { label: t('pricing.summary.total'), value: t('pricing.summary.placeholder'), emphasis: true }
      ];
    }

    const currency = 'USD';

    return [
      {
        label: t('pricing.summary.subtotal'),
        value: formatCurrency(cartSummary.pricing.subtotal, { locale, currency, maximumFractionDigits: 2 })
      },
      {
        label: t('pricing.summary.discount'),
        value: cartSummary.pricing.discount > 0
          ? `-${formatCurrency(cartSummary.pricing.discount, { locale, currency, maximumFractionDigits: 2 })}`
          : formatCurrency(cartSummary.pricing.discount, { locale, currency, maximumFractionDigits: 2 })
      },
      {
        label: t('pricing.summary.total'),
        value: formatCurrency(cartSummary.pricing.total, { locale, currency, maximumFractionDigits: 2 }),
        emphasis: true
      }
    ];
  }, [cartSummary, locale, t]);

  useEffect(() => {
    headingRef.current?.focus();
    track('pricing_confirmation_viewed', {
      hasSummary: Boolean(cartSummary)
    });
  }, [cartSummary, track]);

  return (
    <div className={`min-h-screen bg-gray-900 text-white ${className}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Breadcrumb steps={breadcrumbSteps} ariaLabel={t('pricing.checkout.breadcrumbLabel')} />

        <header className="space-y-2 text-center">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-3xl font-bold focus:outline-none"
          >
            {t('pricing.confirmation.title')}
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            {t('pricing.confirmation.subtitle')}
          </p>
        </header>

        {isProcessing ? (
          <div className="flex flex-col items-center space-y-3 py-12">
            <LoadingSpinner size="lg" ariaLabel={t('pricing.confirmation.processing')} />
            <p className="text-sm text-gray-300">{t('pricing.confirmation.processing')}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {hasError ? (
              <div className="rounded-lg border border-red-500/40 bg-red-900/20 px-4 py-3 text-sm text-red-200">
                {hasError}
              </div>
            ) : (
              <PricingSummary
                heading={t('pricing.summary.heading')}
                planName={cartSummary ? t('pricing.planLabel', { plan: cartSummary.planTier === 'business' ? t('pricing.checkout.planBusiness') : t('pricing.checkout.planPlus') }) : ''}
                planDescription={cartSummary ? t('pricing.summary.planDescription', {
                  count: cartSummary.userCount,
                  billingPeriod: cartSummary.planType === 'annual'
                    ? t('pricing.summary.billingPeriodAnnual')
                    : t('pricing.summary.billingPeriodMonthly')
                }) : ''}
                pricePerSeat={cartSummary ? t('pricing.summary.pricePerSeat', {
                  price: formatCurrency(mockPaymentDataService.getPricingPlan(cartSummary.planTier)?.priceAmount ?? 0, {
                    locale,
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })
                }) : ''}
                lineItems={summaryLineItems}
                billingNote={cartSummary ? (cartSummary.planType === 'annual' ? t('pricing.summary.billingAnnual') : t('pricing.summary.billingMonthly')) : ''}
                primaryAction={{
                  label: t('pricing.confirmation.actions.goToDashboard'),
                  onClick: () => navigate('/'),
                  disabled: false,
                  isLoading: false
                }}
                isLoading={false}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingConfirmation;
