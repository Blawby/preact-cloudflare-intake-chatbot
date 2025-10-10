import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extractOrganizationContext, withOrganizationContext } from '../../../worker/middleware/organizationContext.js';
import type { Env } from '../../../worker/types.js';

// Mock environment
const mockEnv: Env = {
  DB: {} as any,
  AI: {} as any,
  CHAT_SESSIONS: {} as any,
  RESEND_API_KEY: 'test-key',
  DOC_EVENTS: {} as any,
  PARALEGAL_TASKS: {} as any,
} as Env;

// Mock SessionService
vi.mock('../../../worker/services/SessionService.js', () => ({
  SessionService: {
    getSessionTokenFromCookie: vi.fn(),
    resolveSession: vi.fn(),
  }
}));

// Mock auth middleware
vi.mock('../../../worker/middleware/auth.js', () => ({
  optionalAuth: vi.fn(),
}));

describe('OrganizationContext Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractOrganizationContext', () => {
    it('should extract organization from URL parameter', async () => {
      const request = new Request('https://example.com/api/test?organizationId=test-org');
      
      const context = await extractOrganizationContext(request, mockEnv, {
        requireOrganization: true,
        defaultOrganizationId: 'default-org'
      });

      expect(context.organizationId).toBe('test-org');
      expect(context.source).toBe('url');
      expect(context.isAuthenticated).toBe(false);
    });

    it('should use default organization when no URL parameter', async () => {
      const request = new Request('https://example.com/api/test');
      
      const context = await extractOrganizationContext(request, mockEnv, {
        requireOrganization: true,
        defaultOrganizationId: 'default-org'
      });

      expect(context.organizationId).toBe('default-org');
      expect(context.source).toBe('default');
      expect(context.isAuthenticated).toBe(false);
    });

    it('should throw error when organization is required but not found', async () => {
      const request = new Request('https://example.com/api/test');
      
      await expect(
        extractOrganizationContext(request, mockEnv, {
          requireOrganization: true,
          defaultOrganizationId: undefined
        })
      ).rejects.toThrow('Organization context is required but could not be determined');
    });

    it('should use default organization when none provided and not required', async () => {
      const request = new Request('https://example.com/api/test');
      
      const context = await extractOrganizationContext(request, mockEnv, {
        requireOrganization: false,
        defaultOrganizationId: 'custom-default'
      });

      expect(context.organizationId).toBe('custom-default');
      expect(context.source).toBe('default');
    });

    it('should return empty organization when not required and no default provided', async () => {
      const request = new Request('https://example.com/api/test');
      
      const context = await extractOrganizationContext(request, mockEnv, {
        requireOrganization: false,
        defaultOrganizationId: undefined
      });

      expect(context.organizationId).toBe('');
      expect(context.source).toBe('default');
    });
  });

  describe('withOrganizationContext', () => {
    it('should attach organization context to request', async () => {
      const request = new Request('https://example.com/api/test?organizationId=test-org');
      
      const requestWithContext = await withOrganizationContext(request, mockEnv, {
        requireOrganization: true,
        defaultOrganizationId: 'default-org'
      });

      expect(requestWithContext.organizationContext).toBeDefined();
      expect(requestWithContext.organizationContext?.organizationId).toBe('test-org');
      expect(requestWithContext.organizationContext?.source).toBe('url');
    });
  });
});
