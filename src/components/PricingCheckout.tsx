import { FunctionComponent } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { z } from 'zod';

import { useNavigation } from '../utils/navigation';
import { mockPaymentDataService } from '../utils/mockPaymentData';
import { mockPricingDataService } from '../utils/mockPricingData';
import { formatCurrency } from '../utils/intl';
import { useCartSession } from '../hooks/useCartSession';
import { useAnalytics } from '../hooks/useAnalytics';
import { useToastContext } from '../contexts/ToastContext';

import { useTranslation } from './ui/i18n/useTranslation';
import { CheckoutLayout } from './ui/layout';
import { PricingSummary } from './ui/cards';
import { Form } from './ui/form/Form';
import { FormField } from './ui/form/FormField';
import { FormItem } from './ui/form/FormItem';
import { FormMessage } from './ui/form/FormMessage';
import { Input } from './ui/input/Input';
import { Select } from './ui/input/Select';
import { Checkbox } from './ui/input/Checkbox';
import Modal from './Modal';
import { LoadingSpinner } from './ui/layout/LoadingSpinner';

const COUNTRY_OPTIONS = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' }
];

interface CheckoutFormData {
  [key: string]: unknown;
  fullName: string;
  email: string;
  company?: string;
  country: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  agreeTerms: boolean;
}

const emptyCheckoutData: CheckoutFormData = {
  fullName: '',
  email: '',
  company: '',
  country: 'US',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zipCode: '',
  cardNumber: '',
  cardExpiry: '',
  cardCvv: '',
  agreeTerms: false
};

interface PricingCheckoutProps {
  className?: string;
}

