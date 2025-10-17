// API Configuration
// Hardcoded targets for local vs. deployed environments.
const resolveBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'http://localhost:8787';
    }
  }

  // Default to production domain when not running in a browser (SSR/build) or when on a custom domain.
  return 'https://ai.blawby.com';
};

const API_BASE_URL = resolveBaseUrl();

const join = (path: string) => `${API_BASE_URL}${path}`;

export const getChatEndpoint = () => join('/api/chat');

export const getFormsEndpoint = () => join('/api/forms');

export const getFeedbackEndpoint = () => join('/api/feedback');

export const getOrganizationsEndpoint = () => join('/api/organizations');

export const getHealthEndpoint = () => join('/api/health');

export const getMatterCreationEndpoint = () => join('/api/matter-creation');

export const getPaymentUpgradeEndpoint = () => join('/api/payment/upgrade');

export const getPaymentStatusEndpoint = (paymentId: string) => {
  const encodedId = encodeURIComponent(paymentId);
  return join(`/api/payment/status/${encodedId}`);
};

export const getSubscriptionUpgradeEndpoint = () => join('/api/auth/subscription/upgrade');

export const getSubscriptionBillingPortalEndpoint = () => join('/api/auth/subscription/billing-portal');

export const getSubscriptionSyncEndpoint = () => join('/api/subscription/sync');

export const getOrganizationWorkspaceEndpoint = (orgId: string, resource: string) => {
  return join(`/api/organizations/${encodeURIComponent(orgId)}/workspace/${encodeURIComponent(resource)}`);
};
