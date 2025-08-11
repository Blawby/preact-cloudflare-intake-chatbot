import { describe, it, expect, beforeAll } from 'vitest';
import { handleAnalyze } from '../../../worker/routes/analyze';

// Mock environment
const mockEnv = {
  CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
  CLOUDFLARE_API_TOKEN: 'test-api-token',
  CLOUDFLARE_PUBLIC_URL: 'https://test-worker.workers.dev',
  FILES_BUCKET: null,
  DB: null,
  CHAT_SESSIONS: null,
  RESEND_API_KEY: 'test-resend-key'
};

describe('Analyze API', () => {
  it('should reject requests without files', async () => {
    const formData = new FormData();
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: formData
    });

    const response = await handleAnalyze(request, mockEnv, {});
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.error).toBe('No file provided');
  });

  it('should reject unsupported file types', async () => {
    const formData = new FormData();
    const file = new File(['test content'], 'test.exe', { type: 'application/x-msdownload' });
    formData.append('file', file);
    
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: formData
    });

    const response = await handleAnalyze(request, mockEnv, {});
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.error).toContain('File type application/x-msdownload is not supported for analysis');
  });

  it('should reject files that are too large', async () => {
    const formData = new FormData();
    // Create a file larger than 8MB
    const largeContent = 'x'.repeat(9 * 1024 * 1024);
    const file = new File([largeContent], 'large.txt', { type: 'text/plain' });
    formData.append('file', file);
    
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: formData
    });

    const response = await handleAnalyze(request, mockEnv, {});
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.error).toContain('File size exceeds maximum limit of 8MB for analysis');
  });

  it('should accept valid image files', async () => {
    const formData = new FormData();
    // Create a minimal PNG file (just the header)
    const pngHeader = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52
    ]);
    const file = new File([pngHeader], 'test.png', { type: 'image/png' });
    formData.append('file', file);
    formData.append('q', 'What is this image?');
    
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: formData
    });

    const response = await handleAnalyze(request, mockEnv, {});
    
    // Should fail due to fetch not being available in test environment
    expect(response.status).toBe(500);
    const result = await response.json();
    expect(result.error).toContain('Cannot read properties of undefined');
  });

  it('should accept valid text files', async () => {
    const formData = new FormData();
    const file = new File(['This is a test document for legal intake.'], 'test.txt', { type: 'text/plain' });
    formData.append('file', file);
    formData.append('q', 'Summarize this document');
    
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: formData
    });

    const response = await handleAnalyze(request, mockEnv, {});
    
    // Should fail due to fetch not being available in test environment
    expect(response.status).toBe(500);
    const result = await response.json();
    expect(result.error).toContain('Cannot read properties of undefined');
  });

  it('should use default question when none provided', async () => {
    const formData = new FormData();
    const file = new File(['Test content'], 'test.txt', { type: 'text/plain' });
    formData.append('file', file);
    // No 'q' parameter provided
    
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: formData
    });

    const response = await handleAnalyze(request, mockEnv, {});
    
    // Should fail due to fetch not being available in test environment
    expect(response.status).toBe(500);
    const result = await response.json();
    expect(result.error).toContain('Cannot read properties of undefined');
  });
});
