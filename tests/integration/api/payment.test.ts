import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the TeamService module
vi.mock('../../../worker/services/TeamService', () => ({
  TeamService: vi.fn().mockImplementation(() => ({
    getTeam: vi.fn().mockResolvedValue({
      id: '01jq70jnstyfzevc6423czh50e',
      slug: 'north-carolina-legal-services',
      name: 'North Carolina Legal Services',
      config: {
        requiresPayment: true,
        consultationFee: 150,
        blawbyApi: {
          enabled: true,
          apiKey: 'test-token',
          teamUlid: '01jq70jnstyfzevc6423czh50e'
        }
      }
    }),
    getTeamConfig: vi.fn().mockResolvedValue({
      requiresPayment: true,
      consultationFee: 150,
      blawbyApi: {
        enabled: true,
        apiKey: 'test-token',
        teamUlid: '01jq70jnstyfzevc6423czh50e'
      }
    })
  }))
}));

describe('Payment API Integration', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    // Mock successful API responses
    (fetch as any).mockResolvedValue({
      status: 200,
      json: async () => ({
        message: 'Customer created successfully.',
        data: { id: 'customer-123' }
      })
    });

    worker = await unstable_dev('worker/index.ts', {
      experimental: { disableExperimentalWarning: true },
      vars: {
        PAYMENT_API_KEY: 'test-key',
        RESEND_API_KEY: 'test-resend-key',
        BLAWBY_API_URL: 'http://localhost:3000',
        BLAWBY_API_TOKEN: 'test-token',
        BLAWBY_TEAM_ULID: '01jq70jnstyfzevc6423czh50e'
      },
      bindings: {
        DB: {
          prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnValue({
              run: vi.fn().mockResolvedValue({}),
              first: vi.fn().mockResolvedValue(null),
              all: vi.fn().mockResolvedValue({ results: [] })
            })
          })
        },
        AI: {
          run: vi.fn().mockResolvedValue({
            response: 'Mock AI response'
          })
        }
      }
    });
  });

  afterAll(async () => {
    if (worker) {
      await worker.stop();
    }
  });

  it('should create payment invoice successfully', async () => {
    // Mock customer creation
    (fetch as any).mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        message: 'Customer created successfully.',
        data: { id: 'customer-123' }
      })
    });

    // Mock invoice creation
    (fetch as any).mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        message: 'Invoice created successfully.',
        data: {
          id: 'invoice-123',
          customer_id: 'customer-123',
          payment_link: 'https://staging.blawby.com/pay/invoice-123',
          amount: 150.00
        }
      })
    });

    const paymentRequest = {
      customerInfo: {
        name: 'John Doe',
        email: `test-${Date.now()}@example.com`,
        phone: '5551234567',
        location: 'Charlotte, NC'
      },
      matterInfo: {
        type: 'Employment Law',
        description: 'Terminated for downloading porn on work laptop',
        urgency: 'high',
        opposingParty: 'ABC Company'
      },
      teamId: '01jq70jnstyfzevc6423czh50e',
      sessionId: 'session-123'
    };

    const response = await worker.fetch('/api/payment/create-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentRequest)
    });

    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response body:', result);

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.data.invoiceUrl).toBeDefined();
    expect(result.data.paymentId).toBeDefined();
  });

  it('should handle missing customer information', async () => {
    const invalidRequest = {
      customerInfo: {
        name: 'John Doe',
        // Missing email and phone
        location: 'Charlotte, NC'
      },
      matterInfo: {
        type: 'Employment Law',
        description: 'Terminated for downloading porn on work laptop',
        urgency: 'high'
      },
      teamId: '01jq70jnstyfzevc6423czh50e',
      sessionId: 'session-123'
    };

    const response = await worker.fetch('/api/payment/create-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invalidRequest)
    });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required customer information');
  });

  it('should handle missing matter information', async () => {
    const invalidRequest = {
      customerInfo: {
        name: 'John Doe',
        email: `test-${Date.now()}@example.com`,
        phone: '5551234567',
        location: 'Charlotte, NC'
      },
      matterInfo: {
        // Missing required fields
        type: '',
        description: ''
      },
      teamId: '01jq70jnstyfzevc6423czh50e',
      sessionId: 'session-123'
    };

    const response = await worker.fetch('/api/payment/create-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invalidRequest)
    });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required matter information');
  });

  it('should handle payment webhooks', async () => {
    // Mock the database operations for webhook
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({})
        })
      })
    };

    // Override the worker's DB binding for this test
    (worker as any).env = { ...(worker as any).env, DB: mockDb };

    const webhookData = {
      eventType: 'payment.completed',
      paymentId: 'pay_123',
      status: 'completed',
      amount: 15000,
      customerEmail: 'john@example.com',
      teamId: '01jq70jnstyfzevc6423czh50e'
    };

    const response = await worker.fetch('/api/payment/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
  });

  it('should return 404 for unknown payment endpoints', async () => {
    const response = await worker.fetch('/api/payment/unknown-endpoint', {
      method: 'GET'
    });

    expect(response.status).toBe(404);
  });
}); 