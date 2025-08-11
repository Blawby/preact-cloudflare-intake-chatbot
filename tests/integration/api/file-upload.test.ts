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
            id: 'test-file-123',
            team_id: 'team1',
            session_id: 'session1',
            original_name: 'test-document.txt',
            file_name: 'test-file-123.txt',
            file_path: 'uploads/team1/session1/test-file-123.txt',
            file_type: 'txt',
            file_size: 1024,
            mime_type: 'text/plain',
            is_deleted: false
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

  describe('File Upload - Success Cases', () => {
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
      // Verify response structure
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('fileId');
      expect(responseData.data).toHaveProperty('fileName', 'test-document.txt');
      expect(responseData.data).toHaveProperty('fileType', 'text/plain');
      expect(responseData.data).toHaveProperty('fileSize', 31);
      expect(responseData.data).toHaveProperty('url');
      expect(responseData.data.url).toMatch(/^\/api\/files\/.+$/);

      // Verify R2 bucket was called
      expect(mockEnv.FILES_BUCKET.put).toHaveBeenCalled();
    });

    it('should upload a PDF file successfully', async () => {
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
      expect(responseData.data.fileType).toBe('application/pdf');
      expect(responseData.data.fileName).toBe('test-document.pdf');
    });

    it('should upload an image file successfully', async () => {
      // Create a mock image file
      const fileContent = new Uint8Array([0xFF, 0xD8, 0xFF]); // JPEG header
      const file = new File([fileContent], 'test-image.jpg', { type: 'image/jpeg' });

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
      expect(responseData.data.fileType).toBe('image/jpeg');
    });

    it('should upload a Word document successfully', async () => {
      // Create a mock Word document
      const fileContent = 'PK\x03\x04'; // ZIP header (Word docs are ZIP files)
      const file = new File([fileContent], 'test-document.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

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
      expect(responseData.data.fileType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
  });

  describe('File Upload - Validation Errors', () => {
    it('should reject files that are too large', async () => {
      // Create a large file (11MB)
      const largeContent = 'x'.repeat(11 * 1024 * 1024);
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
      expect(responseData.error).toContain('File size exceeds maximum limit');
      expect(responseData.errorCode).toBe('HTTP_400');
    });

    it('should reject unsupported file types', async () => {
      // Create an unsupported file type with a safe extension
      const fileContent = 'unsupported content';
      const file = new File([fileContent], 'test.xyz', { type: 'application/x-unsupported' });

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
      expect(responseData.error).toContain('File type application/x-unsupported is not supported');
      expect(responseData.errorCode).toBe('HTTP_400');
    });

    it('should reject files with disallowed extensions', async () => {
      // Create a file with disallowed extension
      const fileContent = 'executable content';
      const file = new File([fileContent], 'test.exe', { type: 'application/octet-stream' });

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
      expect(responseData.error).toContain('File extension .exe is not allowed for security reasons');
      expect(responseData.errorCode).toBe('HTTP_400');
    });

    it('should reject uploads with missing file', async () => {
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
      expect(responseData.error).toContain('Invalid upload data');
      expect(responseData.errorCode).toBe('HTTP_400');
    });

    it('should reject uploads with missing team ID', async () => {
      const fileContent = 'test content';
      const file = new File([fileContent], 'test.txt', { type: 'text/plain' });

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
      expect(responseData.error).toContain('Invalid upload data');
      expect(responseData.errorCode).toBe('HTTP_400');
    });

    it('should reject uploads with missing session ID', async () => {
      const fileContent = 'test content';
      const file = new File([fileContent], 'test.txt', { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('teamId', 'team1');
      // No sessionId appended

      const request = new Request('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await handleFiles(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Invalid upload data');
      expect(responseData.errorCode).toBe('HTTP_400');
    });
  });

  describe('File Upload - Configuration Errors', () => {
    it('should handle missing FILES_BUCKET configuration', async () => {
      const envWithoutBucket = { ...mockEnv };
      delete (envWithoutBucket as any).FILES_BUCKET;

      const fileContent = 'test content';
      const file = new File([fileContent], 'test.txt', { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('teamId', 'team1');
      formData.append('sessionId', 'session1');

      const request = new Request('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const response = await handleFiles(request, envWithoutBucket, corsHeaders);
      
      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('File storage is not configured');
      expect(responseData.errorCode).toBe('HTTP_500');
    });
  });

  describe('File Download - Success Cases', () => {
    it('should download uploaded file successfully', async () => {
      const request = new Request('http://localhost/api/files/test-file-123', {
        method: 'GET'
      });

      const response = await handleFiles(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain');
      expect(response.headers.get('Content-Disposition')).toContain('inline; filename="test-document.txt"');
      expect(response.headers.get('Content-Length')).toBe('1024');
      
      const fileContent = await response.text();
      expect(fileContent).toBe('test content');
    });
  });

  describe('File Download - Error Cases', () => {
    it('should handle non-existent file download', async () => {
      // Mock database to return null for non-existent file
      const mockEnvWithNullFile = {
        ...mockEnv,
        DB: {
          ...mockEnv.DB,
          prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null)
            })
          })
        }
      };

      const request = new Request('http://localhost/api/files/non-existent', {
        method: 'GET'
      });

      const response = await handleFiles(request, mockEnvWithNullFile, corsHeaders);
      
      expect(response.status).toBe(404);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('File not found');
      expect(responseData.errorCode).toBe('HTTP_404');
    });

    it('should handle missing file ID in download URL', async () => {
      const request = new Request('http://localhost/api/files/', {
        method: 'GET'
      });

      const response = await handleFiles(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('File ID is required');
      expect(responseData.errorCode).toBe('HTTP_400');
    });

    it('should handle missing FILES_BUCKET for download', async () => {
      const envWithoutBucket = { ...mockEnv };
      delete (envWithoutBucket as any).FILES_BUCKET;

      const request = new Request('http://localhost/api/files/test-file-123', {
        method: 'GET'
      });

      const response = await handleFiles(request, envWithoutBucket, corsHeaders);
      
      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('File storage is not configured');
      expect(responseData.errorCode).toBe('HTTP_500');
    });

    it('should handle file not found in storage', async () => {
      // Mock R2 bucket to return null for file
      const mockEnvWithNullStorage = {
        ...mockEnv,
        FILES_BUCKET: {
          ...mockEnv.FILES_BUCKET,
          get: vi.fn().mockResolvedValue(null)
        }
      };

      const request = new Request('http://localhost/api/files/test-file-123', {
        method: 'GET'
      });

      const response = await handleFiles(request, mockEnvWithNullStorage, corsHeaders);
      
      expect(response.status).toBe(404);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('File not found in storage');
      expect(responseData.errorCode).toBe('HTTP_404');
    });
  });

  describe('File Upload - Edge Cases', () => {
    it('should handle files with no extension', async () => {
      const fileContent = 'test content';
      const file = new File([fileContent], 'testfile', { type: 'text/plain' });

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
      expect(responseData.data.fileName).toBe('testfile');
    });

    it('should handle files with multiple dots in filename', async () => {
      const fileContent = 'test content';
      const file = new File([fileContent], 'test.file.name.txt', { type: 'text/plain' });

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
      expect(responseData.data.fileName).toBe('test.file.name.txt');
    });

    it('should handle files with uppercase extensions', async () => {
      const fileContent = 'test content';
      const file = new File([fileContent], 'test.PDF', { type: 'application/pdf' });

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
      expect(responseData.data.fileName).toBe('test.PDF');
    });
  });

  describe('File Upload - Security Tests', () => {
    it('should reject files with executable extensions regardless of MIME type', async () => {
      const fileContent = 'fake executable content';
      const file = new File([fileContent], 'malicious.exe', { type: 'text/plain' });

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
      expect(responseData.error).toContain('File extension .exe is not allowed for security reasons');
    });

    it('should reject various dangerous file extensions', async () => {
      const dangerousExtensions = ['bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 'msi', 'app'];
      
      for (const ext of dangerousExtensions) {
        const fileContent = 'dangerous content';
        const file = new File([fileContent], `test.${ext}`, { type: 'text/plain' });

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
        expect(responseData.error).toContain(`File extension .${ext} is not allowed for security reasons`);
      }
    });
  });
}); 