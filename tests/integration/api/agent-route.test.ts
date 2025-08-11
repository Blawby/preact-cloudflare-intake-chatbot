import { describe, it, expect, beforeAll } from 'vitest';
import { handleAgent } from '../../../worker/routes/agent';

// Mock environment with dynamic AI responses
const createMockEnv = (aiResponse: string) => ({
  CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
  CLOUDFLARE_API_TOKEN: 'test-api-token',
  CLOUDFLARE_PUBLIC_URL: 'https://test-worker.workers.dev',
  FILES_BUCKET: null,
  DB: null,
  CHAT_SESSIONS: null,
  RESEND_API_KEY: 'test-resend-key',
  AI: {
    run: async (model: string, options: any) => {
      return { response: aiResponse };
    }
  }
});

describe('Agent Route Integration', () => {
  describe('handleAgent with file attachments', () => {
    it('should extract attachments from request body and pass to AI agent', async () => {
      const requestBody = {
        messages: [
          {
            role: 'user',
            content: 'Can you please provide your full name?',
            isUser: true
          }
        ],
        teamId: 'team-123',
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

      const request = new Request('http://localhost/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const mockEnv = createMockEnv(`TOOL_CALL: analyze_document
PARAMETERS: {
  "file_id": "file-abc123-def456",
  "analysis_type": "resume",
  "specific_question": "Analyze this resume for improvement opportunities"
}`);
      const response = await handleAgent(request, mockEnv, {});
      const result = await response.json();

      // Should have tool calls indicating file analysis was triggered
      expect(result.data.toolCalls).toBeDefined();
      expect(result.data.toolCalls[0].name).toBe('analyze_document');
      expect(result.data.toolCalls[0].parameters.file_id).toBe('file-abc123-def456');
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
        teamId: 'team-123',
        sessionId: 'session-456',
        attachments: []
      };

      const request = new Request('http://localhost/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const mockEnv = createMockEnv('Can you please provide your full name?');
      const response = await handleAgent(request, mockEnv, {});
      const result = await response.json();

      // Should not have tool calls when no attachments
      expect(result.data.toolCalls).toBeUndefined();
      expect(result.data.response).toContain('Can you please provide your full name');
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
        teamId: 'team-123',
        sessionId: 'session-456'
        // No attachments field
      };

      const request = new Request('http://localhost/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const mockEnv = createMockEnv('Can you please provide your full name?');
      const response = await handleAgent(request, mockEnv, {});
      const result = await response.json();

      // Should handle missing attachments gracefully
      expect(result.data.toolCalls).toBeUndefined();
      expect(result.data.response).toContain('Can you please provide your full name');
    });

    it('should handle multiple file attachments', async () => {
      const requestBody = {
        messages: [
          {
            role: 'user',
            content: 'Can you analyze these documents?',
            isUser: true
          }
        ],
        teamId: 'team-123',
        sessionId: 'session-456',
        attachments: [
          {
            name: 'Profile (5).pdf',
            type: 'application/pdf',
            size: 63872,
            url: '/api/files/file-abc123-def456.pdf'
          },
          {
            name: 'contract.pdf',
            type: 'application/pdf',
            size: 102400,
            url: '/api/files/file-def789-ghi012.pdf'
          }
        ]
      };

      const request = new Request('http://localhost/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const mockEnv = createMockEnv(`TOOL_CALL: analyze_document
PARAMETERS: {
  "file_id": "file-abc123-def456",
  "analysis_type": "resume",
  "specific_question": "Analyze these documents"
}`);
      const response = await handleAgent(request, mockEnv, {});
      const result = await response.json();

      // Should trigger file analysis
      expect(result.data.toolCalls).toBeDefined();
      expect(result.data.toolCalls[0].name).toBe('analyze_document');
    });

    it('should handle different file types in attachments', async () => {
      const testCases = [
        {
          file: { name: 'resume.pdf', type: 'application/pdf', size: 50000, url: '/api/files/resume-123.pdf' },
          description: 'resume file'
        },
        {
          file: { name: 'contract.pdf', type: 'application/pdf', size: 80000, url: '/api/files/contract-456.pdf' },
          description: 'legal document'
        },
        {
          file: { name: 'accident_photo.jpg', type: 'image/jpeg', size: 2500000, url: '/api/files/photo-012.jpg' },
          description: 'image file'
        }
      ];

      for (const testCase of testCases) {
        const requestBody = {
          messages: [
            {
              role: 'user',
              content: `Can you analyze this ${testCase.description}?`,
              isUser: true
            }
          ],
          teamId: 'team-123',
          sessionId: 'session-456',
          attachments: [testCase.file]
        };

        const request = new Request('http://localhost/api/agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        const mockEnv = createMockEnv(`TOOL_CALL: analyze_document
PARAMETERS: {
  "file_id": "${testCase.file.url.split('/').pop()?.split('.')[0]}",
  "analysis_type": "${testCase.description === 'resume file' ? 'resume' : testCase.description === 'legal document' ? 'legal_document' : testCase.description === 'image file' ? 'image' : 'general'}",
  "specific_question": "Analyze this ${testCase.description}"
}`);
        const response = await handleAgent(request, mockEnv, {});
        const result = await response.json();

        expect(result.data.toolCalls).toBeDefined();
        expect(result.data.toolCalls[0].name).toBe('analyze_document');
        expect(result.data.toolCalls[0].parameters.file_id).toBe(testCase.file.url.split('/').pop()?.split('.')[0]);
      }
    });
  });

  describe('Request validation', () => {
    it('should reject non-POST requests', async () => {
      const request = new Request('http://localhost/api/agent', {
        method: 'GET'
      });

      const mockEnv = createMockEnv('Test response');
      const response = await handleAgent(request, mockEnv, {});
      expect(response.status).toBe(405); // Method Not Allowed
    });

    it('should reject requests without messages', async () => {
      const requestBody = {
        teamId: 'team-123',
        sessionId: 'session-456',
        attachments: []
      };

      const request = new Request('http://localhost/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const mockEnv = createMockEnv('Test response');
      const response = await handleAgent(request, mockEnv, {});
      expect(response.status).toBe(400); // Bad Request
    });

    it('should reject requests with empty messages', async () => {
      const requestBody = {
        messages: [],
        teamId: 'team-123',
        sessionId: 'session-456',
        attachments: []
      };

      const request = new Request('http://localhost/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const mockEnv = createMockEnv('Test response');
      const response = await handleAgent(request, mockEnv, {});
      expect(response.status).toBe(400); // Bad Request
    });

    it('should reject requests with messages without content', async () => {
      const requestBody = {
        messages: [
          {
            role: 'user',
            isUser: true
            // No content
          }
        ],
        teamId: 'team-123',
        sessionId: 'session-456',
        attachments: []
      };

      const request = new Request('http://localhost/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const mockEnv = createMockEnv('Test response');
      const response = await handleAgent(request, mockEnv, {});
      expect(response.status).toBe(400); // Bad Request
    });
  });

  describe('Response format', () => {
    it('should return proper response structure with tool calls', async () => {
      const requestBody = {
        messages: [
          {
            role: 'user',
            content: 'Can you analyze this resume?',
            isUser: true
          }
        ],
        teamId: 'team-123',
        sessionId: 'session-456',
        attachments: [
          {
            name: 'resume.pdf',
            type: 'application/pdf',
            size: 50000,
            url: '/api/files/resume-123.pdf'
          }
        ]
      };

      const request = new Request('http://localhost/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const mockEnv = createMockEnv(`TOOL_CALL: analyze_document
PARAMETERS: {
  "file_id": "resume-123",
  "analysis_type": "resume",
  "specific_question": "Analyze this resume"
}`);
      const response = await handleAgent(request, mockEnv, {});
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.toolCalls).toBeDefined();
      expect(result.data.toolCalls).toHaveLength(1);
      expect(result.data.toolCalls[0]).toMatchObject({
        name: 'analyze_document',
        parameters: {
          file_id: expect.any(String),
          analysis_type: expect.any(String),
          specific_question: expect.any(String)
        }
      });
    });

    it('should return proper response structure without tool calls', async () => {
      const requestBody = {
        messages: [
          {
            role: 'user',
            content: 'Can you please provide your full name?',
            isUser: true
          }
        ],
        teamId: 'team-123',
        sessionId: 'session-456',
        attachments: []
      };

      const request = new Request('http://localhost/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const mockEnv = createMockEnv('Can you please provide your full name?');
      const response = await handleAgent(request, mockEnv, {});
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.response).toBeDefined();
      expect(result.data.response).toContain('Can you please provide your full name');
      expect(result.data.toolCalls).toBeUndefined();
    });
  });
});
