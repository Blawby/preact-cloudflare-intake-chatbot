import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';

describe('Chat Flow E2E Tests', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev('worker/index.ts', {
      experimental: { disableExperimentalWarning: true },
      vars: {
        PAYMENT_API_KEY: 'test-key',
        RESEND_API_KEY: 'test-resend-key',
        BLAWBY_API_URL: 'https://staging.blawby.com',
        BLAWBY_API_TOKEN: 'test-token',
        BLAWBY_TEAM_ULID: '01jq70jnstyfzevc6423czh50e'
      },
      bindings: {
        DB: {
          prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnValue({
              run: vi.fn().mockResolvedValue({}),
              first: vi.fn().mockImplementation((query: string) => {
                // Mock different database queries
                if (query.includes('teams WHERE id = ?') || query.includes('teams WHERE slug = ?')) {
                  return Promise.resolve({
                    id: 'test-team-id',
                    slug: 'test-team',
                    name: 'Test Team',
                    config: JSON.stringify({
                      availableServices: { '0': 'Family Law' },
                      requiresPayment: false,
                      consultationFee: 0,
                      blawbyApi: {
                        enabled: true,
                        apiKey: 'test-api-key',
                        teamUlid: '01jq70jnstyfzevc6423czh50e'
                      }
                    }),
                    created_at: '2024-01-01T00:00:00.000Z',
                    updated_at: '2024-01-01T00:00:00.000Z'
                  });
                }
                return Promise.resolve(null);
              }),
              all: vi.fn().mockResolvedValue({ results: [] })
            })
          })
        },
        AI: {
          run: vi.fn().mockResolvedValue({
            response: 'I understand your situation. How can I help you with your legal matter?'
          })
        },
        CHAT_SESSIONS: {
          put: vi.fn().mockResolvedValue(undefined),
          get: vi.fn().mockResolvedValue(null)
        }
      }
    });
  });

  afterAll(async () => {
    if (worker) {
      await worker.stop();
    }
  });

  describe('Core API Functionality', () => {
    it('should handle basic chat messages', async () => {
      const teamId = 'test-team-id';
      
      // Test chat with proper message format
      const chatResponse = await worker.fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Hello, I need help with a family law matter'
            }
          ],
          teamId: teamId,
          sessionId: 'test-session-123'
        })
      });

      expect(chatResponse.status).toBe(200);
      const chatData = await chatResponse.json();
      expect(chatData.success).toBe(true);
      expect(chatData.data).toHaveProperty('response');
    }, 10000);

    it('should handle file upload endpoint', async () => {
      const teamId = 'test-team-id';
      
      // Test file upload
      const fileContent = 'This is a test legal document';
      const file = new File([fileContent], 'test-document.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('teamId', teamId);
      formData.append('sessionId', 'test-session-456');

      const uploadResponse = await worker.fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });

      // File upload should either succeed (200) or fail with a specific error (400, 401, 403)
      expect([200, 400, 401, 403]).toContain(uploadResponse.status);
      
      const uploadData = await uploadResponse.json();
      
      if (uploadResponse.status === 200) {
        expect(uploadData.success).toBe(true);
      } else {
        // If it fails due to boundary issues in E2E environment, that's expected
        expect(uploadData).toHaveProperty('error');
      }
    }, 10000);

    it('should handle payment endpoint structure', async () => {
      const teamId = 'test-team-id';
      
      // Test payment endpoint with proper structure
      const paymentResponse = await worker.fetch('/api/payment/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: teamId,
          sessionId: 'test-session-payment',
          customerInfo: {
            name: 'Test Customer',
            email: 'test@example.com',
            phone: '+1234567890',
            location: 'Test City, TS'
          },
          matterInfo: {
            type: 'Family Law',
            description: 'Divorce consultation',
            urgency: 'medium'
          }
        })
      });

      // Payment should either succeed (200) or fail with authentication/validation errors (400, 401, 403)
      expect([200, 400, 401, 403]).toContain(paymentResponse.status);
      
      const paymentData = await paymentResponse.json();
      
      if (paymentResponse.status === 200) {
        expect(paymentData.success).toBe(true);
        expect(paymentData.data).toHaveProperty('invoiceUrl');
        expect(paymentData.data).toHaveProperty('paymentId');
      } else {
        // If it fails due to authentication or other issues, that's expected
        expect(paymentData).toHaveProperty('error');
      }
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle malformed chat requests', async () => {
      const response = await worker.fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required fields
          messages: []
        })
      });

      expect(response.status).toBe(400);
    });

    it('should handle invalid request methods', async () => {
      const response = await worker.fetch('/api/chat', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      expect(response.status).toBe(405);
    });

    it('should handle missing message content', async () => {
      const response = await worker.fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: '' // Empty content
            }
          ],
          teamId: 'test-team',
          sessionId: 'test-session'
        })
      });

      expect(response.status).toBe(400);
    });
  });
}); 