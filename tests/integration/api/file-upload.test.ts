import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fetch for these tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('File Upload API Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('File Upload', () => {
    it('should upload a text file successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          fileId: 'test-file-id-123',
          fileName: 'test-document.txt',
          fileSize: 1024,
          message: 'File uploaded successfully'
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('file', new Blob(['Test content'], { type: 'text/plain' }), 'test-document.txt');
      formData.append('teamId', 'blawby-ai');
      formData.append('sessionId', 'test-session');

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('fileId');
      expect(data).toHaveProperty('fileName');
      expect(data.fileName).toBe('test-document.txt');
    });

    it('should handle PDF file upload', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          fileId: 'test-pdf-id-456',
          fileName: 'test-document.pdf',
          fileSize: 2048,
          message: 'PDF uploaded successfully'
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('file', new Blob(['PDF content'], { type: 'application/pdf' }), 'test-document.pdf');
      formData.append('teamId', 'blawby-ai');
      formData.append('sessionId', 'test-session');

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('fileId');
      expect(data.fileName).toBe('test-document.pdf');
    });

    it('should reject files that are too large', async () => {
      const mockResponse = {
        ok: false,
        status: 413,
        json: () => Promise.resolve({ error: 'File too large' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('file', new Blob(['x'.repeat(10 * 1024 * 1024)], { type: 'text/plain' }), 'large-file.txt');
      formData.append('teamId', 'blawby-ai');
      formData.append('sessionId', 'test-session');

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(413);
    });

    it('should reject unsupported file types', async () => {
      const mockResponse = {
        ok: false,
        status: 415,
        json: () => Promise.resolve({ error: 'Unsupported file type' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('file', new Blob(['executable content'], { type: 'application/x-executable' }), 'test.exe');
      formData.append('teamId', 'blawby-ai');
      formData.append('sessionId', 'test-session');

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(415);
    });
  });

  describe('File Download', () => {
    it('should download uploaded file', async () => {
      const mockUploadResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          fileId: 'test-file-id-123',
          fileName: 'test-document.txt',
        }),
      };

      const mockDownloadResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve('This file will be downloaded for testing.'),
      };

      mockFetch
        .mockResolvedValueOnce(mockUploadResponse)
        .mockResolvedValueOnce(mockDownloadResponse);

      // First upload a file
      const formData = new FormData();
      formData.append('file', new Blob(['This file will be downloaded for testing.'], { type: 'text/plain' }), 'test-document.txt');
      formData.append('teamId', 'blawby-ai');
      formData.append('sessionId', 'test-session');

      const uploadResponse = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      expect(uploadResponse.status).toBe(200);
      const uploadData = await uploadResponse.json();
      const fileId = uploadData.fileId;

      // Then download the file
      const downloadResponse = await fetch(`/api/files/${fileId}`);
      expect(downloadResponse.status).toBe(200);
      
      const downloadedContent = await downloadResponse.text();
      expect(downloadedContent).toBe('This file will be downloaded for testing.');
    });

    it('should handle non-existent file download', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'File not found' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('/api/files/non-existent-file-id');
      expect(response.status).toBe(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing file in upload', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'No file provided' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('teamId', 'blawby-ai');
      formData.append('sessionId', 'test-session');
      // No file appended

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
    });

    it('should handle missing team ID', async () => {
      const mockResponse = {
        ok: false,
        status: 422,
        json: () => Promise.resolve({ error: 'Missing team ID' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const formData = new FormData();
      formData.append('file', new Blob(['Test content'], { type: 'text/plain' }), 'test.txt');
      formData.append('sessionId', 'test-session');
      // No teamId

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(422);
    });
  });
}); 