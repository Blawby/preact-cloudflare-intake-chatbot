import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/preact';
import { useCrossTabSync } from '../../../src/hooks/useCrossTabSync';

// Mock BroadcastChannel
const mockBroadcastChannel = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn()
}));

vi.stubGlobal('BroadcastChannel', mockBroadcastChannel);

// Mock crypto
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-instance-id')
});

describe('useCrossTabSync', () => {
  let mockChannel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChannel = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      close: vi.fn()
    };
    mockBroadcastChannel.mockReturnValue(mockChannel);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create broadcast channel when enabled', () => {
      renderHook(() =>
        useCrossTabSync({
          sessionId: 'test-session',
          enabled: true
        })
      );

      expect(mockBroadcastChannel).toHaveBeenCalledWith('blawby-session-sync');
      expect(mockChannel.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should not create broadcast channel when disabled', () => {
      renderHook(() =>
        useCrossTabSync({
          sessionId: 'test-session',
          enabled: false
        })
      );

      expect(mockBroadcastChannel).not.toHaveBeenCalled();
    });

    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() =>
        useCrossTabSync({
          sessionId: 'test-session',
          enabled: true
        })
      );

      unmount();

      expect(mockChannel.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockChannel.close).toHaveBeenCalled();
    });
  });

  describe('broadcasting', () => {
    it('should broadcast session change', () => {
      const { result } = renderHook(() =>
        useCrossTabSync({
          sessionId: 'old-session',
          enabled: true
        })
      );

      act(() => {
        result.current.broadcastSessionChange('new-session');
      });

      expect(mockChannel.postMessage).toHaveBeenCalledWith({
        type: 'session_changed',
        sessionId: 'new-session',
        timestamp: expect.any(Number),
        source: 'test-instance-id'
      });
    });

    it('should broadcast session expired', () => {
      const { result } = renderHook(() =>
        useCrossTabSync({
          sessionId: 'test-session',
          enabled: true
        })
      );

      act(() => {
        result.current.broadcastSessionExpired();
      });

      expect(mockChannel.postMessage).toHaveBeenCalledWith({
        type: 'session_expired',
        sessionId: 'test-session',
        timestamp: expect.any(Number),
        source: 'test-instance-id'
      });
    });

    it('should broadcast session terminated', () => {
      const { result } = renderHook(() =>
        useCrossTabSync({
          sessionId: 'test-session',
          enabled: true
        })
      );

      act(() => {
        result.current.broadcastSessionTerminated();
      });

      expect(mockChannel.postMessage).toHaveBeenCalledWith({
        type: 'session_terminated',
        sessionId: 'test-session',
        timestamp: expect.any(Number),
        source: 'test-instance-id'
      });
    });

    it('should broadcast session refresh', () => {
      const { result } = renderHook(() =>
        useCrossTabSync({
          sessionId: 'test-session',
          enabled: true
        })
      );

      act(() => {
        result.current.broadcastSessionRefresh();
      });

      expect(mockChannel.postMessage).toHaveBeenCalledWith({
        type: 'session_refresh',
        sessionId: 'test-session',
        timestamp: expect.any(Number),
        source: 'test-instance-id'
      });
    });

    it('should not broadcast when channel is not available', () => {
      const { result } = renderHook(() =>
        useCrossTabSync({
          sessionId: 'test-session',
          enabled: false
        })
      );

      act(() => {
        result.current.broadcastSessionChange('new-session');
      });

      // Should not throw or call postMessage
      expect(mockChannel.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('message handling', () => {
    it('should call onSessionChanged when receiving session_changed message', () => {
      const onSessionChanged = vi.fn();
      let messageHandler: Function;

      mockChannel.addEventListener.mockImplementation((event: string, handler: Function) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      });

      renderHook(() =>
        useCrossTabSync({
          sessionId: 'old-session',
          onSessionChanged,
          enabled: true
        })
      );

      const messageEvent = {
        data: {
          type: 'session_changed',
          sessionId: 'new-session',
          source: 'other-tab',
          timestamp: Date.now()
        }
      };

      act(() => {
        messageHandler!(messageEvent);
      });

      expect(onSessionChanged).toHaveBeenCalledWith('new-session');
    });

    it('should call onSessionExpired when receiving session_expired message', () => {
      const onSessionExpired = vi.fn();
      let messageHandler: Function;

      mockChannel.addEventListener.mockImplementation((event: string, handler: Function) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      });

      renderHook(() =>
        useCrossTabSync({
          sessionId: 'test-session',
          onSessionExpired,
          enabled: true
        })
      );

      const messageEvent = {
        data: {
          type: 'session_expired',
          sessionId: 'test-session',
          source: 'other-tab',
          timestamp: Date.now()
        }
      };

      act(() => {
        messageHandler!(messageEvent);
      });

      expect(onSessionExpired).toHaveBeenCalled();
    });

    it('should ignore messages from same tab instance', () => {
      const onSessionChanged = vi.fn();
      let messageHandler: Function;

      mockChannel.addEventListener.mockImplementation((event: string, handler: Function) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      });

      renderHook(() =>
        useCrossTabSync({
          sessionId: 'test-session',
          onSessionChanged,
          enabled: true
        })
      );

      const messageEvent = {
        data: {
          type: 'session_changed',
          sessionId: 'new-session',
          source: 'test-instance-id', // Same as current instance
          timestamp: Date.now()
        }
      };

      act(() => {
        messageHandler!(messageEvent);
      });

      expect(onSessionChanged).not.toHaveBeenCalled();
    });

    it('should ignore session_changed for same session ID', () => {
      const onSessionChanged = vi.fn();
      let messageHandler: Function;

      mockChannel.addEventListener.mockImplementation((event: string, handler: Function) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      });

      renderHook(() =>
        useCrossTabSync({
          sessionId: 'test-session',
          onSessionChanged,
          enabled: true
        })
      );

      const messageEvent = {
        data: {
          type: 'session_changed',
          sessionId: 'test-session', // Same as current session
          source: 'other-tab',
          timestamp: Date.now()
        }
      };

      act(() => {
        messageHandler!(messageEvent);
      });

      expect(onSessionChanged).not.toHaveBeenCalled();
    });
  });

  describe('browser compatibility', () => {
    it('should handle missing BroadcastChannel gracefully', () => {
      // Temporarily remove BroadcastChannel
      const originalBC = globalThis.BroadcastChannel;
      delete (globalThis as any).BroadcastChannel;

      const { result } = renderHook(() =>
        useCrossTabSync({
          sessionId: 'test-session',
          enabled: true
        })
      );

      // Should not throw and should provide fallback functions
      expect(result.current.broadcastSessionChange).toBeDefined();
      expect(typeof result.current.broadcastSessionChange).toBe('function');

      // Restore BroadcastChannel
      globalThis.BroadcastChannel = originalBC;
    });
  });
});
