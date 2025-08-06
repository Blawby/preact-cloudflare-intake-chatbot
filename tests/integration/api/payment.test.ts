import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';

describe('Payment API Integration', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    // Ensure BLAWBY_API_TOKEN is set for integration tests
    if (!process.env.BLAWBY_API_TOKEN) {
      throw new Error('BLAWBY_API_TOKEN environment variable must be set for integration tests');
    }

    worker = await unstable_dev('worker/index.ts', {
      experimental: { disableExperimentalWarning: true },
      vars: {
        PAYMENT_API_KEY: 'test-key',
        RESEND_API_KEY: 'test-resend-key',
        BLAWBY_API_URL: 'https://staging.blawby.com',
        BLAWBY_API_TOKEN: process.env.BLAWBY_API_TOKEN,
        BLAWBY_TEAM_ULID: '01jq70jnstyfzevc6423czh50e'
      }
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should create payment invoice successfully', async () => {
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

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.invoiceUrl).toBeDefined();
    expect(result.paymentId).toBeDefined();
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
        // Missing type and description
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
    expect(result.error).toContain('Missing required matter information');
  });

  it('should handle payment webhooks', async () => {
    const webhookPayload = {
      eventType: 'payment.completed',
      paymentId: 'pay_123456789',
      status: 'completed',
      amount: 5000, // $50.00 in cents
      customerEmail: 'john@example.com'
    };

    const response = await worker.fetch('/api/payment/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
  });

  it('should return 404 for unknown payment endpoints', async () => {
    const response = await worker.fetch('/api/payment/unknown', {
      method: 'GET'
    });

    expect(response.status).toBe(404);
  });
}); 