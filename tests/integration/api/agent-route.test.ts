import { describe, it, expect, beforeAll } from 'vitest';
import { WORKER_URL } from '../../setup-real-api';

// Helper function to handle streaming responses
async function handleStreamingResponse(response: Response, timeoutMs: number = 30000) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body reader available');
  }
  
  let responseData = '';
  let done = false;
  const startTime = Date.now();
  
  while (!done) {
    // Calculate remaining timeout for this read operation
    const elapsed = Date.now() - startTime;
    const remainingTimeout = Math.max(0, timeoutMs - elapsed);
    
    if (remainingTimeout === 0) {
      reader.cancel();
      reader.releaseLock();
      throw new Error(`Streaming response timeout after ${timeoutMs}ms`);
    }
    
    // Race the read operation against a timeout
    const readPromise = reader.read();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Read timeout after ${remainingTimeout}ms`)), remainingTimeout);
    });
    
    try {
      const { value, done: streamDone } = await Promise.race([readPromise, timeoutPromise]);
      done = streamDone;
      if (value) {
        responseData += new TextDecoder().decode(value);
      }
    } catch (error) {
      reader.cancel();
      reader.releaseLock();
      throw new Error(`Streaming response timeout after ${timeoutMs}ms: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Check if we have a completion event
    if (responseData.includes('"type":"complete"')) {
      break;
    }
  }
  
  reader.releaseLock();
  
  // Parse SSE data
  const events = responseData
    .split('\n\n')
    .filter(chunk => chunk.trim().startsWith('data: '))
    .map(chunk => {
      const jsonStr = chunk.replace('data: ', '').trim();
      try {
        return JSON.parse(jsonStr);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  
  return events;
}

describe('Agent Route Integration - Real API', () => {
  // Increase timeout for streaming tests
  const TEST_TIMEOUT = 30000; // 30 seconds
  
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

  describe('POST /api/agent/stream with file attachments', () => {
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

      const response = await fetch(`${WORKER_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      expect(response.status).toBe(200);
      
      // Handle streaming response
      const events = await handleStreamingResponse(response, TEST_TIMEOUT);
      
      // Should have streaming events
      expect(events.length).toBeGreaterThan(0);
      
      // Check for connection event
      const connectionEvent = events.find(e => e.type === 'connected');
      expect(connectionEvent).toBeDefined();
      
      // Check for completion event
      const completionEvent = events.find(e => e.type === 'complete');
      expect(completionEvent).toBeDefined();
    }, TEST_TIMEOUT);

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

      const response = await fetch(`${WORKER_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      expect(response.status).toBe(200);
      
      // Handle streaming response with longer timeout
      const events = await handleStreamingResponse(response, TEST_TIMEOUT);
      
      // Should have streaming events
      expect(events.length).toBeGreaterThan(0);
      
      // Check for connection event
      const connectionEvent = events.find(e => e.type === 'connected');
      expect(connectionEvent).toBeDefined();
      
      // Check for completion event
      const completionEvent = events.find(e => e.type === 'complete');
      expect(completionEvent).toBeDefined();
    }, TEST_TIMEOUT);

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

      const response = await fetch(`${WORKER_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      expect(response.status).toBe(200);
      
      // Handle streaming response
      const events = await handleStreamingResponse(response, TEST_TIMEOUT);
      
      // Should have streaming events
      expect(events.length).toBeGreaterThan(0);
      
      // Check for connection event
      const connectionEvent = events.find(e => e.type === 'connected');
      expect(connectionEvent).toBeDefined();
      
      // Check for completion event
      const completionEvent = events.find(e => e.type === 'complete');
      expect(completionEvent).toBeDefined();
    }, TEST_TIMEOUT);
  });

  describe('POST /api/agent/stream with multiple file types', () => {
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

      const response = await fetch(`${WORKER_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      expect(response.status).toBe(200);
      
      // Handle streaming response with longer timeout
      const events = await handleStreamingResponse(response, TEST_TIMEOUT);
      
      // Should have streaming events
      expect(events.length).toBeGreaterThan(0);
      
      // Check for connection event
      const connectionEvent = events.find(e => e.type === 'connected');
      expect(connectionEvent).toBeDefined();
      
      // Check for completion event
      const completionEvent = events.find(e => e.type === 'complete');
      expect(completionEvent).toBeDefined();
    }, TEST_TIMEOUT);
  });

  describe('POST /api/agent/stream validation', () => {
    it('should validate required fields', async () => {
      const requestBody = {
        // Missing required fields
        messages: [],
        teamId: '',
        sessionId: ''
      };

      const response = await fetch(`${WORKER_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // Should return validation error
      expect(response.status).toBe(200); // Streaming responses return 200 even for validation errors
      
      // Handle streaming response for validation error
      const events = await handleStreamingResponse(response, TEST_TIMEOUT);
      
      // Should have validation error event
      expect(events.length).toBeGreaterThan(0);
      
      // Check for error event
      const errorEvent = events.find(e => e.type === 'error' || e.type === 'security_block');
      expect(errorEvent).toBeDefined();
    }, TEST_TIMEOUT);

    it('should handle malformed JSON', async () => {
      const response = await fetch(`${WORKER_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      });

      // Should return error for malformed JSON
      expect(response.status).toBe(200); // Streaming responses return 200 even for validation errors
      
      // Handle streaming response for validation error
      const events = await handleStreamingResponse(response, TEST_TIMEOUT);
      
      // Should have validation error event
      expect(events.length).toBeGreaterThan(0);
      
      // Check for error event
      const errorEvent = events.find(e => e.type === 'error' || e.type === 'security_block');
      expect(errorEvent).toBeDefined();
    }, TEST_TIMEOUT);

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

      const response = await fetch(`${WORKER_URL}/api/agent/stream`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
        // Missing Content-Type header
      });

      // Should handle missing Content-Type
      expect(response.status).toBe(400); // Request validation catches this before streaming
    }, TEST_TIMEOUT);
  });

  describe('POST /api/agent/stream with different team configurations', () => {
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

      const response = await fetch(`${WORKER_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      expect(response.status).toBe(200);
      
      // Handle streaming response
      const events = await handleStreamingResponse(response, TEST_TIMEOUT);
      
      // Should have streaming events
      expect(events.length).toBeGreaterThan(0);
      
      // Check for connection event
      const connectionEvent = events.find(e => e.type === 'connected');
      expect(connectionEvent).toBeDefined();
      
      // Check for completion event
      const completionEvent = events.find(e => e.type === 'complete');
      expect(completionEvent).toBeDefined();
    }, TEST_TIMEOUT);

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

      const response = await fetch(`${WORKER_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // Should handle non-existent team gracefully by using default config
      expect(response.status).toBe(200);
      
      // Handle streaming response with longer timeout
      const events = await handleStreamingResponse(response, TEST_TIMEOUT);
      
      // Should have streaming events
      expect(events.length).toBeGreaterThan(0);
      
      // Check for connection event
      const connectionEvent = events.find(e => e.type === 'connected');
      expect(connectionEvent).toBeDefined();
      
      // Check for completion event
      const completionEvent = events.find(e => e.type === 'complete');
      expect(completionEvent).toBeDefined();
    }, TEST_TIMEOUT);
  });

  describe('POST /api/agent/stream error handling', () => {
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

      const response = await fetch(`${WORKER_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // Should handle large payloads
      expect(response.status).toBe(200);
      
      // Handle streaming response with longer timeout
      const events = await handleStreamingResponse(response, TEST_TIMEOUT);
      
      // Should have streaming events
      expect(events.length).toBeGreaterThan(0);
      
      // Check for connection event
      const connectionEvent = events.find(e => e.type === 'connected');
      expect(connectionEvent).toBeDefined();
      
      // Check for completion event
      const completionEvent = events.find(e => e.type === 'complete');
      expect(completionEvent).toBeDefined();
    }, TEST_TIMEOUT);

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
        fetch(`${WORKER_URL}/api/agent/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })
      );

      const responses = await Promise.all(promises);
      
      // All requests should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
        
        // Handle streaming response with longer timeout
        const events = await handleStreamingResponse(response, TEST_TIMEOUT);
        
        // Should have streaming events
        expect(events.length).toBeGreaterThan(0);
        
        // Check for connection event
        const connectionEvent = events.find(e => e.type === 'connected');
        expect(connectionEvent).toBeDefined();
        
        // Check for completion event
        const completionEvent = events.find(e => e.type === 'complete');
        expect(completionEvent).toBeDefined();
      }
    }, TEST_TIMEOUT);
  });
});
