import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';

describe('Payment API Integration', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev('worker/index.ts', {
      experimental: { disableExperimentalWarning: true },
      vars: {
        PAYMENT_API_KEY: 'test-key',
        RESEND_API_KEY: 'test-resend-key'
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
        email: 'john@example.com',
        phone: '555-123-4567',
        location: 'Charlotte, NC'
      },
      matterInfo: {
        type: 'Employment Law',
        description: 'Terminated for downloading porn on work laptop',
        urgency: 'high',
        opposingParty: 'ABC Company'
      },
      teamId: 'test-team-123',
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
      teamId: 'test-team-123',
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
        email: 'john@example.com',
        phone: '555-123-4567',
        location: 'Charlotte, NC'
      },
      matterInfo: {
        // Missing type and description
        urgency: 'high'
      },
      teamId: 'test-team-123',
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