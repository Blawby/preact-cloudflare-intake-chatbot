import { useState, useCallback } from 'preact/hooks';
import {
  getSubscriptionUpgradeEndpoint,
  getSubscriptionBillingPortalEndpoint,
  getSubscriptionSyncEndpoint,
} from '../config/api';
import { useToastContext } from '../contexts/ToastContext';

export interface SubscriptionUpgradeRequest {
  organizationId: string;
  seats?: number;
  annual?: boolean;
  successUrl?: string;
  cancelUrl?: string;
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

  const submitUpgrade = useCallback(
    async ({ organizationId, seats = 1, annual = false, successUrl, cancelUrl }: SubscriptionUpgradeRequest): Promise<void> => {
      setSubmitting(true);
      setError(null);

      try {
        const requestBody: Record<string, unknown> = {
          plan: 'business',
          referenceId: organizationId,
          annual,
          successUrl: successUrl ?? buildSuccessUrl(organizationId),
          cancelUrl: cancelUrl ?? buildCancelUrl(organizationId),
          returnUrl: successUrl ?? buildSuccessUrl(organizationId), // Add required returnUrl parameter
        };
        if (seats > 1) {
          requestBody.seats = seats;
        }
        
        console.log('🚀 Frontend sending subscription upgrade request:', {
          endpoint: getSubscriptionUpgradeEndpoint(),
          requestBody,
          organizationId,
          seats,
          annual
        });

        const response = await fetch(getSubscriptionUpgradeEndpoint(), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result || !result.url) {
          console.error('❌ Subscription upgrade failed with response:', result);
          const message = result?.error || 'Unable to initiate Stripe checkout';
          throw new Error(message);
        }

        window.location.href = result.url as string;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upgrade failed';
        setError(message);
        showError('Upgrade Failed', message);
      } finally {
        setSubmitting(false);
      }
    },
    [buildCancelUrl, buildSuccessUrl, showError]
  );

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
