import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  mockPaymentDataService,
  type CartSession,
  type PlanData
} from '../utils/mockPaymentData';
import {
  retryWithBackoff,
  RetryError,
  RetryTimeoutError
} from '../utils/network/retry';

export type CartSessionStatus = 'idle' | 'loading' | 'success' | 'error';

export type CartSessionErrorCode = 'offline' | 'timeout' | 'network' | 'expired' | 'unknown';

export interface CartSessionError {
  code: CartSessionErrorCode;
  message?: string;
}

export interface UseCartSessionOptions {
  planTier: 'plus' | 'business';
  planType: 'annual' | 'monthly';
  userCount: number;
  autoCreate?: boolean;
  debounceMs?: number;
}

export interface UseCartSessionReturn {
  cartSession: CartSession | null;
  status: CartSessionStatus;
  error: CartSessionError | null;
  isOffline: boolean;
  isExpired: boolean;
  lastUpdated: number | null;
  attemptCount: number;
  retry: () => void;
  refresh: () => void;
  clear: () => void;
}

type SessionRequestReason = 'auto' | 'retry' | 'refresh';

type TimeoutId = ReturnType<typeof setTimeout> | null;

const isSessionExpired = (session: CartSession | null): boolean => {
  if (!session) return false;
  const expiresAt = new Date(session.expiresAt).getTime();
  if (Number.isNaN(expiresAt)) return false;
  return expiresAt <= Date.now();
};

