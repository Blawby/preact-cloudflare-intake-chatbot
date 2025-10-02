import { useState, useEffect, useCallback, useRef } from 'preact/hooks';

const STORAGE_PREFIX = 'blawby_session:';

interface SessionResponsePayload {
  sessionId: string;
  sessionToken?: string | null;
  state?: string;
  lastActive?: string;
  expiresAt?: string;
}

export interface ChatSessionState {
  sessionId: string | null;
  sessionToken: string | null;
  isInitializing: boolean;
  error: string | null;
  refreshSession: () => Promise<SessionResponsePayload | void>;
  clearStoredSession: () => void;
}

export function useChatSession(teamId: string): ChatSessionState {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isDisposedRef = useRef(false);

  useEffect(() => {
    return () => {
      isDisposedRef.current = true;
    };
  }, []);

  const getStorageKey = useCallback(() => {
    return teamId ? `${STORAGE_PREFIX}${teamId}` : null;
  }, [teamId]);

  const readStoredSessionId = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const storageKey = getStorageKey();
    if (!storageKey) return null;
    try {
      return window.localStorage.getItem(storageKey);
    } catch (storageError) {
      console.warn('Failed to read session from storage', storageError);
      return null;
    }
  }, [getStorageKey]);

  const writeStoredSessionId = useCallback((value: string | null) => {
    if (typeof window === 'undefined') return;
    const storageKey = getStorageKey();
    if (!storageKey) return;
    try {
      if (value) {
        window.localStorage.setItem(storageKey, value);
      } else {
        window.localStorage.removeItem(storageKey);
      }
    } catch (storageError) {
      console.warn('Failed to persist session to storage', storageError);
    }
  }, [getStorageKey]);

  const clearStoredSession = useCallback(() => {
    writeStoredSessionId(null);
    if (!isDisposedRef.current) {
      setSessionId(null);
      setSessionToken(null);
    }
  }, [writeStoredSessionId]);

  const performHandshake = useCallback(async (): Promise<SessionResponsePayload | void> => {
    if (!teamId) {
      return;
    }

    const storedSessionId = readStoredSessionId();
    const body: Record<string, unknown> = { teamId };
    if (storedSessionId) {
      body.sessionId = storedSessionId;
    }

    if (!isDisposedRef.current) {
      setIsInitializing(true);
    }

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Session initialization failed (${response.status})`);
      }

      const json = await response.json();
      if (!json?.success) {
        throw new Error(json?.error || 'Session initialization failed');
      }

      const data = json.data as SessionResponsePayload | undefined;
      if (!data || typeof data.sessionId !== 'string' || !data.sessionId) {
        throw new Error('Session ID missing from response');
      }

      writeStoredSessionId(data.sessionId);

      if (!isDisposedRef.current) {
        setSessionId(data.sessionId);
        setSessionToken(typeof data.sessionToken === 'string' ? data.sessionToken : null);
        setError(null);
      }

      return data;
    } catch (handshakeError) {
      const message = handshakeError instanceof Error
        ? handshakeError.message
        : 'Unknown session error';
      if (!isDisposedRef.current) {
        setError(message);
      }
      console.warn('Session handshake failed:', handshakeError);
      throw handshakeError;
    } finally {
      if (!isDisposedRef.current) {
        setIsInitializing(false);
      }
    }
  }, [teamId, readStoredSessionId, writeStoredSessionId]);

  useEffect(() => {
    if (!teamId) {
      clearStoredSession();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await performHandshake();
      } catch {
        if (cancelled) return;
        // Error state already handled inside performHandshake
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [teamId, performHandshake, clearStoredSession]);

  return {
    sessionId,
    sessionToken,
    isInitializing,
    error,
    refreshSession: performHandshake,
    clearStoredSession
  };
}
