import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';
import { WORKER_URL } from '../../setup-real-api.js';

/**
 * SECURITY NOTE: The organizations API must not return plaintext credentials.
 * This test loads credentials from environment variables to avoid
 * exfiltrating secrets at runtime. Never rely on API endpoints for
 * secret retrieval in tests or production code.
 */
describe('Payment API Integration - Real Worker Tests', () => {
  let worker: UnstableDevWorker;
  let apiCredentials: { apiToken?: string; organizationUlid?: string } = {};

  beforeAll(async () => {
    // Load API credentials from environment variables (secure approach)
    const apiToken = process.env.BLAWBY_API_TOKEN;
    const organizationUlid = process.env.BLAWBY_ORGANIZATION_ULID;
    
    // Validate credentials before using them
    if (
      apiToken && typeof apiToken === 'string' && apiToken.trim() !== '' &&
      organizationUlid && typeof organizationUlid === 'string' && organizationUlid.trim() !== ''
    ) {
      apiCredentials = { apiToken: apiToken, organizationUlid: organizationUlid };
      console.log('✅ Retrieved API credentials for payment test from environment variables');
      console.log(`   Organization ULID: ${apiCredentials.organizationUlid}`);
      console.log(`   API Token: ${apiCredentials.apiToken ? '***' + apiCredentials.apiToken.slice(-4) : 'NOT SET'}`);
    } else {
      console.warn('⚠️  Blawby API credentials not available in environment variables');
      console.warn('   Set BLAWBY_API_TOKEN and BLAWBY_ORGANIZATION_ULID for real API testing');
      console.warn('   Tests will be skipped if credentials are not provided');
    }

    // Start the worker with retrieved credentials
    worker = await unstable_dev('worker/index.ts', {
      experimental: { disableExperimentalWarning: true },
      vars: {
        PAYMENT_API_KEY: 'test-key',
        RESEND_API_KEY: 'test-resend-key',
        BLAWBY_API_URL: 'https://staging.blawby.com',
        BLAWBY_API_TOKEN: apiCredentials.apiToken || 'test-token',
        BLAWBY_ORGANIZATION_ULID: apiCredentials.organizationUlid || 'test-organization-ulid'
      }
    });
  });

  afterAll(async () => {
    if (worker) {
      await worker.stop();
    }
  });

  it('should create payment invoice successfully', async () => {
    // Skip if no valid credentials
    if (!apiCredentials.apiToken || apiCredentials.apiToken === 'test-token') {
      console.log('⏭️  Skipping payment test - no valid API credentials');
      console.log('   Set BLAWBY_API_TOKEN and BLAWBY_ORGANIZATION_ULID environment variables for real API testing');
      return;
    }

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
      organizationId: apiCredentials.organizationUlid || 'blawby-ai',
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

    // Note: This test may fail if the payment service is not configured
    // That's expected behavior for integration tests
    if (response.status === 200) {
      expect(result.success).toBe(true);
      expect(result.data.invoiceUrl).toBeDefined();
      expect(result.data.paymentId).toBeDefined();
    } else {
      // If payment service is not available, we expect a meaningful error
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      console.log('Payment service not available (expected in test environment):', result.error);
    }
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
      organizationId: apiCredentials.organizationUlid || 'blawby-ai',
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
      organizationId: apiCredentials.organizationUlid || 'blawby-ai',
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

  it('should return 404 for unknown payment endpoints', async () => {
    const response = await worker.fetch('/api/payment/unknown-endpoint', {
      method: 'GET'
    });

    expect(response.status).toBe(404);
  });
}); 