const PricingCheckout: FunctionComponent<PricingCheckoutProps> = ({ className = '' }) => {
  const { navigate } = useNavigation();
  const { showError, showSuccess } = useToastContext();
  const { t, i18n } = useTranslation('common');
  const { track } = useAnalytics();

  const locale = i18n.language || 'en';

  const initialSession = mockPaymentDataService.getActiveCartSession();
  const [checkoutData, setCheckoutData] = useState<CheckoutFormData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const sessionPlanTier = initialSession?.planTier ?? 'plus';
  const sessionPlanType = initialSession?.planType ?? 'monthly';
  const sessionUserCount = initialSession?.userCount ?? 1;

  const { cartSession, status, error, isExpired, refresh } = useCartSession({
    planTier: sessionPlanTier,
    planType: sessionPlanType,
    userCount: sessionUserCount,
    autoCreate: false
  });

  useEffect(() => {
    if (!initialSession) {
      showError(
        t('pricing.checkout.errors.cartMissing.title'),
        t('pricing.checkout.errors.cartMissing.message')
      );
      navigate('/pricing/cart');
    }
  }, [initialSession, navigate, showError, t]);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const checkoutSchema = useMemo(
    () =>
      z.object({
        fullName: z.string().min(1, t('pricing.checkout.validation.fullName')),
        email: z.string().email(t('pricing.checkout.validation.email')),
        company: z.string().optional(),
        country: z.string().min(1, t('pricing.checkout.validation.country')),
        addressLine1: z.string().min(1, t('pricing.checkout.validation.addressLine1')),
        addressLine2: z.string().optional(),
        city: z.string().min(1, t('pricing.checkout.validation.city')),
        state: z.string().min(1, t('pricing.checkout.validation.state')),
        zipCode: z.string().min(1, t('pricing.checkout.validation.zipCode')),
        cardNumber: z
          .string()
          .regex(/^[0-9]{12,19}$/u, t('pricing.checkout.validation.cardNumber')),
        cardExpiry: z
          .string()
          .regex(/^(0[1-9]|1[0-2])\/\d{2}$/u, t('pricing.checkout.validation.cardExpiry')),
        cardCvv: z
          .string()
          .regex(/^\d{3,4}$/u, t('pricing.checkout.validation.cardCvv')),
        agreeTerms: z.literal(true, {
          message: t('pricing.checkout.validation.terms')
        })
      }),
    [t]
  );

  const summaryLineItems = useMemo(() => {
    if (!cartSession) {
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
        value: formatCurrency(cartSession.pricing.subtotal, {
          locale,
          currency,
          maximumFractionDigits: 2
        })
      },
      {
        id: 'discount',
        label: t('pricing.summary.discount'),
        value: cartSession.pricing.discount > 0
          ? `-${formatCurrency(cartSession.pricing.discount, { locale, currency, maximumFractionDigits: 2 })}`
          : formatCurrency(cartSession.pricing.discount, { locale, currency, maximumFractionDigits: 2 })
      },
      {
        id: 'total',
        label: t('pricing.summary.total'),
        value: formatCurrency(cartSession.pricing.total, { locale, currency, maximumFractionDigits: 2 }),
        emphasis: true
      }
    ];
  }, [cartSession, locale, t]);

  const summaryStatus = useMemo(() => {
    if (!cartSession) {
      return {
        error: {
          title: t('pricing.checkout.errors.cartMissing.title'),
          message: t('pricing.checkout.errors.cartMissing.message'),
          actionLabel: t('pricing.checkout.actions.returnToCart'),
          onAction: () => navigate('/pricing/cart')
        }
      };
    }

    if (isExpired) {
      return {
        notice: {
          type: 'warning' as const,
          message: t('pricing.session.notice.expired')
        }
      };
    }

    if (error) {
      return {
        error: {
          title: t('pricing.session.errors.defaultTitle'),
          message: error.message,
          actionLabel: t('pricing.session.actions.refresh'),
          onAction: refresh
        }
      };
    }

    return {};
  }, [cartSession, error, isExpired, navigate, refresh, t]);

  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    if (!cartSession) {
      showError(
        t('pricing.checkout.errors.cartMissing.title'),
        t('pricing.checkout.errors.cartMissing.message')
      );
      return;
    }

    setIsProcessing(true);
    setCheckoutData(data as unknown as CheckoutFormData);

    try {
      const checkoutSession = mockPaymentDataService.createCheckoutSession(cartSession.cartId, {
        email: (data as unknown as CheckoutFormData).email,
        name: (data as unknown as CheckoutFormData).fullName,
        company: (data as unknown as CheckoutFormData).company || undefined
      });

      const result = await mockPaymentDataService.processPayment(checkoutSession.sessionId, {
        cardNumber: (data as unknown as CheckoutFormData).cardNumber,
        expiryDate: (data as unknown as CheckoutFormData).cardExpiry,
        cvv: (data as unknown as CheckoutFormData).cardCvv
      });

      if (!result.success) {
        throw new Error(result.error || 'Payment failed');
      }

      showSuccess(t('pricing.checkout.toast.successTitle'), t('pricing.checkout.toast.successMessage'));
      track('pricing_checkout_payment_confirmed', {
        cartId: cartSession.cartId,
        planType: cartSession.planType,
        userCount: cartSession.userCount
      });
      navigate('/pricing/confirmation');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      showError(t('pricing.checkout.toast.errorTitle'), message);
      track('pricing_checkout_payment_failed', {
        cartId: cartSession?.cartId,
        error: err instanceof Error ? err.message : err
      });
    } finally {
      setIsProcessing(false);
    }
  };


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
        status: 'current' as const
      },
      {
        id: 'confirmation',
        label: t('pricing.breadcrumb.confirmation'),
        status: 'upcoming' as const
      }
    ],
    [t]
  );

  return (
    <CheckoutLayout
      className={className}
      breadcrumbs={breadcrumbSteps}
      breadcrumbAriaLabel={t('pricing.checkout.breadcrumbLabel')}
      title={t('pricing.checkout.pageTitle')}
      subtitle={t('pricing.checkout.pageSubtitle')}
    >

        <Form
          initialData={emptyCheckoutData}
          schema={checkoutSchema}
          validateOnChange
          className="space-y-8"
          onSubmit={handleFormSubmit}
        >
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
            <div className="space-y-8">
              <section className="space-y-4">
                <h2 className="text-xl font-semibold">
                  {t('pricing.checkout.sections.contact')}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField name="fullName">
                    {({ value, error, onChange }) => (
                      <FormItem>
                        <Input
                          id="full-name"
                          value={(value as string) ?? ''}
                          onChange={onChange}
                          label={t('pricing.checkout.labels.fullName')}
                          placeholder={t('pricing.checkout.placeholders.fullName')}
                          required
                          variant={error ? 'error' : 'default'}
                          error={error?.message}
                        />
                      </FormItem>
                    )}
                  </FormField>
                  <FormField name="email">
                    {({ value, error, onChange }) => (
                      <FormItem>
                        <Input
                          id="email"
                          type="email"
                          value={(value as string) ?? ''}
                          onChange={onChange}
                          label={t('pricing.checkout.labels.email')}
                          placeholder={t('pricing.checkout.placeholders.email')}
                          required
                          variant={error ? 'error' : 'default'}
                          error={error?.message}
                        />
                      </FormItem>
                    )}
                  </FormField>
                  <FormField name="company">
                    {({ value, error, onChange }) => (
                      <FormItem className="sm:col-span-2">
                        <Input
                          id="company"
                          value={(value as string) ?? ''}
                          onChange={onChange}
                          label={t('pricing.checkout.labels.company')}
                          placeholder={t('pricing.checkout.placeholders.company')}
                          variant={error ? 'error' : 'default'}
                          error={error?.message}
                        />
                      </FormItem>
                    )}
                  </FormField>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold">
                  {t('pricing.checkout.sections.billing')}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField name="country">
                    {({ value, error, onChange }) => (
                      <FormItem>
                        <Select
                          label={t('pricing.checkout.labels.country')}
                          value={value as string}
                          onChange={(val) => onChange(val)}
                          options={COUNTRY_OPTIONS}
                          placeholder={t('pricing.checkout.placeholders.country')}
                          className="text-gray-900"
                        />
                        <FormMessage>{error?.message}</FormMessage>
                      </FormItem>
                    )}
                  </FormField>
                  <div />
                  <FormField name="addressLine1">
                    {({ value, error, onChange }) => (
                      <FormItem className="sm:col-span-2">
                        <Input
                          id="address-line1"
                          value={(value as string) ?? ''}
                          onChange={onChange}
                          label={t('pricing.checkout.labels.addressLine1')}
                          placeholder={t('pricing.checkout.placeholders.addressLine1')}
                          required
                          variant={error ? 'error' : 'default'}
                          error={error?.message}
                        />
                      </FormItem>
                    )}
                  </FormField>
                  <FormField name="addressLine2">
                    {({ value, error, onChange }) => (
                      <FormItem className="sm:col-span-2">
                        <Input
                          id="address-line2"
                          value={(value as string) ?? ''}
                          onChange={onChange}
                          label={t('pricing.checkout.labels.addressLine2')}
                          placeholder={t('pricing.checkout.placeholders.addressLine2')}
                          variant={error ? 'error' : 'default'}
                          error={error?.message}
                        />
                      </FormItem>
                    )}
                  </FormField>
                  <FormField name="city">
                    {({ value, error, onChange }) => (
                      <FormItem>
                        <Input
                          id="city"
                          value={(value as string) ?? ''}
                          onChange={onChange}
                          label={t('pricing.checkout.labels.city')}
                          placeholder={t('pricing.checkout.placeholders.city')}
                          required
                          variant={error ? 'error' : 'default'}
                          error={error?.message}
                        />
                      </FormItem>
                    )}
                  </FormField>
                  <FormField name="state">
                    {({ value, error, onChange }) => (
                      <FormItem>
                        <Input
                          id="state"
                          value={(value as string) ?? ''}
                          onChange={onChange}
                          label={t('pricing.checkout.labels.state')}
                          placeholder={t('pricing.checkout.placeholders.state')}
                          required
                          variant={error ? 'error' : 'default'}
                          error={error?.message}
                        />
                      </FormItem>
                    )}
                  </FormField>
                  <FormField name="zipCode">
                    {({ value, error, onChange }) => (
                      <FormItem>
                        <Input
                          id="zip"
                          value={(value as string) ?? ''}
                          onChange={onChange}
                          label={t('pricing.checkout.labels.zipCode')}
                          placeholder={t('pricing.checkout.placeholders.zipCode')}
                          required
                          variant={error ? 'error' : 'default'}
                          error={error?.message}
                        />
                      </FormItem>
                    )}
                  </FormField>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold">
                  {t('pricing.checkout.sections.payment')}
                </h2>
                
                {/* Stripe Elements Placeholder */}
                <div className="border border-gray-600 rounded-lg p-6 bg-gray-800/50">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Stripe Elements Integration</span>
                    </div>
                    
                    {/* Card Number Field Placeholder */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        {t('pricing.checkout.labels.cardNumber')}
                      </label>
                      <div className="h-10 bg-gray-700 border border-gray-600 rounded-md flex items-center px-3">
                        <div className="flex space-x-1">
                          <div className="w-8 h-1 bg-gray-500 rounded"></div>
                          <div className="w-8 h-1 bg-gray-500 rounded"></div>
                          <div className="w-8 h-1 bg-gray-500 rounded"></div>
                          <div className="w-8 h-1 bg-gray-500 rounded"></div>
                          <span className="text-gray-400 text-sm ml-2">•••• •••• •••• ••••</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expiry and CVV Fields Placeholder */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">
                          {t('pricing.checkout.labels.cardExpiry')}
                        </label>
                        <div className="h-10 bg-gray-700 border border-gray-600 rounded-md flex items-center px-3">
                          <span className="text-gray-400 text-sm">MM/AA</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">
                          {t('pricing.checkout.labels.cardCvv')}
                        </label>
                        <div className="h-10 bg-gray-700 border border-gray-600 rounded-md flex items-center px-3">
                          <span className="text-gray-400 text-sm">•••</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Stripe Branding */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-600">
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <span>Powered by</span>
                        <div className="font-semibold text-white">Stripe</div>
                      </div>
                      <div className="flex space-x-1">
                        <div className="w-6 h-4 bg-gray-600 rounded-sm"></div>
                        <div className="w-6 h-4 bg-gray-600 rounded-sm"></div>
                        <div className="w-6 h-4 bg-gray-600 rounded-sm"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

            </div>

            <div>
              <PricingSummary
                heading={t('pricing.summary.heading')}
                planName={cartSession ? t('pricing.planLabel', { interpolation: { plan: cartSession.planTier === 'business' ? t('pricing.checkout.planBusiness') : t('pricing.checkout.planPlus') } }) : ''}
                planDescription={cartSession ? t('pricing.summary.planDescription', {
                  interpolation: {
                    count: cartSession.userCount,
                    billingPeriod: cartSession.planType === 'annual'
                      ? t('pricing.summary.billingPeriodAnnual')
                      : t('pricing.summary.billingPeriodMonthly')
                  }
                }) : ''}
                pricePerSeat={cartSession ? t('pricing.summary.pricePerSeat', {
                  interpolation: {
                    price: formatCurrency(mockPricingDataService.getPricingPlan(cartSession.planTier)?.priceAmount ?? 0, {
                      locale,
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })
                  }
                }) : ''}
                lineItems={summaryLineItems}
                billingNote={cartSession ? (cartSession.planType === 'annual' ? t('pricing.summary.billingAnnual') : t('pricing.summary.billingMonthly')) : ''}
                isAnnual={cartSession?.planType === 'annual'}
                primaryAction={{
                  label: t('pricing.checkout.actions.submit'),
                  loadingLabel: t('pricing.checkout.actions.processing'),
                  onClick: () => submitButtonRef.current?.click(),
                  disabled: !cartSession || isExpired || isProcessing,
                  isLoading: isProcessing
                }}
                secondaryAction={{
                  label: t('pricing.checkout.actions.returnToCart'),
                  onClick: () => navigate('/pricing/cart')
                }}
                isLoading={status === 'loading'}
                error={summaryStatus.error ?? null}
                notice={summaryStatus.notice ?? null}
              />
              
              {/* Terms Agreement - Right Side */}
              <div className="mt-6">
                <FormField name="agreeTerms">
                  {({ value, error, onChange }) => (
                    <FormItem>
                      <Checkbox
                        checked={Boolean(value)}
                        onChange={onChange}
                        label={t('pricing.checkout.labels.agreeTerms')}
                        description={t('pricing.checkout.descriptions.agreeTerms')}
                        error={error?.message}
                        required
                      />
                    </FormItem>
                  )}
                </FormField>
              </div>
            </div>
          </div>

          <button type="submit" ref={submitButtonRef} className="hidden" aria-hidden="true" />
        </Form>
    </CheckoutLayout>
  );
};

export default PricingCheckout;
