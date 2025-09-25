import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/preact';
import { useEnhancedSession } from '../../../src/hooks/useEnhancedSession';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
vi.stubGlobal('localStorage', mockLocalStorage);

// Mock crypto
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid-123')
});

// Mock URL and history
const mockURL = vi.fn().mockImplementation((href) => ({
  href,
  searchParams: {
    get: vi.fn(),
    set: vi.fn()
  }
}));
vi.stubGlobal('URL', mockURL);

const mockHistory = {
  replaceState: vi.fn(),
  pushState: vi.fn()
};
vi.stubGlobal('history', mockHistory);

// Mock BroadcastChannel for cross-tab sync tests
const mockBroadcastChannel = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn()
}));
vi.stubGlobal('BroadcastChannel', mockBroadcastChannel);

// Mock canvas for fingerprinting
const mockCanvas = {
  getContext: vi.fn().mockReturnValue({
    fillText: vi.fn()
  }),
  toDataURL: vi.fn().mockReturnValue('data:image/png;base64,test')
};
vi.stubGlobal('document', {
  createElement: vi.fn().mockReturnValue(mockCanvas)
});

// Mock navigator
vi.stubGlobal('navigator', {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  language: 'en-US',
  platform: 'Win32',
  cookieEnabled: true
});

// Mock screen
vi.stubGlobal('screen', {
  width: 1920,
  height: 1080
});

// Mock Intl
vi.stubGlobal('Intl', {
  DateTimeFormat: vi.fn().mockReturnValue({
    resolvedOptions: vi.fn().mockReturnValue({
      timeZone: 'America/New_York'
    })
  })
});

describe('useEnhancedSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://example.com',
        search: ''
      },
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('session creation', () => {
    it('should create a new session when none exists', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: {
            sessionId: 'new-session-123',
            userFingerprint: 'test-fingerprint',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useEnhancedSession({
          teamId: 'test-team',
          autoCreate: true
        })
      );

      await waitFor(() => {
        expect(result.current.sessionId).toBe('new-session-123');
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('blawby-session-id', 'new-session-123');
    });

    it('should use existing localStorage session if valid', async () => {
      mockLocalStorage.getItem.mockReturnValue('existing-session-123');
      
      // Mock validation response
      const mockValidationResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: {
            valid: true,
            session: {
              id: 'existing-session-123',
              teamId: 'test-team',
              status: 'active'
            }
          }
        })
      };
      mockFetch.mockResolvedValue(mockValidationResponse);

      const { result } = renderHook(() =>
        useEnhancedSession({
          teamId: 'test-team',
          autoCreate: true
        })
      );

      await waitFor(() => {
        expect(result.current.sessionId).toBe('existing-session-123');
      });

      expect(result.current.isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/sessions/existing-session-123/validate');
    });

    it('should handle session creation failure', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };
      mockFetch.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useEnhancedSession({
          teamId: 'test-team',
          autoCreate: true
        })
      );

      await waitFor(() => {
        expect(result.current.error).toContain('Failed to create session');
      });

      expect(result.current.sessionId).toBe(null);
      expect(result.current.isValid).toBe(false);
    });
  });

  describe('device fingerprinting', () => {
    it('should generate consistent device fingerprint', () => {
      const { result } = renderHook(() =>
        useEnhancedSession({
          teamId: 'test-team',
          autoCreate: false
        })
      );

      const fingerprint1 = result.current.userFingerprint;
      
      // Re-render hook
      const { result: result2 } = renderHook(() =>
        useEnhancedSession({
          teamId: 'test-team',
          autoCreate: false
        })
      );

      const fingerprint2 = result2.current.userFingerprint;

      expect(fingerprint1).toBe(fingerprint2);
      expect(typeof fingerprint1).toBe('string');
      expect(fingerprint1.length).toBeGreaterThan(0);
    });
  });

  describe('session validation', () => {
    it('should validate session successfully', async () => {
      const { result } = renderHook(() =>
        useEnhancedSession({
          teamId: 'test-team',
          autoCreate: false
        })
      );

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: {
            valid: true,
            session: {
              id: 'test-session',
              teamId: 'test-team',
              status: 'active'
            }
          }
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      let validationResult: boolean = false;
      await act(async () => {
        validationResult = await result.current.validateSession('test-session');
      });

      expect(validationResult).toBe(true);
      expect(result.current.isValid).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should handle invalid session', async () => {
      const { result } = renderHook(() =>
        useEnhancedSession({
          teamId: 'test-team',
          autoCreate: false
        })
      );

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: {
            valid: false,
            reason: 'Session expired'
          }
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      let validationResult: boolean = true;
      await act(async () => {
        validationResult = await result.current.validateSession('expired-session');
      });

      expect(validationResult).toBe(false);
      expect(result.current.isValid).toBe(false);
      expect(result.current.error).toBe('Session expired');
    });
  });

  describe('session refresh', () => {
    it('should refresh session successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useEnhancedSession({
          teamId: 'test-team',
          autoCreate: false
        })
      );

      // Set a session ID first
      act(() => {
        (result.current as any).sessionId = 'test-session';
      });

      await act(async () => {
        await result.current.refreshSession();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/sessions/test-session/refresh', {
        method: 'POST'
      });
    });
  });

  describe('session termination', () => {
    it('should terminate session successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useEnhancedSession({
          teamId: 'test-team',
          autoCreate: false
        })
      );

      // Set a session ID first
      act(() => {
        (result.current as any).sessionId = 'test-session';
      });

      await act(async () => {
        await result.current.terminateSession();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/sessions/test-session', {
        method: 'DELETE'
      });
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('blawby-session-id');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('blawby-user-fingerprint');
    });
  });

  describe('auto-refresh', () => {
    it('should setup auto-refresh when enabled', async () => {
      vi.useFakeTimers();

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useEnhancedSession({
          teamId: 'test-team',
          autoCreate: false,
          autoRefresh: true,
          refreshInterval: 1 // 1 minute for testing
        })
      );

      // Set session as valid
      act(() => {
        (result.current as any).sessionId = 'test-session';
        (result.current as any).isValid = true;
      });

      // Fast-forward 1 minute
      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/sessions/test-session/refresh', {
          method: 'POST'
        });
      });

      vi.useRealTimers();
    });
  });

  describe('cross-tab sync', () => {
    it('should initialize cross-tab sync when enabled', () => {
      renderHook(() =>
        useEnhancedSession({
          teamId: 'test-team',
          crossTabSync: true
        })
      );

      expect(mockBroadcastChannel).toHaveBeenCalledWith('blawby-session-sync');
    });

    it('should not initialize cross-tab sync when disabled', () => {
      renderHook(() =>
        useEnhancedSession({
          teamId: 'test-team',
          crossTabSync: false
        })
      );

      expect(mockBroadcastChannel).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useEnhancedSession({
          teamId: 'test-team',
          autoCreate: true
        })
      );

      await waitFor(() => {
        expect(result.current.error).toContain('Network error');
      });

      expect(result.current.sessionId).toBe(null);
      expect(result.current.isValid).toBe(false);
    });
  });
});
