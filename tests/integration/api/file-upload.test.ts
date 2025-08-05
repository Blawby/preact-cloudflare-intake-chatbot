import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleFiles } from '../../../worker/routes/files';

// Mock the utils
vi.mock('../../../worker/utils', () => ({
  CORS_HEADERS: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}));

describe('File Upload API Integration Tests', () => {
  const mockEnv = {
    AI: {},
    DB: {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({}),
          first: vi.fn().mockResolvedValue({
            file_name: 'test-file.txt',
            original_name: 'test-document.txt',
            file_type: 'text/plain',
            file_size: 1024
          }),
          all: vi.fn().mockResolvedValue({ results: [] })
        }),
        all: vi.fn().mockResolvedValue({ results: [] })
      })
    },
    CHAT_SESSIONS: {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null)
    },
    RESEND_API_KEY: 'test-key',
    FILES_BUCKET: {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({
        body: new Blob(['test content'], { type: 'text/plain' }),
        httpMetadata: { contentType: 'text/plain' }
      })
    }
  };

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File Upload', () => {
    it('should upload a text file successfully', async () => {
      // Create a mock file
      const fileContent = 'This is a test document content';
      const file = new File([fileContent], 'test-document.txt', { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('teamId', 'team1');
      formData.append('sessionId', 'session1');

      const request = new Request('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await handleFiles(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('fileId');
      expect(responseData.data).toHaveProperty('fileName');
      expect(responseData.data.fileName).toBe('test-document.txt');
    });

    it('should handle PDF file upload', async () => {
      // Create a mock PDF file
      const fileContent = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // PDF header
      const file = new File([fileContent], 'test-document.pdf', { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('teamId', 'team1');
      formData.append('sessionId', 'session1');

      const request = new Request('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await handleFiles(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('fileId');
      expect(responseData.data.fileName).toBe('test-document.pdf');
    });

    it('should reject files that are too large', async () => {
      // Create a mock file that's too large (11MB)
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
      const file = new File([largeContent], 'large-file.txt', { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('teamId', 'team1');
      formData.append('sessionId', 'session1');

      const request = new Request('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await handleFiles(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData).toHaveProperty('error');
    });

    it('should reject unsupported file types', async () => {
      // Create a mock file with unsupported type
      const file = new File(['content'], 'test.exe', { type: 'application/x-executable' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('teamId', 'team1');
      formData.append('sessionId', 'session1');

      const request = new Request('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await handleFiles(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData).toHaveProperty('error');
    });
  });

  describe('File Download', () => {
    it('should download uploaded file', async () => {
      const request = new Request('http://localhost/api/files/file-123', {
        method: 'GET'
      });

      const response = await handleFiles(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain');
    });

    it('should handle non-existent file download', async () => {
      // Mock the database to return null for non-existent file
      mockEnv.DB.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null)
        })
      });

      const request = new Request('http://localhost/api/files/non-existent', {
        method: 'GET'
      });

      const response = await handleFiles(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing file in upload', async () => {
      const formData = new FormData();
      formData.append('teamId', 'team1');
      formData.append('sessionId', 'session1');
      // No file appended

      const request = new Request('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await handleFiles(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData).toHaveProperty('error');
    });

    it('should handle missing team ID', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', 'session1');
      // No teamId appended

      const request = new Request('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await handleFiles(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData).toHaveProperty('error');
    });

    it('should handle missing FILES_BUCKET configuration', async () => {
      const envWithoutBucket = { ...mockEnv, FILES_BUCKET: undefined };
      
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('teamId', 'team1');
      formData.append('sessionId', 'session1');

      const request = new Request('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await handleFiles(request, envWithoutBucket, corsHeaders);
      
      expect(response.status).toBe(503);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData).toHaveProperty('error');
    });
  });
}); 