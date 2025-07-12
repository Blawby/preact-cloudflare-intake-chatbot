import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendWebhook } from '../../../src/utils/webhooks';

// Mock fetch for these tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Webhook Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  const mockWebhookConfig = {
    enabled: true,
    url: 'https://example.com/webhook',
    secret: 'test-secret',
    events: {
      matterCreation: true,
      matterDetails: true,
      contactForm: true,
      appointment: true,
    },
    retryConfig: {
      maxRetries: 2,
      retryDelay: 1,
    },
  };

  describe('Webhook Sending', () => {
    it('should send webhook successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await sendWebhook(
        mockWebhookConfig,
        'contactForm',
        { test: 'data' },
        'test-session',
        'demo'
      );

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(mockWebhookConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': mockWebhookConfig.secret,
          'User-Agent': 'Blawby-Chatbot/1.0'
        },
        body: expect.stringContaining('"event":"contactForm"'),
      });
    });

    it('should handle webhook failure gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await sendWebhook(
        mockWebhookConfig,
        'contactForm',
        { test: 'data' },
        'test-session',
        'demo'
      );

      expect(result).toBe(false);
    });

    it('should retry on network failure', async () => {
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        });

      const result = await sendWebhook(
        mockWebhookConfig,
        'contactForm',
        { test: 'data' },
        'test-session',
        'demo'
      );

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await sendWebhook(
        mockWebhookConfig,
        'contactForm',
        { test: 'data' },
        'test-session',
        'demo'
      );

      expect(result).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not send when webhook is disabled', async () => {
      const disabledConfig = { ...mockWebhookConfig, enabled: false };

      const result = await sendWebhook(
        disabledConfig,
        'contactForm',
        { test: 'data' },
        'test-session',
        'demo'
      );

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not send when event is disabled', async () => {
      const configWithDisabledEvent = {
        ...mockWebhookConfig,
        events: { ...mockWebhookConfig.events, contactForm: false }
      };

      const result = await sendWebhook(
        configWithDisabledEvent,
        'contactForm',
        { test: 'data' },
        'test-session',
        'demo'
      );

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Webhook Payload Structure', () => {
    it('should include all required fields in payload', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await sendWebhook(
        mockWebhookConfig,
        'contactForm',
        {
          name: 'John Doe',
          email: 'john@example.com',
          message: 'Test message'
        },
        'test-session',
        'demo'
      );

      const callArgs = mockFetch.mock.calls[0];
      const sentPayload = JSON.parse(callArgs[1].body);

      expect(sentPayload).toHaveProperty('event');
      expect(sentPayload).toHaveProperty('timestamp');
      expect(sentPayload).toHaveProperty('sessionId');
      expect(sentPayload).toHaveProperty('teamId');
      expect(sentPayload).toHaveProperty('data');
      expect(sentPayload.event).toBe('contactForm');
      expect(sentPayload.sessionId).toBe('test-session');
      expect(sentPayload.teamId).toBe('demo');
      expect(sentPayload.data).toHaveProperty('name');
      expect(sentPayload.data).toHaveProperty('email');
      expect(sentPayload.data).toHaveProperty('message');
    });
  });
}); 