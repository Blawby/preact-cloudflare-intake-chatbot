import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { createTestMatter } from '../setup-workers';
import '../../worker/index'; // Ensure main worker is loaded

describe('Paralegal API Routes', () => {
  let testTeamId: string;
  let testMatterId: string;

  beforeEach(async () => {
    testTeamId = 'test-team-1';
    testMatterId = await createTestMatter(testTeamId);
  });

  describe('POST /api/paralegal/:teamId/:matterId/advance', () => {
    it('should advance matter state through DO', async () => {
      const response = await SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/${testMatterId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user_input',
          data: {
            clientInfo: { name: 'John Doe', email: 'john@test.com' },
            opposingParty: 'ACME Corporation'
          },
          idempotencyKey: `test-advance-${Date.now()}`
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.stage).toBe('conflicts_check');
      expect(data.data.teamId).toBe(testTeamId);
      expect(data.data.matterId).toBe(testMatterId);
      expect(data.data.action).toBe('advance');
    });

    it('should handle idempotent requests', async () => {
      const idempotencyKey = `idempotent-route-test-${Date.now()}`;
      const requestBody = {
        type: 'user_input',
        data: { clientInfo: { name: 'Jane Doe' }, opposingParty: 'Test Corp' },
        idempotencyKey
      };

      // First request
      const response1 = await SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/${testMatterId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data1 = await response1.json();
      expect(response1.status).toBe(200);
      expect(data1.data.stage).toBe('conflicts_check');

      // Second request with same idempotency key
      const response2 = await SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/${testMatterId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data2 = await response2.json();
      expect(response2.status).toBe(200);
      expect(data2.data.idempotent).toBe(true);
      expect(data2.data.stage).toBe('conflicts_check');
    });

    it('should reject invalid team IDs', async () => {
      const response = await SELF.fetch('https://worker.dev/api/paralegal/invalid-team-id/matter123/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user_input',
          data: { test: true }
        })
      });

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("not found or access denied");
    });

    it('should require POST method', async () => {
      const response = await SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/${testMatterId}/advance`, {
        method: 'GET'
      });

      expect(response.status).toBe(405);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('POST method required');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/${testMatterId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      // Should either return 400 for bad request or 500 for internal error
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('GET /api/paralegal/:teamId/:matterId/status', () => {
    it('should return current matter status', async () => {
      const response = await SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/${testMatterId}/status`);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.stage).toBe('collect_parties');
      expect(data.data.checklist).toBeInstanceOf(Array);
      expect(data.data.nextActions).toBeInstanceOf(Array);
      expect(data.data.teamId).toBe(testTeamId);
      expect(data.data.matterId).toBe(testMatterId);
    });

    it('should require GET method', async () => {
      const response = await SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/${testMatterId}/status`, {
        method: 'POST'
      });

      expect(response.status).toBe(405);
    });

    it('should reject invalid team IDs', async () => {
      const response = await SELF.fetch('https://worker.dev/api/paralegal/invalid-team/matter123/status');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/paralegal/:teamId/:matterId/checklist', () => {
    it('should return matter checklist', async () => {
      const response = await SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/${testMatterId}/checklist`);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.checklist).toBeInstanceOf(Array);
      expect(data.data.stage).toBe('collect_parties');
      expect(data.data.completed).toBe(false);
    });

    it('should require GET method', async () => {
      const response = await SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/${testMatterId}/checklist`, {
        method: 'DELETE'
      });

      expect(response.status).toBe(405);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = [];
      
      // Create 25 requests rapidly (limit is 20 per minute)
      for (let i = 0; i < 25; i++) {
        requests.push(
          SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/rate-test-${i}/status`, {
            headers: { 'X-Forwarded-For': '192.168.1.100' } // Same IP
          })
        );
      }

      const responses = await Promise.all(requests);
      const statusCodes = responses.map(r => r.status);
      
      // Should have some 200s and some 429s
      expect(statusCodes.filter(code => code === 200).length).toBeGreaterThan(0);
      expect(statusCodes.filter(code => code === 429).length).toBeGreaterThan(0);
      
      // At least 5 should be rate limited
      expect(statusCodes.filter(code => code === 429).length).toBeGreaterThanOrEqual(5);
    });

    it('should allow requests from different IPs', async () => {
      const requests = [];
      
      // Create 20 requests from different IPs
      for (let i = 0; i < 20; i++) {
        requests.push(
          SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/ip-test-${i}/status`, {
            headers: { 'X-Forwarded-For': `192.168.1.${i}` } // Different IPs
          })
        );
      }

      const responses = await Promise.all(requests);
      const statusCodes = responses.map(r => r.status);
      
      // All should succeed (different IPs)
      expect(statusCodes.every(code => code === 200)).toBe(true);
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in responses', async () => {
      const response = await SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/${testMatterId}/status`);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    });

    it('should handle OPTIONS preflight requests', async () => {
      const response = await SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/${testMatterId}/advance`, {
        method: 'OPTIONS'
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/${testMatterId}/status`);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Strict-Transport-Security')).toContain('max-age');
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format', async () => {
      const response = await SELF.fetch('https://worker.dev/api/paralegal/invalid-team/matter/status');

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('errorCode');
      expect(typeof data.error).toBe('string');
    });
  });

  describe('URL Parameter Validation', () => {
    it('should reject malformed URLs', async () => {
      // Missing matterId
      const response1 = await SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}//status`);
      expect(response1.status).toBe(400);

      // Missing teamId
      const response2 = await SELF.fetch('https://worker.dev/api/paralegal//matter123/status');
      expect(response2.status).toBe(400);

      // Missing action
      const response3 = await SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/matter123/`);
      expect(response3.status).toBe(400);
    });

    it('should reject invalid actions', async () => {
      const response = await SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/${testMatterId}/invalid-action`);
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toContain('Unknown paralegal action');
    });
  });

  describe('Integration with Durable Object', () => {
    it('should maintain state consistency between route calls', async () => {
      // Advance the matter
      const advanceResponse = await SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/${testMatterId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user_input',
          data: { clientInfo: { name: 'Consistency Test' }, opposingParty: 'Test Corp' },
          idempotencyKey: `consistency-test-${Date.now()}`
        })
      });

      const advanceData = await advanceResponse.json();
      expect(advanceData.data.stage).toBe('conflicts_check');

      // Check status reflects the change
      const statusResponse = await SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/${testMatterId}/status`);
      const statusData = await statusResponse.json();
      expect(statusData.data.stage).toBe('conflicts_check');

      // Check checklist reflects the change
      const checklistResponse = await SELF.fetch(`https://worker.dev/api/paralegal/${testTeamId}/${testMatterId}/checklist`);
      const checklistData = await checklistResponse.json();
      expect(checklistData.data.stage).toBe('conflicts_check');
    });
  });
});
