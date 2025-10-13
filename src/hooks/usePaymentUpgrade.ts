import { useState, useCallback, useRef, useEffect } from 'preact/hooks';
import { getPaymentUpgradeEndpoint, getPaymentStatusEndpoint } from '../config/api';
import { useToastContext } from '../contexts/ToastContext';

export interface CreateSubscriptionRequest {
  organizationName: string;
  existingOrganizationId?: string;
  price_id: string; // Stripe Price ID
  quantity: number;
  billing: {
    name: string;
    email: string;
    address: {
      line1: string;
      city: string;
      postal_code: string;
      country: string;
    };
  };
}

export interface PaymentUpgradeResponse {
  success: boolean;
  paymentId?: string;
  redirectUrl?: string;
  invoiceUrl?: string;
  error?: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentId: string;
  error?: string;
}

export const usePaymentUpgrade = () => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'completed' | 'failed' | 'cancelled'>('idle');
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { showSuccess, showError } = useToastContext();

      const submitUpgrade = useCallback(async (data: CreateSubscriptionRequest): Promise<void> => {
    setSubmitting(true);
    setError(null);
    setPaymentStatus('pending');

    try {
      const response = await fetch(getPaymentUpgradeEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json() as PaymentUpgradeResponse;
      
      if (result.success) {
        setPaymentId(result.paymentId || null);
        setInvoiceUrl(result.invoiceUrl || null);
        setPaymentStatus('pending');
        showSuccess(
          'Upgrade Submitted',
          'Your business plan upgrade is being processed.'
        );
      } else {
        throw new Error(result.error || 'Upgrade submission failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upgrade submission failed';
      setError(errorMessage);
      setPaymentStatus('failed');
      showError(
        'Upgrade Failed',
        'There was an error submitting your upgrade. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }, [showSuccess, showError]);

  const checkPaymentStatus = useCallback(async (paymentId: string): Promise<PaymentStatusResponse> => {
    try {
      const response = await fetch(getPaymentStatusEndpoint(paymentId), {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json() as PaymentStatusResponse;
      
      if (result.success) {
        setPaymentStatus(result.status);
        
        if (result.status === 'completed') {
          showSuccess(
            'Payment Successful',
            'Your organization has been upgraded successfully!'
          );
        } else if (result.status === 'failed') {
          showError(
            'Payment Failed',
            'Your payment could not be processed. Please try again.'
          );
        }
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check payment status';
      setError(errorMessage);
      return { 
        success: false, 
        status: (paymentStatus === 'idle' ? 'pending' : paymentStatus) as 'pending' | 'completed' | 'failed' | 'cancelled', 
        paymentId, 
        error: errorMessage 
      };
    }
  }, [showSuccess, showError, paymentStatus]);

  const pollPaymentStatus = useCallback((paymentId: string, maxRetries: number = 20) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current);
    }

    let retryCount = 0;

    // Start sequential polling
    const poll = async () => {
      // Check if we've exceeded max retries
      if (retryCount >= maxRetries) {
        stopPolling();
        setError('Payment status check timed out after maximum retries');
        showError(
          'Payment Status Timeout',
          'Unable to verify payment status. Please check your account or contact support.'
        );
        return;
      }

      retryCount++;

      try {
        const result = await checkPaymentStatus(paymentId);
        
        // Stop polling if payment is completed or failed
        if (result.status === 'completed' || result.status === 'failed' || result.status === 'cancelled') {
          stopPolling();
        } else {
          // Schedule next poll after 3 seconds
          pollingIntervalRef.current = setTimeout(poll, 3000);
        }
      } catch (err) {
        // Network error or other exception - schedule retry
        pollingIntervalRef.current = setTimeout(poll, 3000);
      }
    };

    // Start the first poll
    poll();
  }, [checkPaymentStatus, showError]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    submitUpgrade,
    checkPaymentStatus,
    pollPaymentStatus,
    stopPolling,
    submitting,
    error,
    paymentStatus,
    invoiceUrl,
    paymentId,
  };
};