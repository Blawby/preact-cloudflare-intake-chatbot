import { describe, it, expect, beforeAll } from 'vitest';
import { handleAnalyze } from '../../../worker/routes/analyze';

// Mock environment with realistic AI responses
const createMockEnv = (aiResponse: string) => ({
  CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
  CLOUDFLARE_API_TOKEN: 'test-api-token',
  CLOUDFLARE_PUBLIC_URL: 'https://test-worker.workers.dev',
  FILES_BUCKET: {
    put: async (key: string, file: any, options: any) => {
      console.log('Mock R2 put:', key, file.name, options);
      return { key };
    },
    delete: async (key: string) => {
      console.log('Mock R2 delete:', key);
      return { key };
    }
  },
  DB: null,
  CHAT_SESSIONS: null,
  RESEND_API_KEY: 'test-resend-key',
  AI: {
    run: async (model: string, options: any) => {
      console.log('Mock AI called with model:', model, 'options:', JSON.stringify(options, null, 2));
      return { response: aiResponse };
    }
  }
});

describe('Analyze API Endpoint - Comprehensive Tests', () => {
  describe('POST /api/analyze', () => {
    it('should analyze PDF files and return structured results', async () => {
      // Create a mock PDF file
      const pdfContent = `
        John Doe
        Software Engineer
        Experience: 5 years at Tech Corp
        Skills: JavaScript, Python, React
        Education: BS Computer Science
      `;
      const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });
      const pdfFile = new File([pdfBlob], 'resume.pdf', { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('q', 'Analyze this resume for improvement opportunities');

      const request = new Request('https://test.com/api/analyze', {
        method: 'POST',
        body: formData
      });

      const mockEnv = createMockEnv(`{
        "summary": "John Doe is a Software Engineer with 5 years of experience at Tech Corp",
        "key_facts": [
          "John Doe is a Software Engineer",
          "5 years experience at Tech Corp",
          "Skills include JavaScript, Python, React",
          "BS in Computer Science"
        ],
        "entities": {
          "people": ["John Doe"],
          "orgs": ["Tech Corp"],
          "dates": []
        },
        "action_items": [
          "Consider highlighting leadership experience",
          "Add specific project achievements"
        ],
        "confidence": 0.85
      }`);

      const response = await handleAnalyze(request, mockEnv, {});
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.analysis).toBeDefined();
      expect(result.data.analysis.summary).toContain('John Doe');
      expect(result.data.analysis.key_facts).toHaveLength(4);
      expect(result.data.analysis.entities.people).toContain('John Doe');
      expect(result.data.analysis.entities.orgs).toContain('Tech Corp');
      expect(result.data.analysis.confidence).toBeGreaterThan(0.5);
      expect(result.data.metadata.fileName).toBe('resume.pdf');
      expect(result.data.metadata.fileType).toBe('application/pdf');
    });

    it('should analyze image files using vision model', async () => {
      // Create a mock image file
      const imageBlob = new Blob(['fake image data'], { type: 'image/jpeg' });
      const imageFile = new File([imageBlob], 'document.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('q', 'What do you see in this image?');

      const request = new Request('https://test.com/api/analyze', {
        method: 'POST',
        body: formData
      });

      const mockEnv = createMockEnv(`{
        "summary": "This appears to be a business document with text and formatting",
        "key_facts": [
          "Document contains business letterhead",
          "Multiple paragraphs of text visible",
          "Professional formatting and layout"
        ],
        "entities": {
          "people": [],
          "orgs": ["Business Corp"],
          "dates": ["2024-01-15"]
        },
        "action_items": [
          "Review document content for accuracy",
          "Consider digital signature"
        ],
        "confidence": 0.78
      }`);

      const response = await handleAnalyze(request, mockEnv, {});
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.analysis).toBeDefined();
      expect(result.data.analysis.summary).toContain('business document');
      expect(result.data.analysis.key_facts).toHaveLength(3);
      expect(result.data.analysis.confidence).toBeGreaterThan(0.5);
      expect(result.data.metadata.fileName).toBe('document.jpg');
      expect(result.data.metadata.fileType).toBe('image/jpeg');
    });

    it('should analyze text files properly', async () => {
      const textContent = `
        Legal Document
        Client: Jane Smith
        Case: Employment Dispute
        Date: 2024-01-20
        Summary: Unfair termination claim
      `;
      const textBlob = new Blob([textContent], { type: 'text/plain' });
      const textFile = new File([textBlob], 'legal-doc.txt', { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', textFile);
      formData.append('q', 'Analyze this legal document');

      const request = new Request('https://test.com/api/analyze', {
        method: 'POST',
        body: formData
      });

      const mockEnv = createMockEnv(`{
        "summary": "Legal document for Jane Smith regarding employment dispute",
        "key_facts": [
          "Client: Jane Smith",
          "Case type: Employment Dispute",
          "Date: 2024-01-20",
          "Issue: Unfair termination claim"
        ],
        "entities": {
          "people": ["Jane Smith"],
          "orgs": [],
          "dates": ["2024-01-20"]
        },
        "action_items": [
          "Review termination circumstances",
          "Gather employment records",
          "Assess potential legal claims"
        ],
        "confidence": 0.92
      }`);

      const response = await handleAnalyze(request, mockEnv, {});
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.analysis).toBeDefined();
      expect(result.data.analysis.summary).toContain('Jane Smith');
      expect(result.data.analysis.entities.people).toContain('Jane Smith');
      expect(result.data.analysis.entities.dates).toContain('2024-01-20');
      expect(result.data.analysis.confidence).toBeGreaterThan(0.8);
    });

    it('should handle missing file gracefully', async () => {
      const formData = new FormData();
      formData.append('q', 'Analyze this document');

      const request = new Request('https://test.com/api/analyze', {
        method: 'POST',
        body: formData
      });

      const mockEnv = createMockEnv('');

      const response = await handleAnalyze(request, mockEnv, {});
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No file provided');
    });

    it('should handle unsupported file types', async () => {
      const exeBlob = new Blob(['executable data'], { type: 'application/octet-stream' });
      const exeFile = new File([exeBlob], 'malware.exe', { type: 'application/octet-stream' });

      const formData = new FormData();
      formData.append('file', exeFile);
      formData.append('q', 'What is this file?');

      const request = new Request('https://test.com/api/analyze', {
        method: 'POST',
        body: formData
      });

      const mockEnv = createMockEnv('');

      const response = await handleAnalyze(request, mockEnv, {});
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file type');
    });

    it('should handle files that are too large', async () => {
      // Create a large file (over 8MB limit)
      const largeContent = 'x'.repeat(9 * 1024 * 1024); // 9MB
      const largeBlob = new Blob([largeContent], { type: 'application/pdf' });
      const largeFile = new File([largeBlob], 'large.pdf', { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', largeFile);
      formData.append('q', 'Analyze this document');

      const request = new Request('https://test.com/api/analyze', {
        method: 'POST',
        body: formData
      });

      const mockEnv = createMockEnv('');

      const response = await handleAnalyze(request, mockEnv, {});
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('File too large');
    });

    it('should handle AI analysis failures gracefully', async () => {
      const pdfContent = 'Test PDF content';
      const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });
      const pdfFile = new File([pdfBlob], 'test.pdf', { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('q', 'Analyze this document');

      const request = new Request('https://test.com/api/analyze', {
        method: 'POST',
        body: formData
      });

      // Mock AI that throws an error
      const mockEnv = {
        ...createMockEnv(''),
        AI: {
          run: async () => {
            throw new Error('AI service unavailable');
          }
        }
      };

      const response = await handleAnalyze(request, mockEnv, {});
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Analysis failed');
    });

    it('should handle missing Cloudflare AI configuration', async () => {
      const pdfContent = 'Test PDF content';
      const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });
      const pdfFile = new File([pdfBlob], 'test.pdf', { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('q', 'Analyze this document');

      const request = new Request('https://test.com/api/analyze', {
        method: 'POST',
        body: formData
      });

      // Mock env without Cloudflare AI config
      const mockEnv = {
        FILES_BUCKET: null,
        DB: null,
        CHAT_SESSIONS: null,
        RESEND_API_KEY: 'test-resend-key',
        AI: {
          run: async () => ({ response: 'test' })
        }
      };

      const response = await handleAnalyze(request, mockEnv, {});
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cloudflare AI not configured');
    });

    it('should reject non-POST requests', async () => {
      const request = new Request('https://test.com/api/analyze', {
        method: 'GET'
      });

      const mockEnv = createMockEnv('');

      const response = await handleAnalyze(request, mockEnv, {});
      const result = await response.json();

      expect(response.status).toBe(405);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Only POST method is allowed');
    });
  });
});
