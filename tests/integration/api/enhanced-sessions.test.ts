import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleSessions } from '../../../worker/routes/sessions';
import type { Env } from '../../../worker/types';

// Mock environment for integration tests
const createMockEnv = (): Env => {
  const mockDB = {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn(),
        all: vi.fn(),
        run: vi.fn()
      })
    })
  };

  return {
    DB: mockDB as any,
    FILES_BUCKET: {} as any,
    AI: {} as any,
    DOC_EVENTS: {} as any,
    CHAT_SESSIONS: {} as any,
    R2_BUCKET: {} as any
  };
};

describe('Enhanced Sessions API Integration', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
    
    // Mock crypto.randomUUID
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'test-session-uuid-123')
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('POST /api/sessions/create', () => {
    it('should create a new session successfully', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: mockRun
        })
      });

      const request = new Request('https://example.com/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'CF-IPCountry': 'US',
          'CF-Region': 'CA'
        },
        body: JSON.stringify({
          teamId: 'blawby-ai',
          userFingerprint: 'test-fingerprint-123',
          deviceInfo: {
            browser: 'Chrome',
            os: 'Windows',
            device: 'Desktop'
          }
        })
      });

      const response = await handleSessions(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.sessionId).toBe('test-session-uuid-123');
      expect(result.data.userFingerprint).toBe('test-fingerprint-123');
      expect(result.data.deviceInfo).toBeDefined();
      expect(result.data.expiresAt).toBeDefined();
    });

    it('should handle migration with provided session ID', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: mockRun
        })
      });

      const request = new Request('https://example.com/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teamId: 'blawby-ai',
          sessionId: 'legacy-session-123',
          userFingerprint: 'legacy-fingerprint',
          migration: true
        })
      });

      const response = await handleSessions(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.sessionId).toBe('legacy-session-123');
    });

    it('should return 400 for missing teamId', async () => {
      const request = new Request('https://example.com/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userFingerprint: 'test-fingerprint'
        })
      });

      const response = await handleSessions(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Team ID is required');
    });
  });

  describe('GET /api/sessions/{sessionId}/validate', () => {
    it('should validate active session successfully', async () => {
      const mockSession = {
        id: 'test-session-123',
        team_id: 'test-team',
        user_fingerprint: 'test-fingerprint',
        device_info: '{"browser":"Chrome"}',
        location_info: '{"country":"US"}',
        status: 'active',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        last_accessed: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const mockFirst = vi.fn().mockResolvedValue(mockSession);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: mockFirst,
          run: mockRun
        })
      });

      const request = new Request('https://example.com/api/sessions/test-session-123/validate');

      const response = await handleSessions(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(true);
      expect(result.data.session).toBeDefined();
      expect(result.data.session.id).toBe('test-session-123');
    });

    it('should return invalid for expired session', async () => {
      const expiredSession = {
        id: 'expired-session',
        team_id: 'test-team',
        status: 'active',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const mockFirst = vi.fn().mockResolvedValue(expiredSession);
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: mockFirst,
          run: mockRun
        })
      });

      const request = new Request('https://example.com/api/sessions/expired-session/validate');

      const response = await handleSessions(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(false);
      expect(result.data.reason).toBe('Session expired');
    });

    it('should return invalid for non-existent session', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: mockFirst
        })
      });

      const request = new Request('https://example.com/api/sessions/non-existent/validate');

      const response = await handleSessions(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(false);
      expect(result.data.reason).toBe('Session not found');
    });
  });

  describe('POST /api/sessions/{sessionId}/refresh', () => {
    it('should refresh session successfully', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: mockRun
        })
      });

      const request = new Request('https://example.com/api/sessions/test-session/refresh', {
        method: 'POST'
      });

      const response = await handleSessions(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Session refreshed successfully');
    });
  });

  describe('DELETE /api/sessions/{sessionId}', () => {
    it('should terminate session successfully', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: mockRun
        })
      });

      const request = new Request('https://example.com/api/sessions/test-session', {
        method: 'DELETE'
      });

      const response = await handleSessions(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Session terminated successfully');
    });
  });

  describe('POST /api/sessions/cleanup', () => {
    it('should cleanup expired sessions and orphaned data', async () => {
      const mockRun = vi.fn()
        .mockResolvedValueOnce({ changes: 5 }) // Expired sessions
        .mockResolvedValueOnce({ changes: 3 }) // Orphaned conversations
        .mockResolvedValueOnce({ changes: 8 }); // Orphaned files

      (mockEnv.DB.prepare as any).mockReturnValue({
        run: mockRun,
        bind: vi.fn().mockReturnValue({
          run: mockRun
        })
      });

      const request = new Request('https://example.com/api/sessions/cleanup', {
        method: 'POST'
      });

      const response = await handleSessions(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.expiredSessions).toBe(5);
      expect(result.data.archivedConversations).toBe(3);
      expect(result.data.archivedFiles).toBe(8);
      expect(result.data.totalCleaned).toBe(16);
    });
  });

  describe('GET /api/sessions/stats/{teamId}', () => {
    it('should return session statistics', async () => {
      const mockStats = {
        total_sessions: 150,
        active_sessions: 100,
        expired_sessions: 50,
        avg_duration_seconds: 7200
      };

      const mockFirst = vi.fn().mockResolvedValue(mockStats);
      
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: mockFirst
        })
      });

      const request = new Request('https://example.com/api/sessions/stats/test-team');

      const response = await handleSessions(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.stats.totalSessions).toBe(150);
      expect(result.data.stats.activeSessions).toBe(100);
      expect(result.data.stats.expiredSessions).toBe(50);
      expect(result.data.stats.averageSessionDuration).toBe(7200);
    });
  });

  describe('GET /api/sessions/fingerprint/{fingerprint}/{teamId}', () => {
    it('should find sessions by fingerprint', async () => {
      const mockSessions = {
        results: [
          {
            id: 'session1',
            team_id: 'test-team',
            user_fingerprint: 'test-fingerprint',
            device_info: '{"browser":"Chrome"}',
            status: 'active',
            last_accessed: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'session2',
            team_id: 'test-team',
            user_fingerprint: 'test-fingerprint',
            device_info: '{"browser":"Firefox"}',
            status: 'active',
            last_accessed: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
      };

      const mockAll = vi.fn().mockResolvedValue(mockSessions);
      
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: mockAll
        })
      });

      const request = new Request('https://example.com/api/sessions/fingerprint/test-fingerprint/test-team');

      const response = await handleSessions(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.sessions).toHaveLength(2);
      expect(result.data.count).toBe(2);
      expect(result.data.fingerprint).toBe('test-fingerprint');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      (mockEnv.DB.prepare as any).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const request = new Request('https://example.com/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teamId: 'test-team'
        })
      });

      const response = await handleSessions(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('should return 404 for unknown endpoints', async () => {
      const request = new Request('https://example.com/api/sessions/unknown-endpoint');

      const response = await handleSessions(request, mockEnv);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Session endpoint not found');
    });
  });
});
