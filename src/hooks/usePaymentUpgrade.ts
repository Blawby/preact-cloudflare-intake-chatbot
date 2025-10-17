import { useState, useCallback } from 'preact/hooks';
import {
  getSubscriptionUpgradeEndpoint,
  getSubscriptionBillingPortalEndpoint,
  getSubscriptionSyncEndpoint,
} from '../config/api';
import { useToastContext } from '../contexts/ToastContext';

export interface SubscriptionUpgradeRequest {
  organizationId: string;
  seats?: number | null;
  annual?: boolean;
  successUrl?: string;
  cancelUrl?: string;
  returnUrl?: string;
}

export interface BillingPortalRequest {
  organizationId: string;
  returnUrl?: string;
}

export const usePaymentUpgrade = () => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showError, showSuccess } = useToastContext();

  const buildSuccessUrl = useCallback((organizationId: string) => {
    if (typeof window === 'undefined') return '/settings/account';
    const url = new URL(window.location.origin + '/settings/account');
    url.searchParams.set('organizationId', organizationId);
    url.searchParams.set('sync', '1');
    return url.toString();
  }, []);

  const buildCancelUrl = useCallback((organizationId: string) => {
    if (typeof window === 'undefined') return '/settings/account';
    const url = new URL(window.location.origin + '/settings/account');
    url.searchParams.set('organizationId', organizationId);
    url.searchParams.set('cancelled', '1');
    return url.toString();
  }, []);

  const openBillingPortal = useCallback(
    async ({ organizationId, returnUrl }: BillingPortalRequest) => {
      try {
        const response = await fetch(getSubscriptionBillingPortalEndpoint(), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referenceId: organizationId,
            returnUrl: returnUrl ?? '/settings/account',
          }),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result?.url) {
          const message = result?.error || 'Unable to open billing portal';
          throw new Error(message);
        }

        window.location.href = result.url as string;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to open billing portal';
        showError('Billing Portal Error', message);
      }
    },
    [showError]
  );

  const submitUpgrade = useCallback(
    async ({ organizationId, seats = 1, annual = false, successUrl, cancelUrl, returnUrl }: SubscriptionUpgradeRequest): Promise<void> => {
      setSubmitting(true);
      setError(null);

      const resolvedSuccessUrl = successUrl ?? buildSuccessUrl(organizationId);
      const resolvedCancelUrl = cancelUrl ?? buildCancelUrl(organizationId);
      const resolvedReturnUrl = returnUrl ?? resolvedSuccessUrl;

      try {
        const requestBody: Record<string, unknown> = {
          plan: 'business',
          referenceId: organizationId,
          annual,
          successUrl: resolvedSuccessUrl,
          cancelUrl: resolvedCancelUrl,
          returnUrl: resolvedReturnUrl,
        };
        if (seats > 1) {
          requestBody.seats = seats;
        }
        

        const response = await fetch(getSubscriptionUpgradeEndpoint(), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result || !result.url) {
          if (import.meta.env.DEV) {
            // Only log in development, and sanitize sensitive data
            const sanitizedResult = {
              error: result?.error,
              success: result?.success,
              errorCode: result?.errorCode,
              // Exclude sensitive fields like organizationId, subscription details, etc.
            };
            console.error('❌ Subscription upgrade failed with response:', sanitizedResult);
          }
          const message = result?.error || 'Unable to initiate Stripe checkout';
          throw new Error(message);
        }

        window.location.href = result.url as string;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upgrade failed';
        const normalizedMessage = message.toLowerCase();

        if (normalizedMessage.includes("already subscribed to this plan")) {
          // Treat already-subscribed as a soft success: send the user to the billing portal so they can manage seats.
          setError(null);
          showSuccess(
            'Subscription Active',
            'Your organization already has an active Business subscription. Redirecting to the Stripe billing portal so you can manage it.'
          );
          await openBillingPortal({ organizationId, returnUrl: resolvedReturnUrl });
          return;
        }

        if (normalizedMessage.includes('email verification is required')) {
          setError(message);
          showError(
            'Verify Email',
            'Please verify your email address before upgrading. Check your inbox for the verification link.'
          );
          return;
        }

        setError(message);
        showError('Upgrade Failed', message);
      } finally {
        setSubmitting(false);
      }
    },
    [buildCancelUrl, buildSuccessUrl, openBillingPortal, showError, showSuccess]
  );

  const syncSubscription = useCallback(
    async (organizationId: string) => {
      try {
        const response = await fetch(getSubscriptionSyncEndpoint(), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId }),
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok || result?.success === false) {
          const message = result?.error || 'Failed to refresh subscription status';
          throw new Error(message);
        }

        showSuccess('Subscription updated', 'Your subscription status has been refreshed.');
        return result?.subscription ?? null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to refresh subscription status';
        showError('Subscription Sync Error', message);
        return null;
      }
    },
    [showError, showSuccess]
  );

  return {
    submitting,
    error,
    submitUpgrade,
    openBillingPortal,
    syncSubscription,
  };
};
