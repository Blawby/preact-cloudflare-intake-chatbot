import { useState, useEffect, useCallback } from 'preact/hooks';
import { migrateLegacySession, isSessionMigrated } from '../utils/sessionMigration';
import { useCrossTabSync, useStorageEventSync } from './useCrossTabSync';

export interface DeviceInfo {
  userAgent: string;
  browser?: string;
  os?: string;
  device?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
}

export interface SessionData {
  id: string;
  teamId: string;
  userFingerprint?: string;
  deviceInfo?: DeviceInfo;
  locationInfo?: {
    country?: string;
    region?: string;
    city?: string;
  };
  status: 'active' | 'expired' | 'terminated';
  lastAccessed: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UseEnhancedSessionOptions {
  teamId: string;
  autoCreate?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in minutes
  crossTabSync?: boolean; // Enable cross-tab synchronization
}

export interface UseEnhancedSessionReturn {
  sessionId: string | null;
  sessionData: SessionData | null;
  isLoading: boolean;
  error: string | null;
  isValid: boolean;
  createSession: () => Promise<string | null>;
  validateSession: (sessionId: string) => Promise<boolean>;
  refreshSession: () => Promise<void>;
  terminateSession: () => Promise<void>;
  userFingerprint: string;
}

export const useEnhancedSession = (options: UseEnhancedSessionOptions): UseEnhancedSessionReturn => {
  const { teamId, autoCreate = true, autoRefresh = true, refreshInterval = 30, crossTabSync = true } = options;
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [userFingerprint] = useState<string>(() => generateDeviceFingerprint());

  /**
   * Cross-tab synchronization
   */
  const {
    broadcastSessionChange,
    broadcastSessionExpired,
    broadcastSessionTerminated,
    broadcastSessionRefresh
  } = useCrossTabSync({
    sessionId,
    enabled: crossTabSync,
    onSessionChanged: (newSessionId) => {
      console.log('📡 Session changed from another tab:', newSessionId);
      setSessionId(newSessionId);
      
      // Update localStorage and URL
      localStorage.setItem('blawby-session-id', newSessionId);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('session', newSessionId);
      window.history.replaceState(null, '', newUrl.toString());
      
      // Validate the new session
      validateSession(newSessionId);
    },
    onSessionExpired: () => {
      console.log('📡 Session expired from another tab');
      setIsValid(false);
      setSessionData(null);
      setError('Session expired in another tab');
    },
    onSessionTerminated: () => {
      console.log('📡 Session terminated from another tab');
      setSessionId(null);
      setSessionData(null);
      setIsValid(false);
      localStorage.removeItem('blawby-session-id');
      localStorage.removeItem('blawby-user-fingerprint');
    }
  });

  // Fallback storage event sync for older browsers
  useStorageEventSync({
    sessionId,
    enabled: crossTabSync && typeof BroadcastChannel === 'undefined',
    onSessionChanged: (newSessionId) => {
      console.log('💾 Session changed via storage event:', newSessionId);
      setSessionId(newSessionId);
      validateSession(newSessionId);
    },
    onSessionExpired: () => {
      console.log('💾 Session expired via storage event');
      setIsValid(false);
      setError('Session expired');
    },
    onSessionTerminated: () => {
      console.log('💾 Session terminated via storage event');
      setSessionId(null);
      setIsValid(false);
    }
  });

  /**
   * Generate a device fingerprint for anonymous user identification
   */
  function generateDeviceFingerprint(): string {
    if (typeof window === 'undefined') return 'server-side';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('fingerprint', 10, 10);
    const canvasFingerprint = canvas.toDataURL();

    const fingerprints = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      navigator.platform,
      navigator.cookieEnabled.toString(),
      canvasFingerprint.slice(-50), // Last 50 chars of canvas fingerprint
    ].join('|');

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprints.length; i++) {
      const char = fingerprints.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Collect device information
   */
  function collectDeviceInfo(): DeviceInfo {
    if (typeof window === 'undefined') {
      return { userAgent: 'server-side' };
    }

    return {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    };
  }

  /**
   * Create a new enhanced session
   */
  const createSession = useCallback(async (): Promise<string | null> => {
    if (!teamId) return null;

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Creating enhanced session for team:', teamId);

      const deviceInfo = collectDeviceInfo();

      const response = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teamId,
          userFingerprint,
          deviceInfo
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data.sessionId) {
        const newSessionId = result.data.sessionId;
        setSessionId(newSessionId);
        setIsValid(true);

        // Store in localStorage as backup
        localStorage.setItem('blawby-session-id', newSessionId);
        localStorage.setItem('blawby-user-fingerprint', userFingerprint);

        // Update URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('session', newSessionId);
        window.history.replaceState(null, '', newUrl.toString());

        // Broadcast session change to other tabs
        broadcastSessionChange(newSessionId);

        console.log('✅ Enhanced session created:', newSessionId);
        return newSessionId;
      } else {
        throw new Error(result.error || 'Failed to create session');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      setError(errorMessage);
      console.error('❌ Error creating enhanced session:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [teamId, userFingerprint]);

  /**
   * Validate an existing session
   */
  const validateSession = useCallback(async (sessionIdToValidate: string): Promise<boolean> => {
    if (!sessionIdToValidate) return false;

    try {
      console.log('🔍 Validating enhanced session:', sessionIdToValidate);

      const response = await fetch(`/api/sessions/${sessionIdToValidate}/validate`);
      
      if (!response.ok) {
        throw new Error(`Validation failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data.valid) {
        setSessionData(result.data.session);
        setIsValid(true);
        setError(null);
        console.log('✅ Session is valid:', sessionIdToValidate);
        return true;
      } else {
        setIsValid(false);
        setError(result.data.reason || 'Session is invalid');
        console.log('❌ Session is invalid:', result.data.reason);
        return false;
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation failed';
      setError(errorMessage);
      setIsValid(false);
      console.error('❌ Error validating session:', err);
      return false;
    }
  }, []);

  /**
   * Refresh session expiration
   */
  const refreshSession = useCallback(async (): Promise<void> => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}/refresh`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status} ${response.statusText}`);
      }

      // Broadcast session refresh to other tabs
      broadcastSessionRefresh();

      console.log('🔄 Session refreshed:', sessionId);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Refresh failed';
      setError(errorMessage);
      console.error('❌ Error refreshing session:', err);
    }
  }, [sessionId]);

  /**
   * Terminate current session
   */
  const terminateSession = useCallback(async (): Promise<void> => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Termination failed: ${response.status} ${response.statusText}`);
      }

      // Clear local state
      setSessionId(null);
      setSessionData(null);
      setIsValid(false);

      // Broadcast session termination to other tabs
      broadcastSessionTerminated();

      // Clear localStorage
      localStorage.removeItem('blawby-session-id');
      localStorage.removeItem('blawby-user-fingerprint');

      console.log('🛑 Session terminated:', sessionId);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Termination failed';
      setError(errorMessage);
      console.error('❌ Error terminating session:', err);
    }
  }, [sessionId]);

  /**
   * Initialize session on mount with migration support
   */
  useEffect(() => {
    if (!teamId) return;

    const initializeSession = async () => {
      setIsLoading(true);

      // Check URL parameters first
      const urlParams = new URLSearchParams(window.location.search);
      const urlSessionId = urlParams.get('session');

      let candidateSessionId: string | null = null;

      if (urlSessionId && urlSessionId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        candidateSessionId = urlSessionId;
        console.log('📍 Found session in URL:', candidateSessionId);
      } else {
        // Try localStorage
        candidateSessionId = localStorage.getItem('blawby-session-id');
        console.log('💾 Found session in localStorage:', candidateSessionId);
      }

      // Handle legacy session migration
      if (candidateSessionId && !isSessionMigrated()) {
        console.log('🔄 Attempting legacy session migration...');
        try {
          const migrationResult = await migrateLegacySession(teamId);
          
          if (migrationResult.success && migrationResult.sessionId) {
            candidateSessionId = migrationResult.sessionId;
            console.log('✅ Legacy session migrated:', candidateSessionId);
          } else {
            console.log('⚠️ Migration failed, will create new session');
            candidateSessionId = null;
          }
        } catch (error) {
          console.error('❌ Migration error:', error);
          candidateSessionId = null;
        }
      }

      // Validate the candidate session
      if (candidateSessionId) {
        const isValidSession = await validateSession(candidateSessionId);
        if (isValidSession) {
          setSessionId(candidateSessionId);
          
          // Ensure URL is updated
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('session', candidateSessionId);
          window.history.replaceState(null, '', newUrl.toString());
          
          setIsLoading(false);
          return;
        } else {
          console.log('⚠️ Existing session is invalid, will create new one');
        }
      }

      // Create new session if needed
      if (autoCreate) {
        await createSession();
      }

      setIsLoading(false);
    };

    initializeSession();
  }, [teamId, autoCreate, validateSession, createSession]);

  /**
   * Auto-refresh session periodically
   */
  useEffect(() => {
    if (!autoRefresh || !sessionId || !isValid) return;

    const refreshIntervalMs = refreshInterval * 60 * 1000; // Convert minutes to milliseconds
    const intervalId = setInterval(refreshSession, refreshIntervalMs);

    console.log(`🔄 Auto-refresh enabled every ${refreshInterval} minutes`);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoRefresh, sessionId, isValid, refreshInterval, refreshSession]);

  return {
    sessionId,
    sessionData,
    isLoading,
    error,
    isValid,
    createSession,
    validateSession,
    refreshSession,
    terminateSession,
    userFingerprint
  };
};
