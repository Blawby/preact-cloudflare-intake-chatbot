import { FunctionComponent } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { KeyboardEvent } from 'preact/compat';
import { z } from 'zod';

import { useNavigation } from '../utils/navigation';
import { mockPricingDataService } from '../utils/mockPricingData';
import { formatCurrency } from '../utils/intl';
import { useCartSession } from '../hooks/useCartSession';
import { useAnalytics } from '../hooks/useAnalytics';
import { useToastContext } from '../contexts/ToastContext';

import { useTranslation } from './ui/i18n/useTranslation';
import { CheckoutLayout } from './ui/layout';
import { PlanCard, PricingSummary } from './ui/cards';
import { NumberInput } from './ui/input/NumberInput';
import { Form } from './ui/form/Form';
import { FormField } from './ui/form/FormField';
import { FormItem } from './ui/form/FormItem';
import { FormLabel } from './ui/form/FormLabel';
import { FormControl } from './ui/form/FormControl';
import { FormMessage } from './ui/form/FormMessage';
import Modal from './Modal';

const MAX_USER_COUNT = 500;

interface PricingCartProps {
  className?: string;
}

type SessionErrorToast = 'network' | 'timeout' | 'unknown';

type _SessionNotice = 'expired' | 'offline';

const PricingCart: FunctionComponent<PricingCartProps> = ({ className = '' }) => {
  const { navigate } = useNavigation();
  const { t, i18n } = useTranslation('common');
  const { showError, showInfo } = useToastContext();

  const locale = i18n.language || 'en';
  const [planType, setPlanType] = useState<'annual' | 'monthly'>('monthly');
  const [userCount, setUserCount] = useState<number>(1);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const annualCardRef = useRef<HTMLButtonElement | null>(null);
  const monthlyCardRef = useRef<HTMLButtonElement | null>(null);
  const { track } = useAnalytics();

  // Initialize with default value to avoid SSR/client hydration mismatch
  const [selectedTier, setSelectedTier] = useState<'plus' | 'business'>('plus');
  
  // Parse URL parameters after hydration to avoid SSR mismatch
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location) {
      try {
        const params = new URLSearchParams(window.location.search);
        const tier = params.get('tier');
        if (tier === 'business') {
          setSelectedTier('business');
        }
      } catch (error) {
        // Handle URL parsing errors gracefully
        console.warn('Failed to parse URL parameters:', error);
      }
    }
  }, []);
  const pricingPlan = mockPricingDataService.getPricingPlan(selectedTier) ?? mockPricingDataService.getPricingPlan('plus');
  const currencyCode = pricingPlan?.currency ?? 'USD';

  const { cartSession, status, error, isExpired, isOffline, retry, refresh } = useCartSession({
    planTier: selectedTier,
    planType,
    userCount,
    autoCreate: true,
    debounceMs: 100
  });

  // Force refresh when plan type changes
  useEffect(() => {
    if (cartSession && (cartSession.planType !== planType || cartSession.userCount !== userCount)) {
      refresh();
    }
  }, [planType, userCount, cartSession, refresh]);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const lastErrorCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!error) {
      lastErrorCodeRef.current = null;
      return;
    }

    if (lastErrorCodeRef.current === error.code) {
      return;
    }
    lastErrorCodeRef.current = error.code;

    if (error.code === 'offline') {
      showInfo(t('pricing.session.toast.offlineTitle'), t('pricing.session.toast.offlineMessage'));
      return;
    }

    if (['network', 'timeout', 'unknown'].includes(error.code)) {
      const code = error.code as SessionErrorToast;
      showError(
        t(`pricing.session.toast.${code}Title`),
        t(`pricing.session.toast.${code}Message`, { interpolation: { message: error.message ?? '' } })
      );
    }
  }, [error, showError, showInfo, t]);

  const userCountSchema = useMemo(
    () =>
      z.object({
        userCount: z
          .number({ message: t('pricing.validation.userCountNumber') })
          .int(t('pricing.validation.userCountInteger'))
          .min(1, t('pricing.validation.userCountMin'))
          .max(MAX_USER_COUNT, t('pricing.validation.userCountMax', { interpolation: { max: MAX_USER_COUNT } }))
      }),
    [t]
  );

  const pricePerSeat = useMemo(() => {
    if (!pricingPlan) return '';
    const formattedPrice = formatCurrency(pricingPlan.priceAmount, { 
      locale, 
      currency: pricingPlan.currency 
    });
    return t('pricing.summary.pricePerSeat', { price: formattedPrice });
  }, [pricingPlan, locale, t]);

  const lineItems = useMemo(() => {
    const subtotal = cartSession
      ? formatCurrency(cartSession.pricing.subtotal, { locale, currency: currencyCode, maximumFractionDigits: 2 })
      : t('pricing.summary.placeholder');

    const discountValue = cartSession
      ? cartSession.pricing.discount > 0
        ? `-${formatCurrency(cartSession.pricing.discount, { locale, currency: currencyCode, maximumFractionDigits: 2 })}`
        : formatCurrency(cartSession.pricing.discount, { locale, currency: currencyCode, maximumFractionDigits: 2 })
      : t('pricing.summary.placeholder');

    const total = cartSession
      ? formatCurrency(cartSession.pricing.total, { locale, currency: currencyCode, maximumFractionDigits: 2 })
      : t('pricing.summary.placeholder');

    return [
      { 
        id: 'subtotal', 
        label: t('common.subtotal'), 
        value: subtotal,
        numericValue: cartSession?.pricing.subtotal
      },
      { 
        id: 'discount', 
        label: t('common.discount'), 
        value: discountValue,
        numericValue: cartSession?.pricing.discount
      },
      { 
        id: 'total', 
        label: t('common.totalDueToday'), 
        value: total, 
        emphasis: true,
        numericValue: cartSession?.pricing.total
      }
    ];
  }, [cartSession, currencyCode, locale, t]);

  const planDescription = useMemo(
    () => {
      const billingPeriod = planType === 'annual' 
        ? t('pricing.summary.billingPeriodAnnual')
        : t('pricing.summary.billingPeriodMonthly');
      return t('pricing.summary.planDescription', {
        interpolation: {
          count: userCount,
          billingPeriod
        }
      });
    },
    [planType, userCount, t]
  );

  const summaryNotice = useMemo(() => {
    if (isExpired) {
      return {
        type: 'warning' as const,
        message: t('pricing.session.notice.expired')
      };
    }

    if (isOffline) {
      return {
        type: 'info' as const,
        message: t('pricing.session.notice.offline')
      };
    }

    return null;
  }, [isExpired, isOffline, t]);

  const summaryError = useMemo(() => {
    if (!error) return null;

    const base = {
      title: t('pricing.session.errors.defaultTitle'),
      message: error.message,
      action: {
        label: t('pricing.session.actions.retry'),
        onClick: retry
      }
    };

    switch (error.code) {
      case 'offline':
        return {
          title: t('pricing.session.errors.offline.title'),
          message: t('pricing.session.errors.offline.message'),
          action: {
            label: t('pricing.session.actions.retry'),
            onClick: retry
          }
        };
      case 'timeout':
        return {
          title: t('pricing.session.errors.timeout.title'),
          message: t('pricing.session.errors.timeout.message'),
          action: {
            label: t('pricing.session.actions.retry'),
            onClick: retry
          }
        };
      case 'network':
        return {
          title: t('pricing.session.errors.network.title'),
          message: error.message ?? t('pricing.session.errors.network.message'),
          action: {
            label: t('pricing.session.actions.retry'),
            onClick: retry
          }
        };
      case 'expired':
        return {
          title: t('pricing.session.errors.expired.title'),
          message: t('pricing.session.errors.expired.message'),
          action: {
            label: t('pricing.session.actions.refresh'),
            onClick: refresh
          }
        };
      default:
        return {
          ...base,
          title: t('pricing.session.errors.unknown.title'),
          message: error.message ?? t('pricing.session.errors.unknown.message')
        };
    }
  }, [error, refresh, retry, t]);

  const billingNote = planType === 'annual'
    ? t('pricing.summary.billingAnnual')
    : t('pricing.summary.billingMonthly');

  const handleProceedToCheckout = () => {
    if (!cartSession || status !== 'success' || isExpired) {
      return;
    }
    setIsNavigating(true);
    track('pricing_cart_checkout_clicked', {
      planType,
      userCount,
      cartId: cartSession.cartId
    });
    navigate('/pricing/checkout');
  };

  const handleCancel = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  const handlePlanSelectionKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const { key } = event;
    if (key === 'ArrowLeft' || key === 'ArrowUp') {
      event.preventDefault();
      const newPlanType = planType === 'annual' ? 'monthly' : 'annual';
      setPlanType(newPlanType);
      track('pricing_cart_plan_type_selected', { planType: newPlanType });
      // Focus the newly selected card
      setTimeout(() => {
        const targetRef = newPlanType === 'annual' ? annualCardRef : monthlyCardRef;
        targetRef.current?.focus();
      }, 0);
    } else if (key === 'ArrowRight' || key === 'ArrowDown') {
      event.preventDefault();
      const newPlanType = planType === 'monthly' ? 'annual' : 'monthly';
      setPlanType(newPlanType);
      track('pricing_cart_plan_type_selected', { planType: newPlanType });
      // Focus the newly selected card
      setTimeout(() => {
        const targetRef = newPlanType === 'annual' ? annualCardRef : monthlyCardRef;
        targetRef.current?.focus();
      }, 0);
    }
  };

  const annualPrice = pricingPlan
    ? `${currencyCode} ${formatCurrency(pricingPlan.priceAmount * 0.84, { // 16% off (100% - 16% = 84%)
        locale,
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}`
    : '';

  const annualOriginalPrice = pricingPlan
    ? `${currencyCode} ${formatCurrency(pricingPlan.priceAmount, {
        locale,
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}`
    : '';

  const monthlyPrice = pricingPlan
    ? `${currencyCode} ${formatCurrency(pricingPlan.priceAmount, {
        locale,
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}`
    : '';

  const breadcrumbSteps = useMemo(
    () => [
      {
        id: 'cart',
        label: t('pricing.breadcrumb.cart'),
        status: 'current' as const
      },
      {
        id: 'checkout',
        label: t('pricing.breadcrumb.checkout'),
        href: '/pricing/checkout',
        status: 'upcoming' as const
      },
      {
        id: 'confirmation',
        label: t('pricing.breadcrumb.confirmation'),
        status: 'upcoming' as const
      }
    ],
    [t]
  );

  useEffect(() => {
    if (isExpired) {
      setShowExpiryModal(true);
    }
  }, [isExpired]);

  useEffect(() => {
    if (!isExpired) {
      setShowExpiryModal(false);
    }
  }, [isExpired]);

  const featuresAnnual = [
    t('pricing.billedAnnuallyFeature'),
    t('pricing.minimumUsers'),
    t('pricing.addAndReassignUsers')
  ];

  const featuresMonthly = [
    t('pricing.billedMonthlyFeature'),
    t('pricing.minimumUsers'),
    t('pricing.addOrRemoveUsers')
  ];

  const initialFormData = useMemo(() => ({ userCount }), [userCount]);

  return (
    <CheckoutLayout
      className={className}
      breadcrumbs={breadcrumbSteps}
      breadcrumbAriaLabel={t('pricing.checkout.breadcrumbLabel')}
      title={t('pricing.pickYourPlan')}
      subtitle={t('pricing.planSelectionDescription')}
    >
      <Form
        initialData={initialFormData}
        schema={userCountSchema}
        validateOnChange
        onSubmit={handleProceedToCheckout}
      >
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          <div className="space-y-8">
            <section className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2" role="radiogroup" aria-labelledby="plan-selection-heading" tabIndex={0} onKeyDown={handlePlanSelectionKeyDown}>
                  <PlanCard
                    ref={annualCardRef}
                    title={t('pricing.annual')}
                    price={annualPrice}
                    originalPrice={annualOriginalPrice}
                    period={t('pricing.perUserPerMonth')}
                    features={featuresAnnual}
                    isSelected={planType === 'annual'}
                    hasDiscount
                    discountText={t('pricing.save16Percent')}
                    onClick={() => {
                      setPlanType('annual');
                      track('pricing_cart_plan_type_selected', { planType: 'annual' });
                    }}
                  />

                  <PlanCard
                    ref={monthlyCardRef}
                    title={t('pricing.monthly')}
                    price={monthlyPrice}
                    period={t('pricing.perUserPerMonth')}
                    features={featuresMonthly}
                    isSelected={planType === 'monthly'}
                    onClick={() => {
                      setPlanType('monthly');
                      track('pricing_cart_plan_type_selected', { planType: 'monthly' });
                    }}
                  />
                </div>
              </section>

              <section aria-labelledby="user-count-heading" className="space-y-4">
                <h3 id="user-count-heading" className="text-lg font-medium text-white">
                  {t('pricing.labels.userCount')}
                </h3>
                <p className="text-sm text-gray-400">{t('pricing.descriptions.userCount')}</p>

                <FormField name="userCount">
                  {({ value, error: fieldError, onChange }) => {
                    const numericValue = typeof value === 'number' ? value : userCount;

                    const handleValueChange = (nextValue: number | undefined) => {
                      if (typeof nextValue !== 'number') {
                        onChange(undefined);
                        return;
                      }

                      const clamped = Math.max(1, Math.min(MAX_USER_COUNT, Math.round(nextValue)));
                      onChange(clamped);
                      setUserCount(clamped);
                      track('pricing_cart_user_count_changed', { userCount: clamped });
                    };

                    return (
                      <FormItem>
                        <FormLabel htmlFor="user-count-input" required>
                          {t('pricing.labels.userCount')}
                        </FormLabel>
                        <FormControl>
                          <NumberInput
                            id="user-count-input"
                            value={numericValue}
                            min={1}
                            max={MAX_USER_COUNT}
                            step={1}
                            size="md"
                            showControls
                            onChange={handleValueChange}
                            variant={fieldError ? 'error' : 'default'}
                            error={fieldError?.message}
                          />
                        </FormControl>
                        <FormMessage>
                          {fieldError?.message}
                        </FormMessage>
                      </FormItem>
                    );
                  }}
                </FormField>
              </section>
            </div>

            <div>
              <PricingSummary
                heading={t('pricing.summary.heading')}
                planName={pricingPlan ? t('pricing.planLabel', { interpolation: { plan: pricingPlan.name } }) : ''}
                planDescription={planDescription}
                pricePerSeat={pricePerSeat}
                lineItems={lineItems}
                billingNote={billingNote}
                isAnnual={planType === 'annual'}
                primaryAction={{
                  label: t('pricing.continueToBilling'),
                  loadingLabel: t('pricing.processing'),
                  onClick: handleProceedToCheckout,
                  disabled: !cartSession || status !== 'success' || isExpired || isNavigating,
                  isLoading: isNavigating
                }}
                secondaryAction={{
                  label: t('pricing.cancel'),
                  onClick: handleCancel
                }}
                isLoading={status === 'loading'}
                error={summaryError}
                notice={summaryNotice}
              />
            </div>
          </div>
        </Form>

        <Modal
          isOpen={showExpiryModal}
          onClose={() => setShowExpiryModal(false)}
          title={t('pricing.session.expiredModal.title')}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-300">{t('pricing.session.expiredModal.body')}</p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowExpiryModal(false);
                  refresh();
                }}
                className="px-4 py-2 bg-accent-600 text-sm rounded-md hover:bg-accent-500"
              >
                {t('pricing.session.expiredModal.actions.refresh')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExpiryModal(false);
                  navigate('/pricing/cart');
                }}
                className="px-4 py-2 text-sm text-gray-200 hover:text-white"
              >
                {t('pricing.session.expiredModal.actions.dismiss')}
              </button>
            </div>
          </div>
        </Modal>
    </CheckoutLayout>
  );
};

export default PricingCart;
