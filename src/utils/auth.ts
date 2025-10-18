import { signOut as betterAuthSignOut } from '../lib/authClient';

/**
 * Centralized sign out utility that handles:
 * 1. Better Auth sign out (revokes session)
 * 2. Clear all localStorage (including onboarding flags)
 * 3. Optional callback for custom behavior
 */
export async function signOut(options?: {
  skipReload?: boolean;
  onSuccess?: () => void;
}): Promise<void> {
  try {
    // 1. Sign out from Better Auth (revokes server session)
    await betterAuthSignOut();
    
    // 2. Clear all localStorage including our custom flags
    try {
      localStorage.clear();
    } catch (error) {
      // Fallback: clear specific keys if clear() fails
      try {
        localStorage.removeItem('onboardingCompleted');
        localStorage.removeItem('onboardingCheckDone');
        // Add other custom keys as needed
      } catch (removeError) {
        console.warn('Failed to clear localStorage:', removeError);
      }
    }
    
    // 3. Run success callback if provided
    if (options?.onSuccess) {
      options.onSuccess();
    }
    
    // 4. Reload page to reset app state (unless explicitly skipped)
    if (!options?.skipReload) {
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