export const useCartSession = ({
  planTier,
  planType,
  userCount,
  autoCreate = true,
  debounceMs = 300
}: UseCartSessionOptions): UseCartSessionReturn => {
  const initialSession = mockPaymentDataService.getActiveCartSession();
  const [cartSession, setCartSession] = useState<CartSession | null>(initialSession);
  const [status, setStatus] = useState<CartSessionStatus>(initialSession ? 'success' : 'idle');
  const [error, setError] = useState<CartSessionError | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(initialSession ? Date.now() : null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isExpired, setIsExpired] = useState<boolean>(isSessionExpired(initialSession));

  const planDataRef = useRef<PlanData>({ planTier, planType, userCount });
  const requestIdRef = useRef(0);
  const debounceRef = useRef<TimeoutId>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const setCartSessionSafely = useCallback((session: CartSession | null) => {
    if (!isMountedRef.current) return;
    setCartSession(session);
  }, []);

  const setStatusSafely = useCallback((nextStatus: CartSessionStatus) => {
    if (!isMountedRef.current) return;
    setStatus(nextStatus);
  }, []);

  const setErrorSafely = useCallback((nextError: CartSessionError | null) => {
    if (!isMountedRef.current) return;
    setError(nextError);
  }, []);

  const setLastUpdatedSafely = useCallback((timestamp: number | null) => {
    if (!isMountedRef.current) return;
    setLastUpdated(timestamp);
  }, []);

  const setAttemptCountSafely = useCallback((updater: (prev: number) => number) => {
    if (!isMountedRef.current) return;
    setAttemptCount(updater);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Initialize offline state after hydration to avoid SSR mismatch
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }
    
    return () => {
      isMountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    planDataRef.current = { planTier, planType, userCount };
  }, [planTier, planType, userCount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnlineState = () => {
      const offline = !navigator.onLine;
      setIsOffline(offline);
      if (!offline && error?.code === 'offline') {
        setErrorSafely(null);
      }
    };

    handleOnlineState();
    window.addEventListener('online', handleOnlineState);
    window.addEventListener('offline', handleOnlineState);

    return () => {
      window.removeEventListener('online', handleOnlineState);
      window.removeEventListener('offline', handleOnlineState);
    };
  }, [error, setErrorSafely]);

  useEffect(() => {
    if (isSessionExpired(cartSession)) {
      setIsExpired(true);
      return;
    }

    if (!cartSession) {
      setIsExpired(false);
      return;
    }

    if (typeof window === 'undefined') {
      setIsExpired(false);
      return;
    }

    setIsExpired(false);
    const expiresAt = new Date(cartSession.expiresAt).getTime();
    const delay = expiresAt - Date.now();

    if (delay <= 0) {
      setIsExpired(true);
      return;
    }

    if (typeof window !== 'undefined') {
      const timer = window.setTimeout(() => {
        setIsExpired(true);
      }, delay);

      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [cartSession]);

  const runSessionRequest = useCallback(
    async (reason: SessionRequestReason = 'auto') => {
      if (isOffline) {
        setStatusSafely('error');
        setErrorSafely({ code: 'offline' });
        return;
      }

      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;
      setStatusSafely('loading');
      setErrorSafely(null);
      setAttemptCountSafely(() => 0);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const session = await retryWithBackoff<CartSession>(() =>
          Promise.resolve().then(() => {
            const planData = planDataRef.current;
            const activeSession = mockPaymentDataService.getActiveCartSession();

            if (activeSession && isSessionExpired(activeSession)) {
              mockPaymentDataService.clearCartSession();
              throw new Error('Session expired');
            }

            if (activeSession) {
              const hasPlanChanged =
                activeSession.planTier !== planData.planTier ||
                activeSession.planType !== planData.planType ||
                activeSession.userCount !== planData.userCount;

              if (!hasPlanChanged && reason !== 'refresh') {
                return activeSession;
              }

              if (hasPlanChanged) {
                const updated = mockPaymentDataService.updateCartSession(activeSession.cartId, planData);
                if (!updated) {
                  throw new Error('Failed to update cart session');
                }
                return updated;
              }

              if (reason === 'refresh') {
                mockPaymentDataService.clearCartSession();
              }
            }

            const newSession = mockPaymentDataService.createCartSession(planData);
            return newSession;
          }),
        {
          retries: 3,
          baseDelayMs: 300,
          maxDelayMs: 2000,
          timeoutMs: 5000,
          signal: controller.signal,
          shouldRetry: (retryError) => {
            if (retryError instanceof Error && retryError.name === 'AbortError') {
              return false;
            }
            if (retryError instanceof Error && retryError.message === 'Session expired') {
              return false;
            }
            return true;
          },
          onRetry: () => {
            setAttemptCountSafely((prev) => prev + 1);
          }
        }
        );

        if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
          return;
        }

        setCartSessionSafely(session);
        setStatusSafely('success');
        setErrorSafely(null);
        setLastUpdatedSafely(Date.now());
      } catch (sessionError) {
        if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
          return;
        }

        if (sessionError instanceof Error && sessionError.name === 'AbortError') {
          return;
        }

        setStatusSafely('error');

        if (sessionError instanceof RetryTimeoutError) {
          setErrorSafely({ code: 'timeout' });
          return;
        }

        if (sessionError instanceof RetryError) {
          const cause = sessionError.cause;
          if (cause instanceof Error && cause.message === 'Session expired') {
            mockPaymentDataService.clearCartSession();
            setCartSessionSafely(null);
            setErrorSafely({ code: 'expired' });
            return;
          }
          const message = cause instanceof Error ? cause.message : undefined;
          setErrorSafely({ code: 'network', message });
          return;
        }

        if (sessionError instanceof Error && sessionError.message === 'Session expired') {
          mockPaymentDataService.clearCartSession();
          setCartSessionSafely(null);
          setErrorSafely({ code: 'expired' });
          return;
        }

        const message = sessionError instanceof Error ? sessionError.message : undefined;
        setErrorSafely({ code: 'unknown', message });
      }
    },
    [isOffline, setAttemptCountSafely, setCartSessionSafely, setErrorSafely, setLastUpdatedSafely, setStatusSafely]
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!autoCreate) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      void runSessionRequest('auto');
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [autoCreate, debounceMs, runSessionRequest]);

  const retry = useCallback(() => {
    void runSessionRequest('retry');
  }, [runSessionRequest]);

  const refresh = useCallback(() => {
    void runSessionRequest('refresh');
  }, [runSessionRequest]);

  const clear = useCallback(() => {
    mockPaymentDataService.clearCartSession();
    setCartSessionSafely(null);
    setStatusSafely('idle');
    setErrorSafely(null);
    setLastUpdatedSafely(null);
    setAttemptCountSafely(() => 0);
  }, [setAttemptCountSafely, setCartSessionSafely, setErrorSafely, setLastUpdatedSafely, setStatusSafely]);

  useEffect(() => {
    if (!isOffline && error?.code === 'offline' && autoCreate) {
      void runSessionRequest('retry');
    }
  }, [autoCreate, error, isOffline, runSessionRequest]);

  return {
    cartSession,
    status,
    error,
    isOffline,
    isExpired,
    lastUpdated,
    attemptCount,
    retry,
    refresh,
    clear
  };
};
