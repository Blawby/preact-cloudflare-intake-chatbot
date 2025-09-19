import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestContext, setupTestContext, cleanupTestContext } from './helpers/testContext.js';

describe('Paralegal Authentication Integration Tests', () => {
  let testContext: TestContext;

  beforeEach(async () => {
    testContext = await setupTestContext();
  });

  afterEach(async () => {
    await cleanupTestContext(testContext);
  });

  describe('Unauthenticated Access', () => {
    it('should reject paralegal status requests without authentication', async () => {
      const response = await fetch(`${testContext.baseUrl}/api/paralegal/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);
    });

    it('should reject paralegal checklist requests without authentication', async () => {
      const response = await fetch(`${testContext.baseUrl}/api/paralegal/checklist`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);
    });

    it('should reject paralegal advance requests without authentication', async () => {
      const response = await fetch(`${testContext.baseUrl}/api/paralegal/advance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: 'test-team',
          matterId: 'test-matter',
          type: 'test',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Invalid Authentication', () => {
    it('should reject requests with invalid Bearer token', async () => {
      const response = await fetch(`${testContext.baseUrl}/api/paralegal/status`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid API key', async () => {
      const response = await fetch(`${testContext.baseUrl}/api/paralegal/status`, {
        method: 'GET',
        headers: {
          'X-API-Key': 'invalid-api-key',
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);
    });

    it('should reject requests with malformed Authorization header', async () => {
      const response = await fetch(`${testContext.baseUrl}/api/paralegal/status`, {
        method: 'GET',
        headers: {
          'Authorization': 'InvalidFormat token',
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Valid API Key Authentication', () => {
    it('should accept requests with valid API key', async () => {
      // Create a test team with API key
      const teamResponse = await fetch(`${testContext.baseUrl}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Team',
          config: {
            blawbyApi: {
              enabled: true,
            },
          },
        }),
      });

      expect(teamResponse.status).toBe(201);
      const team = await teamResponse.json();

      // Create an API token for the team
      const tokenResponse = await fetch(`${testContext.baseUrl}/api/teams/${team.id}/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Token',
          permissions: ['read', 'write'],
        }),
      });

      expect(tokenResponse.status).toBe(201);
      const tokenData = await tokenResponse.json();

      // Test paralegal status with valid API key
      const response = await fetch(`${testContext.baseUrl}/api/paralegal/status`, {
        method: 'GET',
        headers: {
          'X-API-Key': tokenData.token,
          'Content-Type': 'application/json',
        },
      });

      // Should not be 401 (unauthorized) - might be 400 due to missing metadata
      expect(response.status).not.toBe(401);
    });
  });

  describe('Authorization Bypass Prevention', () => {
    it('should reject requests with missing team/matter metadata', async () => {
      // Create a test team with API key
      const teamResponse = await fetch(`${testContext.baseUrl}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Team',
          config: {
            blawbyApi: {
              enabled: true,
            },
          },
        }),
      });

      const team = await teamResponse.json();

      // Create an API token for the team
      const tokenResponse = await fetch(`${testContext.baseUrl}/api/teams/${team.id}/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Token',
          permissions: ['read', 'write'],
        }),
      });

      const tokenData = await tokenResponse.json();

      // Test paralegal status - should fail due to missing metadata
      const response = await fetch(`${testContext.baseUrl}/api/paralegal/status`, {
        method: 'GET',
        headers: {
          'X-API-Key': tokenData.token,
          'Content-Type': 'application/json',
        },
      });

      // Should be 400 (bad request) due to missing team/matter ID
      expect(response.status).toBe(400);
      const responseText = await response.text();
      expect(responseText).toContain('Missing team or matter ID');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in error responses', async () => {
      const response = await fetch(`${testContext.baseUrl}/api/paralegal/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);
      
      // Check for security headers
      const headers = response.headers;
      expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(headers.get('X-Frame-Options')).toBe('DENY');
      expect(headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to authentication attempts', async () => {
      const requests = Array(10).fill(null).map(() =>
        fetch(`${testContext.baseUrl}/api/paralegal/status`, {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer invalid-token',
            'Content-Type': 'application/json',
          },
        })
      );

      const responses = await Promise.all(requests);
      
      // All should be 401, but rate limiting might kick in
      responses.forEach(response => {
        expect([401, 429]).toContain(response.status);
      });
    });
  });
});
