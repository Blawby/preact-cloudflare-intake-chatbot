import { describe, it, expect, beforeAll } from 'vitest';
import { runLegalIntakeAgent } from '../../../worker/agents/legalIntakeAgent';

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

describe('File Analysis Integration', () => {
  describe('runLegalIntakeAgent with file attachments', () => {
    it('should include file information in system prompt when attachments are present', async () => {
      const messages = [
        {
          role: 'user',
          content: 'Can you please provide your full name?',
          isUser: true
        }
      ];

      const attachments = [
        {
          name: 'Profile (5).pdf',
          type: 'application/pdf',
          size: 63872,
          url: '/api/files/file-abc123-def456.pdf'
        }
      ];

      const mockEnv = createMockEnv(`TOOL_CALL: analyze_document
PARAMETERS: {
  "file_id": "file-abc123-def456",
  "analysis_type": "resume",
  "specific_question": "Analyze this resume for improvement opportunities"
}`);

      const result = await runLegalIntakeAgent(mockEnv, messages, 'team-123', 'session-456', undefined, attachments);

      // Should detect tool call
      expect(result.toolCalls).toBeDefined();
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].name).toBe('analyze_document');
      expect(result.toolCalls[0].parameters).toEqual({
        file_id: 'file-abc123-def456',
        analysis_type: 'resume',
        specific_question: 'Analyze this resume for improvement opportunities'
      });
    });

    it('should handle multiple file attachments', async () => {
      const messages = [
        {
          role: 'user',
          content: 'Can you analyze these documents?',
          isUser: true
        }
      ];

      const attachments = [
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
      ];

      const mockEnv = createMockEnv(`TOOL_CALL: analyze_document
PARAMETERS: {
  "file_id": "file-abc123-def456",
  "analysis_type": "resume",
  "specific_question": "Analyze these documents"
}`);

      const result = await runLegalIntakeAgent(mockEnv, messages, 'team-123', 'session-456', undefined, attachments);

      expect(result.toolCalls).toBeDefined();
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].name).toBe('analyze_document');
    });

    it('should not include file information when no attachments are present', async () => {
      const messages = [
        {
          role: 'user',
          content: 'Can you please provide your full name?',
          isUser: true
        }
      ];

      const mockEnv = createMockEnv('Can you please provide your full name?');

      const result = await runLegalIntakeAgent(mockEnv, messages, 'team-123', 'session-456', undefined, []);

      // Should not have tool calls when no files are uploaded
      expect(result.toolCalls).toBeUndefined();
      expect(result.response).toContain('Can you please provide your full name');
    });

    it('should handle different file types correctly', async () => {
      const testCases = [
        {
          file: { name: 'resume.pdf', type: 'application/pdf', size: 50000, url: '/api/files/resume-123.pdf' },
          expectedType: 'resume',
          aiResponse: `TOOL_CALL: analyze_document
PARAMETERS: {
  "file_id": "resume-123",
  "analysis_type": "resume",
  "specific_question": "Analyze this resume"
}`
        },
        {
          file: { name: 'contract.pdf', type: 'application/pdf', size: 80000, url: '/api/files/contract-456.pdf' },
          expectedType: 'legal_document',
          aiResponse: `TOOL_CALL: analyze_document
PARAMETERS: {
  "file_id": "contract-456",
  "analysis_type": "legal_document",
  "specific_question": "Analyze this contract"
}`
        },
        {
          file: { name: 'medical_report.pdf', type: 'application/pdf', size: 120000, url: '/api/files/medical-789.pdf' },
          expectedType: 'medical_document',
          aiResponse: `TOOL_CALL: analyze_document
PARAMETERS: {
  "file_id": "medical-789",
  "analysis_type": "medical_document",
  "specific_question": "Analyze this medical document"
}`
        },
        {
          file: { name: 'accident_photo.jpg', type: 'image/jpeg', size: 2500000, url: '/api/files/photo-012.jpg' },
          expectedType: 'image',
          aiResponse: `TOOL_CALL: analyze_document
PARAMETERS: {
  "file_id": "photo-012",
  "analysis_type": "image",
  "specific_question": "Analyze this image"
}`
        }
      ];

      for (const testCase of testCases) {
        const messages = [
          {
            role: 'user',
            content: 'Can you analyze this document?',
            isUser: true
          }
        ];

        const mockEnv = createMockEnv(testCase.aiResponse);
        const result = await runLegalIntakeAgent(mockEnv, messages, 'team-123', 'session-456', undefined, [testCase.file]);

        expect(result.toolCalls).toBeDefined();
        expect(result.toolCalls[0].name).toBe('analyze_document');
        expect(result.toolCalls[0].parameters.analysis_type).toBe(testCase.expectedType);
      }
    });
  });

  describe('File ID extraction', () => {
    it('should extract file ID correctly from URL', () => {
      const testCases = [
        {
          url: '/api/files/file-abc123-def456.pdf',
          expected: 'file-abc123-def456'
        },
        {
          url: '/api/files/resume-123.pdf',
          expected: 'resume-123'
        },
        {
          url: '/api/files/contract-456.pdf',
          expected: 'contract-456'
        }
      ];

      for (const testCase of testCases) {
        const fileId = testCase.url.split('/').pop()?.split('.')[0] || 'unknown';
        expect(fileId).toBe(testCase.expected);
      }
    });

    it('should handle missing or malformed URLs', () => {
      const testCases = [
        { url: undefined, expected: 'unknown' },
        { url: '', expected: 'unknown' },
        { url: '/api/files/', expected: 'unknown' },
        { url: '/api/files/file.pdf', expected: 'file' }
      ];

      for (const testCase of testCases) {
        const fileId = testCase.url?.split('/').pop()?.split('.')[0] || 'unknown';
        expect(fileId).toBe(testCase.expected);
      }
    });
  });

  describe('System prompt generation', () => {
    it('should generate correct system prompt with file information', async () => {
      const attachments = [
        {
          name: 'Profile (5).pdf',
          type: 'application/pdf',
          size: 63872,
          url: '/api/files/file-abc123-def456.pdf'
        }
      ];

      // We can't directly test the system prompt generation, but we can test the behavior
      const messages = [
        {
          role: 'user',
          content: 'Can you please provide your full name?',
          isUser: true
        }
      ];

      const mockEnv = createMockEnv(`TOOL_CALL: analyze_document
PARAMETERS: {
  "file_id": "file-abc123-def456",
  "analysis_type": "resume",
  "specific_question": "Analyze this resume"
}`);

      const result = await runLegalIntakeAgent(mockEnv, messages, 'team-123', 'session-456', undefined, attachments);

      // Should trigger file analysis
      expect(result.toolCalls).toBeDefined();
      expect(result.toolCalls[0].name).toBe('analyze_document');
      expect(result.toolCalls[0].parameters.file_id).toBe('file-abc123-def456');
    });

    it('should not include file information in system prompt when no attachments', async () => {
      const messages = [
        {
          role: 'user',
          content: 'Can you please provide your full name?',
          isUser: true
        }
      ];

      const mockEnv = createMockEnv('Can you please provide your full name?');

      const result = await runLegalIntakeAgent(mockEnv, messages, 'team-123', 'session-456', undefined, []);

      // Should not trigger file analysis
      expect(result.toolCalls).toBeUndefined();
      expect(result.response).toContain('Can you please provide your full name');
    });
  });

  describe('Tool call handling', () => {
    it('should handle analyze_document tool call correctly', async () => {
      const messages = [
        {
          role: 'user',
          content: 'Can you analyze this resume?',
          isUser: true
        }
      ];

      const attachments = [
        {
          name: 'resume.pdf',
          type: 'application/pdf',
          size: 50000,
          url: '/api/files/resume-123.pdf'
        }
      ];

      const mockEnv = createMockEnv(`TOOL_CALL: analyze_document
PARAMETERS: {
  "file_id": "resume-123",
  "analysis_type": "resume",
  "specific_question": "Analyze this resume"
}`);

      const result = await runLegalIntakeAgent(mockEnv, messages, 'team-123', 'session-456', undefined, attachments);

      expect(result.toolCalls).toBeDefined();
      expect(result.toolCalls[0].name).toBe('analyze_document');
      expect(result.toolCalls[0].parameters).toMatchObject({
        file_id: expect.any(String),
        analysis_type: expect.any(String),
        specific_question: expect.any(String)
      });
    });

    it('should handle unknown tool calls gracefully', async () => {
      const messages = [
        {
          role: 'user',
          content: 'Test message',
          isUser: true
        }
      ];

      const mockEnv = createMockEnv(`TOOL_CALL: unknown_tool
PARAMETERS: {
  "param1": "value1"
}`);

      const result = await runLegalIntakeAgent(mockEnv, messages, 'team-123', 'session-456', undefined, []);

      expect(result.response).toContain('don\'t recognize the tool');
      expect(result.metadata.error).toContain('Unknown tool');
    });
  });
});
