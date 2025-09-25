import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SessionService, CreateSessionOptions, SessionData } from '../../../worker/services/SessionService';
import type { Env } from '../../../worker/types';

// Mock environment
const createMockEnv = (): Env => ({
  DB: {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn(),
        all: vi.fn(),
        run: vi.fn()
      })
    })
  } as any,
  FILES_BUCKET: {} as any,
  AI: {} as any,
  DOC_EVENTS: {} as any,
  CHAT_SESSIONS: {} as any,
  R2_BUCKET: {} as any
});

describe('SessionService', () => {
  let sessionService: SessionService;
  let mockEnv: Env;
  let mockRequest: Request;

  beforeEach(() => {
    mockEnv = createMockEnv();
    sessionService = new SessionService(mockEnv);
    
    // Mock request with headers
    mockRequest = new Request('https://example.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'CF-IPCountry': 'US',
        'CF-Region': 'CA',
        'CF-IPCity': 'San Francisco',
        'CF-Connecting-IP': '192.168.1.1'
      }
    });

    // Mock crypto.randomUUID
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'test-session-id-123')
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('createSession', () => {
    it('should create a new session with basic options', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: mockRun
        })
      });

      const options: CreateSessionOptions = {
        teamId: 'test-team-123',
        userFingerprint: 'test-fingerprint'
      };

      const result = await sessionService.createSession(options);

      expect(result).toEqual({
        id: 'test-session-id-123',
        teamId: 'test-team-123',
        userFingerprint: 'test-fingerprint',
        deviceInfo: undefined,
        locationInfo: undefined,
        status: 'active',
        lastAccessed: expect.any(String),
        expiresAt: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      expect(mockRun).toHaveBeenCalled();
    });

    it('should create session with provided session ID for migration', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: mockRun
        })
      });

      const options: CreateSessionOptions = {
        teamId: 'test-team-123',
        sessionId: 'existing-session-id',
        userFingerprint: 'test-fingerprint'
      };

      const result = await sessionService.createSession(options);

      expect(result.id).toBe('existing-session-id');
    });

    it('should extract device info from request', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true });
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: mockRun
        })
      });

      const options: CreateSessionOptions = {
        teamId: 'test-team-123',
        request: mockRequest
      };

      const result = await sessionService.createSession(options);

      expect(result.deviceInfo).toEqual({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        language: 'en-US',
        os: 'Windows',
        device: 'Desktop',
        timezone: undefined
      });

      expect(result.locationInfo).toEqual({
        country: 'US',
        region: 'CA',
        city: 'San Francisco',
        ip: '192.168.1.1'
      });
    });
  });

  describe('validateSession', () => {
    it('should return invalid for missing session ID', async () => {
      const result = await sessionService.validateSession('');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('No session ID provided');
    });

    it('should return invalid for non-existent session', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: mockFirst
        })
      });

      const result = await sessionService.validateSession('non-existent-id');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Session not found');
    });

    it('should return invalid for expired session', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

      const mockSession = {
        id: 'test-session',
        team_id: 'test-team',
        status: 'active',
        expires_at: expiredDate.toISOString(),
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

      const result = await sessionService.validateSession('test-session');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Session expired');
    });

    it('should return valid for active session and refresh it', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

      const mockSession = {
        id: 'test-session',
        team_id: 'test-team',
        user_fingerprint: 'test-fingerprint',
        device_info: '{"browser":"Chrome"}',
        location_info: '{"country":"US"}',
        status: 'active',
        expires_at: futureDate.toISOString(),
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

      const result = await sessionService.validateSession('test-session');
      
      expect(result.isValid).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session?.id).toBe('test-session');
      expect(result.session?.deviceInfo).toEqual({ browser: 'Chrome' });
      expect(result.session?.locationInfo).toEqual({ country: 'US' });
    });
  });

  describe('generateDeviceFingerprint', () => {
    it('should generate consistent fingerprint from request', () => {
      const fingerprint1 = sessionService.generateDeviceFingerprint(mockRequest);
      const fingerprint2 = sessionService.generateDeviceFingerprint(mockRequest);
      
      expect(fingerprint1).toBe(fingerprint2);
      expect(typeof fingerprint1).toBe('string');
      expect(fingerprint1.length).toBeGreaterThan(0);
    });

    it('should generate different fingerprints for different requests', () => {
      const request2 = new Request('https://example.com', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          'Accept-Language': 'fr-FR,fr;q=0.9',
          'CF-IPCountry': 'FR',
          'CF-Connecting-IP': '10.0.0.1'
        }
      });

      const fingerprint1 = sessionService.generateDeviceFingerprint(mockRequest);
      const fingerprint2 = sessionService.generateDeviceFingerprint(request2);
      
      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should return count of cleaned up sessions', async () => {
      const mockRun = vi.fn().mockResolvedValue({ changes: 5 });
      (mockEnv.DB.prepare as any).mockReturnValue({
        run: mockRun
      });

      const result = await sessionService.cleanupExpiredSessions();
      
      expect(result).toBe(5);
      expect(mockRun).toHaveBeenCalled();
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics', async () => {
      const mockStats = {
        total_sessions: 100,
        active_sessions: 75,
        expired_sessions: 25,
        avg_duration_seconds: 86400
      };

      const mockFirst = vi.fn().mockResolvedValue(mockStats);
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: mockFirst
        })
      });

      const result = await sessionService.getSessionStats('test-team');
      
      expect(result).toEqual({
        totalSessions: 100,
        activeSessions: 75,
        expiredSessions: 25,
        averageSessionDuration: 86400
      });
    });
  });

  describe('findSessionsByFingerprint', () => {
    it('should return sessions for given fingerprint', async () => {
      const mockSessions = {
        results: [
          {
            id: 'session1',
            team_id: 'test-team',
            user_fingerprint: 'test-fingerprint',
            device_info: '{"browser":"Chrome"}',
            status: 'active',
            last_accessed: new Date().toISOString(),
            expires_at: new Date().toISOString(),
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

      const result = await sessionService.findSessionsByFingerprint('test-fingerprint', 'test-team');
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('session1');
      expect(result[0].userFingerprint).toBe('test-fingerprint');
    });
  });
});
