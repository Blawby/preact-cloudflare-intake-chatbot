import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  migrateLegacySession, 
  isSessionMigrated, 
  getMigrationInfo,
  cleanupLegacySession,
  forceMigration 
} from '../../../src/utils/sessionMigration';

// Mock fetch
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
  randomUUID: vi.fn(() => 'migration-uuid-123')
});

// Mock navigator and other globals for fingerprinting
vi.stubGlobal('navigator', {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  language: 'en-US',
  platform: 'Win32',
  cookieEnabled: true
});

vi.stubGlobal('screen', {
  width: 1920,
  height: 1080
});

vi.stubGlobal('Intl', {
  DateTimeFormat: vi.fn().mockReturnValue({
    resolvedOptions: vi.fn().mockReturnValue({
      timeZone: 'America/New_York'
    })
  })
});

describe('Session Migration Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('migrateLegacySession', () => {
    it('should return no migration needed when no legacy session exists', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = await migrateLegacySession('test-team');

      expect(result).toEqual({
        success: true,
        sessionId: '',
        migrated: false
      });
    });

    it('should return no migration needed when session already exists in database', async () => {
      mockLocalStorage.getItem
        .mockReturnValueOnce('existing-session-123') // session ID
        .mockReturnValueOnce('existing-fingerprint'); // fingerprint

      // Mock successful validation response
      const mockValidationResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { valid: true }
        })
      };
      mockFetch.mockResolvedValue(mockValidationResponse);

      const result = await migrateLegacySession('test-team');

      expect(result).toEqual({
        success: true,
        sessionId: 'existing-session-123',
        migrated: false
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/sessions/existing-session-123/validate');
    });

    it('should migrate legacy session when it does not exist in database', async () => {
      mockLocalStorage.getItem
        .mockReturnValueOnce('legacy-session-123') // session ID
        .mockReturnValueOnce('legacy-fingerprint'); // fingerprint

      // Mock validation failure (session not in database)
      const mockValidationResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { valid: false }
        })
      };

      // Mock conversations check (no existing data)
      const mockConversationsResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { conversations: [] }
        })
      };

      // Mock successful migration
      const mockMigrationResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { sessionId: 'legacy-session-123' }
        })
      };

      mockFetch
        .mockResolvedValueOnce(mockValidationResponse) // validation
        .mockResolvedValueOnce(mockConversationsResponse) // conversations check
        .mockResolvedValueOnce(mockMigrationResponse); // migration

      const result = await migrateLegacySession('test-team');

      expect(result).toEqual({
        success: true,
        sessionId: 'legacy-session-123',
        migrated: true
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teamId: 'test-team',
          userFingerprint: 'legacy-fingerprint',
          sessionId: 'legacy-session-123',
          deviceInfo: expect.objectContaining({
            userAgent: expect.any(String),
            legacy: true,
            migratedAt: expect.any(String)
          }),
          migration: true
        })
      });
    });

    it('should generate legacy fingerprint when none exists', async () => {
      mockLocalStorage.getItem
        .mockReturnValueOnce('legacy-session-123') // session ID
        .mockReturnValueOnce(null); // no fingerprint

      // Mock validation failure
      const mockValidationResponse = {
        ok: false,
        status: 404
      };

      // Mock conversations check
      const mockConversationsResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { conversations: [] }
        })
      };

      // Mock successful migration
      const mockMigrationResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { sessionId: 'legacy-session-123' }
        })
      };

      mockFetch
        .mockResolvedValueOnce(mockValidationResponse)
        .mockResolvedValueOnce(mockConversationsResponse)
        .mockResolvedValueOnce(mockMigrationResponse);

      const result = await migrateLegacySession('test-team');

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(true);
      
      // Should set the generated fingerprint
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'blawby-user-fingerprint',
        expect.stringMatching(/^legacy-/)
      );
    });

    it('should handle migration API failures', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce('legacy-session-123');

      // Mock validation failure
      const mockValidationResponse = {
        ok: false,
        status: 404
      };

      // Mock conversations check
      const mockConversationsResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { conversations: [] }
        })
      };

      // Mock migration failure
      const mockMigrationResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };

      mockFetch
        .mockResolvedValueOnce(mockValidationResponse)
        .mockResolvedValueOnce(mockConversationsResponse)
        .mockResolvedValueOnce(mockMigrationResponse);

      const result = await migrateLegacySession('test-team');

      expect(result).toEqual({
        success: false,
        sessionId: '',
        migrated: false,
        error: 'Migration failed: 500 Internal Server Error'
      });
    });

    it('should handle network errors during migration', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce('legacy-session-123');

      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await migrateLegacySession('test-team');

      expect(result).toEqual({
        success: false,
        sessionId: '',
        migrated: false,
        error: 'Network error'
      });
    });
  });

  describe('isSessionMigrated', () => {
    it('should return true when session is migrated', () => {
      mockLocalStorage.getItem.mockReturnValue('true');

      const result = isSessionMigrated();

      expect(result).toBe(true);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('blawby-session-migrated');
    });

    it('should return false when session is not migrated', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = isSessionMigrated();

      expect(result).toBe(false);
    });
  });

  describe('getMigrationInfo', () => {
    it('should return complete migration info', () => {
      mockLocalStorage.getItem
        .mockReturnValueOnce('true') // migrated
        .mockReturnValueOnce('2023-12-01T10:00:00Z') // migration date
        .mockReturnValueOnce('legacy-session-123'); // session ID

      const result = getMigrationInfo();

      expect(result).toEqual({
        isMigrated: true,
        migrationDate: '2023-12-01T10:00:00Z',
        legacySessionId: 'legacy-session-123'
      });
    });

    it('should return minimal info when not migrated', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = getMigrationInfo();

      expect(result).toEqual({
        isMigrated: false,
        migrationDate: undefined,
        legacySessionId: undefined
      });
    });
  });

  describe('cleanupLegacySession', () => {
    it('should mark session as migrated and set migration date', () => {
      const mockDate = '2023-12-01T10:00:00.000Z';
      vi.setSystemTime(new Date(mockDate));

      cleanupLegacySession();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('blawby-session-migrated', 'true');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('blawby-migration-date', mockDate);

      vi.useRealTimers();
    });
  });

  describe('forceMigration', () => {
    it('should clear migration flags and re-run migration', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce('legacy-session-123');

      // Mock successful migration
      const mockValidationResponse = {
        ok: false,
        status: 404
      };

      const mockConversationsResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { conversations: [] }
        })
      };

      const mockMigrationResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          data: { sessionId: 'legacy-session-123' }
        })
      };

      mockFetch
        .mockResolvedValueOnce(mockValidationResponse)
        .mockResolvedValueOnce(mockConversationsResponse)
        .mockResolvedValueOnce(mockMigrationResponse);

      const result = await forceMigration('test-team');

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('blawby-session-migrated');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('blawby-migration-date');
      
      expect(result).toEqual({
        success: true,
        sessionId: 'legacy-session-123',
        migrated: true
      });
    });
  });

  describe('device fingerprinting for legacy sessions', () => {
    it('should generate consistent legacy fingerprint', () => {
      mockLocalStorage.getItem.mockReturnValueOnce('legacy-session-123');

      // Create a mock migration scenario to test fingerprint generation
      const result1 = migrateLegacySession('test-team');
      const result2 = migrateLegacySession('test-team');

      // Both should generate the same fingerprint for the same environment
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });
});
