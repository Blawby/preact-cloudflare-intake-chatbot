import { useCallback } from 'preact/hooks';

export interface AnalyticsEvent {
  name: string;
  payload?: Record<string, unknown>;
}

const ANALYTICS_EVENT = 'analytics:event';

export const useAnalytics = () => {
  const track = useCallback((name: string, payload?: Record<string, unknown>) => {
    if (typeof window === 'undefined') {
      return;
    }

    const detail: AnalyticsEvent = { name, payload };
    window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail }));
  }, []);

  return { track };
};

export const addAnalyticsListener = (
  listener: (event: AnalyticsEvent) => void
) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<AnalyticsEvent>;
    listener(customEvent.detail);
  };

  window.addEventListener(ANALYTICS_EVENT, handler);
  return () => window.removeEventListener(ANALYTICS_EVENT, handler);
};
