import { describe, it, expect, beforeAll } from 'vitest';
import { WORKER_URL } from '../../setup-real-api';

describe('Agent Route Integration - Real API', () => {
  beforeAll(async () => {
    console.log('🧪 Testing agent API against real worker at:', WORKER_URL);
    
    // Verify worker is running
    try {
      const healthResponse = await fetch(`${WORKER_URL}/api/health`);
      if (!healthResponse.ok) {
        throw new Error(`Worker health check failed: ${healthResponse.status}`);
      }
      console.log('✅ Worker is running and healthy');
    } catch (error) {
      throw new Error(`Worker is not running at ${WORKER_URL}. Please ensure wrangler dev is started.`);
    }
  });

  describe('POST /api/agent with file attachments', () => {
    it('should handle requests with file attachments', async () => {
      const requestBody = {
        messages: [
          {
            role: 'user',
            content: 'Can you please provide your full name?',
            isUser: true
          }
        ],
        teamId: 'test-team-1',
        sessionId: 'session-456',
        attachments: [
          {
            name: 'Profile (5).pdf',
            type: 'application/pdf',
            size: 63872,
            url: '/api/files/file-abc123-def456.pdf'
          }
        ]
      };

      const response = await fetch(`${WORKER_URL}/api/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      expect(response.status).toBe(200);
      const result = await response.json();

      // Should have a response from the real AI service
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.response).toBeDefined();
    });

    it('should handle requests without attachments', async () => {
      const requestBody = {
        messages: [
          {
            role: 'user',
            content: 'Can you please provide your full name?',
            isUser: true
          }
        ],
        teamId: 'test-team-1',
        sessionId: 'session-456',
        attachments: []
      };

      const response = await fetch(`${WORKER_URL}/api/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      expect(response.status).toBe(200);
      const result = await response.json();

      // Should have a response from the real AI service
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.response).toBeDefined();
    });

    it('should handle requests with missing attachments field', async () => {
      const requestBody = {
        messages: [
          {
            role: 'user',
            content: 'Can you please provide your full name?',
            isUser: true
          }
        ],
        teamId: 'test-team-1',
        sessionId: 'session-456'
        // No attachments field
      };

      const response = await fetch(`${WORKER_URL}/api/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      expect(response.status).toBe(200);
      const result = await response.json();

      // Should handle missing attachments gracefully
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('POST /api/agent with multiple file types', () => {
    it('should handle requests with multiple file types', async () => {
      const requestBody = {
        messages: [
          {
            role: 'user',
            content: 'Analyze these documents for me',
            isUser: true
          }
        ],
        teamId: 'test-team-1',
        sessionId: 'session-789',
        attachments: [
          {
            name: 'contract.pdf',
            type: 'application/pdf',
            size: 102400,
            url: '/api/files/contract-123.pdf'
          },
          {
            name: 'resume.docx',
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: 51200,
            url: '/api/files/resume-456.docx'
          }
        ]
      };

      const response = await fetch(`${WORKER_URL}/api/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      expect(response.status).toBe(200);
      const result = await response.json();

      // Should handle multiple file types
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('POST /api/agent validation', () => {
    it('should validate required fields', async () => {
      const requestBody = {
        // Missing required fields
        messages: [],
        teamId: '',
        sessionId: ''
      };

      const response = await fetch(`${WORKER_URL}/api/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // Should return validation error
      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.success).toBe(false);
    });

    it('should handle malformed JSON', async () => {
      const response = await fetch(`${WORKER_URL}/api/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      });

      // Should return error for malformed JSON
      expect(response.status).toBe(400);
    });

    it('should handle missing Content-Type header', async () => {
      const requestBody = {
        messages: [
          {
            role: 'user',
            content: 'Test message',
            isUser: true
          }
        ],
        teamId: 'test-team-1',
        sessionId: 'session-123'
      };

      const response = await fetch(`${WORKER_URL}/api/agent`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
        // Missing Content-Type header
      });

      // Should handle missing Content-Type
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/agent with different team configurations', () => {
    it('should work with different team IDs', async () => {
      const requestBody = {
        messages: [
          {
            role: 'user',
            content: 'Hello from a different team',
            isUser: true
          }
        ],
        teamId: 'blawby-ai',
        sessionId: 'session-diff-team',
        attachments: []
      };

      const response = await fetch(`${WORKER_URL}/api/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      expect(response.status).toBe(200);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle non-existent team gracefully', async () => {
      const requestBody = {
        messages: [
          {
            role: 'user',
            content: 'Test message',
            isUser: true
          }
        ],
        teamId: 'non-existent-team',
        sessionId: 'session-123',
        attachments: []
      };

      const response = await fetch(`${WORKER_URL}/api/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // Should handle non-existent team gracefully by using default config
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('POST /api/agent error handling', () => {
    it('should handle large message payloads', async () => {
      const largeMessage = 'A'.repeat(10000); // 10KB message
      const requestBody = {
        messages: [
          {
            role: 'user',
            content: largeMessage,
            isUser: true
          }
        ],
        teamId: 'test-team-1',
        sessionId: 'session-large',
        attachments: []
      };

      const response = await fetch(`${WORKER_URL}/api/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // Should handle large payloads
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
    });

    it('should handle concurrent requests', async () => {
      const requestBody = {
        messages: [
          {
            role: 'user',
            content: 'Concurrent test message',
            isUser: true
          }
        ],
        teamId: 'test-team-1',
        sessionId: 'session-concurrent',
        attachments: []
      };

      // Make multiple concurrent requests
      const promises = Array.from({ length: 3 }, () =>
        fetch(`${WORKER_URL}/api/agent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })
      );

      const responses = await Promise.all(promises);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
