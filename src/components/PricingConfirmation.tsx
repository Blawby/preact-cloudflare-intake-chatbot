import { FunctionComponent } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import { useNavigation } from '../utils/navigation';
import { mockPaymentDataService, type CartSession } from '../utils/mockPaymentData';
import { mockPricingDataService } from '../utils/mockPricingData';
import { formatCurrency } from '../utils/intl';
import { useAnalytics } from '../hooks/useAnalytics';
import { useToastContext } from '../contexts/ToastContext';

import { useTranslation } from './ui/i18n/useTranslation';
import { CheckoutLayout } from './ui/layout';
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
          // Only clear sessions after successful subscription update
          mockPaymentDataService.clearAllSessions();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update subscription';
        setHasError(message);
        showError(t('pricing.confirmation.toast.errorTitle'), message);
        track('pricing_confirmation_error', { message });
      } finally {
        setIsProcessing(false);
      }
    };

    processSubscription();
  }, [cartSummary, showError, t, track]);

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
        { id: 'subtotal', label: t('pricing.summary.subtotal'), value: t('pricing.summary.placeholder') },
        { id: 'discount', label: t('pricing.summary.discount'), value: t('pricing.summary.placeholder') },
        { id: 'total', label: t('pricing.summary.total'), value: t('pricing.summary.placeholder'), emphasis: true }
      ];
    }

    const currency = 'USD';

    return [
      {
        id: 'subtotal',
        label: t('pricing.summary.subtotal'),
        value: formatCurrency(cartSummary.pricing.subtotal, { locale, currency, maximumFractionDigits: 2 }),
        numericValue: cartSummary.pricing.subtotal
      },
      {
        id: 'discount',
        label: t('pricing.summary.discount'),
        value: cartSummary.pricing.discount > 0
          ? `-${formatCurrency(cartSummary.pricing.discount, { locale, currency, maximumFractionDigits: 2 })}`
          : formatCurrency(cartSummary.pricing.discount, { locale, currency, maximumFractionDigits: 2 }),
        numericValue: cartSummary.pricing.discount
      },
      {
        id: 'total',
        label: t('pricing.summary.total'),
        value: formatCurrency(cartSummary.pricing.total, { locale, currency, maximumFractionDigits: 2 }),
        emphasis: true,
        numericValue: cartSummary.pricing.total
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
    <CheckoutLayout
      className={className}
      breadcrumbs={breadcrumbSteps}
      breadcrumbAriaLabel={t('pricing.checkout.breadcrumbLabel')}
      title={t('pricing.confirmation.title')}
      subtitle={t('pricing.confirmation.subtitle')}
    >

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
                planName={cartSummary ? t('pricing.planLabel', { interpolation: { plan: cartSummary.planTier === 'business' ? t('pricing.checkout.planBusiness') : t('pricing.checkout.planPlus') } }) : ''}
                planDescription={cartSummary ? t('pricing.summary.planDescription', {
                  interpolation: {
                    count: cartSummary.userCount,
                    billingPeriod: cartSummary.planType === 'annual'
                      ? t('pricing.summary.billingPeriodAnnual')
                      : t('pricing.summary.billingPeriodMonthly')
                  }
                }) : ''}
                pricePerSeat={cartSummary ? t('pricing.summary.pricePerSeat', {
                  interpolation: {
                    price: formatCurrency(mockPricingDataService.getPricingPlan(cartSummary.planTier)?.priceAmount ?? 0, {
                      locale,
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })
                  }
                }) : ''}
                lineItems={summaryLineItems}
                billingNote={cartSummary ? (cartSummary.planType === 'annual' ? t('pricing.summary.billingAnnual') : t('pricing.summary.billingMonthly')) : ''}
                isAnnual={cartSummary?.planType === 'annual'}
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
    </CheckoutLayout>
  );
};

export default PricingConfirmation;
