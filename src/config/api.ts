// API Configuration
// Environment-aware configuration that uses relative URLs in production
// and explicit URLs in development

/**
 * Get the base URL for API requests
 * - In development: Uses VITE_API_URL if set, otherwise falls back to localhost
 * - In production: Uses relative URLs (same-origin) to avoid CORS issues
 */
function getBaseUrl(): string {
  // Check for explicit API URL (development/override)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production or when no explicit URL is set, use relative URLs
  // This works because frontend and API are served from the same domain
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback for SSR/build-time (should not be used in runtime)
  return '';
}

const API_CONFIG = {
  baseUrl: getBaseUrl(),
  chatEndpoint: '/api/chat',
  organizationsEndpoint: '/api/organizations',
  healthEndpoint: '/api/health',
  matterCreationEndpoint: '/api/matter-creation'
};

export const getApiConfig = () => {
  return API_CONFIG;
};

export const getChatEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}${config.chatEndpoint}`;
};

export const getFormsEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}/api/forms`;
};

export const getFeedbackEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}/api/feedback`;
};

export const getOrganizationsEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}${config.organizationsEndpoint}`;
};

export const getHealthEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}${config.healthEndpoint}`;
};

export const getMatterCreationEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}${config.matterCreationEndpoint}`;
};

export const getPaymentUpgradeEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}/api/payment/upgrade`;
};

export const getPaymentStatusEndpoint = (paymentId: string) => {
  const config = getApiConfig();
  const encodedId = encodeURIComponent(paymentId);
  return `${config.baseUrl}/api/payment/status/${encodedId}`;
};

export const getSubscriptionUpgradeEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}/api/auth/subscription/upgrade`;
};

export const getSubscriptionBillingPortalEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}/api/auth/subscription/billing-portal`;
};

export const getSubscriptionSyncEndpoint = () => {
  const config = getApiConfig();
  return `${config.baseUrl}/api/subscription/sync`;
};

export const getOrganizationWorkspaceEndpoint = (orgId: string, resource: string) => {
  const config = getApiConfig();
  return `${config.baseUrl}/api/organizations/${encodeURIComponent(orgId)}/workspace/${encodeURIComponent(resource)}`;
}; 
