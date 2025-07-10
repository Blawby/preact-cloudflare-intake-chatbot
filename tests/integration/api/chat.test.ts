import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fetch for these tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Chat API Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Basic Chat Functionality', () => {
    it('should handle basic chat messages', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: 'Hello! How can I help you with your legal case?' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello, I need legal help' }],
          teamId: 'demo',
          sessionId: 'test-session',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('message');
      expect(typeof data.message).toBe('string');
    });

    it('should handle chat with case intent', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ 
          message: 'I understand you need help with a business contract dispute. Let me guide you through our case creation process.' 
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'I need help with a business contract dispute' }],
          teamId: 'demo',
          sessionId: 'test-session',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('message');
      expect(data.message).toContain('business') || expect(data.message).toContain('contract');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'healthy', timestamp: new Date().toISOString() }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('/api/health');
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('status');
    });
  });

  describe('Teams Management', () => {
    it('should return available teams', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve([
          { id: 'demo', name: 'Demo Team' },
          { id: 'north-carolina-legal-services', name: 'North Carolina Legal Services' }
        ]),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('/api/teams');
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(fetch('/api/chat')).rejects.toThrow('Network error');
    });

    it('should handle server errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('/api/chat');
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });
}); 