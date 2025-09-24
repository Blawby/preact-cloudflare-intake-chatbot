import { useEffect, useCallback, useRef } from 'preact/hooks';

export interface SessionSyncMessage {
  type: 'session_changed' | 'session_expired' | 'session_terminated' | 'session_refresh';
  sessionId: string;
  timestamp: number;
  source: string;
  data?: any;
}

export interface UseCrossTabSyncOptions {
  sessionId: string | null;
  onSessionChanged?: (newSessionId: string) => void;
  onSessionExpired?: () => void;
  onSessionTerminated?: () => void;
  enabled?: boolean;
}

export interface UseCrossTabSyncReturn {
  broadcastSessionChange: (newSessionId: string) => void;
  broadcastSessionExpired: () => void;
  broadcastSessionTerminated: () => void;
  broadcastSessionRefresh: () => void;
}

/**
 * Cross-tab session synchronization using Broadcast Channel API
 * Keeps sessions synchronized across multiple tabs/windows
 */
export const useCrossTabSync = (options: UseCrossTabSyncOptions): UseCrossTabSyncReturn => {
  const {
    sessionId,
    onSessionChanged,
    onSessionExpired,
    onSessionTerminated,
    enabled = true
  } = options;

  const channelRef = useRef<BroadcastChannel | null>(null);
  const instanceIdRef = useRef<string>(crypto.randomUUID());

  /**
   * Initialize broadcast channel
   */
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !BroadcastChannel) {
      console.log('🔄 Cross-tab sync not available or disabled');
      return;
    }

    // Create broadcast channel
    channelRef.current = new BroadcastChannel('blawby-session-sync');
    console.log('📡 Cross-tab sync initialized:', instanceIdRef.current);

    // Listen for messages from other tabs
    const handleMessage = (event: MessageEvent<SessionSyncMessage>) => {
      const { type, sessionId: messageSessionId, source, timestamp } = event.data;

      // Ignore messages from this tab instance
      if (source === instanceIdRef.current) {
        return;
      }

      console.log('📨 Received cross-tab message:', {
        type,
        sessionId: messageSessionId,
        source,
        timestamp: new Date(timestamp).toISOString()
      });

      // Handle different message types
      switch (type) {
        case 'session_changed':
          if (messageSessionId !== sessionId) {
            console.log('🔄 Session changed in another tab:', messageSessionId);
            onSessionChanged?.(messageSessionId);
          }
          break;

        case 'session_expired':
          console.log('⏰ Session expired in another tab');
          onSessionExpired?.();
          break;

        case 'session_terminated':
          console.log('🛑 Session terminated in another tab');
          onSessionTerminated?.();
          break;

        case 'session_refresh':
          console.log('🔄 Session refreshed in another tab');
          // Could trigger a local refresh or validation
          break;

        default:
          console.warn('⚠️ Unknown cross-tab message type:', type);
      }
    };

    channelRef.current.addEventListener('message', handleMessage);

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.removeEventListener('message', handleMessage);
        channelRef.current.close();
        channelRef.current = null;
        console.log('📡 Cross-tab sync cleaned up');
      }
    };
  }, [enabled, sessionId, onSessionChanged, onSessionExpired, onSessionTerminated]);

  /**
   * Broadcast session change to other tabs
   */
  const broadcastSessionChange = useCallback((newSessionId: string) => {
    if (!channelRef.current) return;

    const message: SessionSyncMessage = {
      type: 'session_changed',
      sessionId: newSessionId,
      timestamp: Date.now(),
      source: instanceIdRef.current
    };

    channelRef.current.postMessage(message);
    console.log('📡 Broadcasted session change:', newSessionId);
  }, []);

  /**
   * Broadcast session expiration to other tabs
   */
  const broadcastSessionExpired = useCallback(() => {
    if (!channelRef.current || !sessionId) return;

    const message: SessionSyncMessage = {
      type: 'session_expired',
      sessionId,
      timestamp: Date.now(),
      source: instanceIdRef.current
    };

    channelRef.current.postMessage(message);
    console.log('📡 Broadcasted session expired');
  }, [sessionId]);

  /**
   * Broadcast session termination to other tabs
   */
  const broadcastSessionTerminated = useCallback(() => {
    if (!channelRef.current || !sessionId) return;

    const message: SessionSyncMessage = {
      type: 'session_terminated',
      sessionId,
      timestamp: Date.now(),
      source: instanceIdRef.current
    };

    channelRef.current.postMessage(message);
    console.log('📡 Broadcasted session terminated');
  }, [sessionId]);

  /**
   * Broadcast session refresh to other tabs
   */
  const broadcastSessionRefresh = useCallback(() => {
    if (!channelRef.current || !sessionId) return;

    const message: SessionSyncMessage = {
      type: 'session_refresh',
      sessionId,
      timestamp: Date.now(),
      source: instanceIdRef.current
    };

    channelRef.current.postMessage(message);
    console.log('📡 Broadcasted session refresh');
  }, [sessionId]);

  return {
    broadcastSessionChange,
    broadcastSessionExpired,
    broadcastSessionTerminated,
    broadcastSessionRefresh
  };
};

/**
 * Storage event listener for fallback cross-tab sync
 * Uses localStorage events as fallback when BroadcastChannel is not available
 */
export const useStorageEventSync = (options: UseCrossTabSyncOptions): UseCrossTabSyncReturn => {
  const { sessionId, onSessionChanged, onSessionExpired, onSessionTerminated, enabled = true } = options;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === 'blawby-session-sync') {
        try {
          const message: SessionSyncMessage = JSON.parse(event.newValue || '{}');
          
          console.log('📨 Received storage sync message:', message);

          switch (message.type) {
            case 'session_changed':
              if (message.sessionId !== sessionId) {
                onSessionChanged?.(message.sessionId);
              }
              break;
            case 'session_expired':
              onSessionExpired?.();
              break;
            case 'session_terminated':
              onSessionTerminated?.();
              break;
          }
        } catch (error) {
          console.error('❌ Failed to parse storage sync message:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [enabled, sessionId, onSessionChanged, onSessionExpired, onSessionTerminated]);

  const broadcastViaStorage = useCallback((message: SessionSyncMessage) => {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem('blawby-session-sync', JSON.stringify(message));
    // Clear immediately to allow repeated messages
    setTimeout(() => {
      localStorage.removeItem('blawby-session-sync');
    }, 100);
  }, []);

  return {
    broadcastSessionChange: useCallback((newSessionId: string) => {
      broadcastViaStorage({
        type: 'session_changed',
        sessionId: newSessionId,
        timestamp: Date.now(),
        source: 'storage-fallback'
      });
    }, [broadcastViaStorage]),

    broadcastSessionExpired: useCallback(() => {
      if (!sessionId) return;
      broadcastViaStorage({
        type: 'session_expired',
        sessionId,
        timestamp: Date.now(),
        source: 'storage-fallback'
      });
    }, [sessionId, broadcastViaStorage]),

    broadcastSessionTerminated: useCallback(() => {
      if (!sessionId) return;
      broadcastViaStorage({
        type: 'session_terminated',
        sessionId,
        timestamp: Date.now(),
        source: 'storage-fallback'
      });
    }, [sessionId, broadcastViaStorage]),

    broadcastSessionRefresh: useCallback(() => {
      if (!sessionId) return;
      broadcastViaStorage({
        type: 'session_refresh',
        sessionId,
        timestamp: Date.now(),
        source: 'storage-fallback'
      });
    }, [sessionId, broadcastViaStorage])
  };
};
