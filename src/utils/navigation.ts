/**
 * Navigation utilities for the application
 * Provides programmatic navigation using preact-iso's routing system
 */

import { useLocation } from 'preact-iso';

/**
 * Hook for programmatic navigation
 * @returns Object with navigation functions
 */
export function useNavigation() {
  const location = useLocation();

  return {
    /**
     * Navigate to a new URL
     * @param url - The URL to navigate to
     * @param replace - Whether to replace the current history entry instead of adding a new one
     */
    navigate: (url: string, replace = false) => {
      location.route(url, replace);
    },

    /**
     * Navigate to auth page (no-op since auth is removed)
     * @param mode - Optional auth mode (ignored)
     */
    navigateToAuth: (mode?: string) => {
      console.log('Authentication not required for this application');
      // Navigate to home instead
      location.route('/');
    },

    /**
     * Navigate to the home page
     */
    navigateToHome: () => {
      location.route('/');
    },

    /**
     * Get current location information
     */
    getCurrentLocation: () => ({
      url: location.url,
      path: location.path,
      query: location.query
    })
  };
}
