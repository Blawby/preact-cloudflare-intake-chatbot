import { describe, it, expect, beforeAll } from 'vitest';
import { runLegalIntakeAgent } from '../../../worker/agents/legalIntakeAgent';
import { analyzeWithCloudflareAI } from '../../../worker/routes/analyze';

// Mock environment with realistic AI responses
const createMockEnv = (aiResponse: string) => ({
  CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
  CLOUDFLARE_API_TOKEN: 'test-api-token',
  CLOUDFLARE_PUBLIC_URL: 'https://test-worker.workers.dev',
  FILES_BUCKET: {
    get: async (key: string) => {
      // Mock file retrieval
      return {
        body: new Blob(['Mock PDF content'], { type: 'application/pdf' }),
        httpMetadata: { contentType: 'application/pdf' }
      };
    },
    list: async (options: any) => {
      // Mock file listing
      return {
        objects: [
          { key: 'uploads/test-team/test-session/test-file.pdf' }
        ]
      };
    }
  },
  DB: {
    prepare: () => ({
      bind: () => ({
        first: async () => ({
          file_path: 'uploads/test-team/test-session/test-file.pdf',
          file_name: 'test-file.pdf',
          file_type: 'application/pdf',
          file_size: 63872
        })
      })
    })
  },
  CHAT_SESSIONS: {
    get: async () => null,
    put: async () => null
  },
  RESEND_API_KEY: 'test-resend-key',
  AI: {
    run: async (model: string, options: any) => {
      console.log('Mock AI called with model:', model, 'options:', JSON.stringify(options, null, 2));
      return { response: aiResponse };
    }
  }
});

describe('File Analysis Integration - Comprehensive Tests', () => {
  describe('analyzeWithCloudflareAI function', () => {
    it('should properly handle PDF files with text extraction', async () => {
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

      const result = await analyzeWithCloudflareAI(pdfFile, 'Analyze this resume', mockEnv);

      expect(result).toBeDefined();
      expect(result.summary).toContain('John Doe');
      expect(result.key_facts).toHaveLength(4);
      expect(result.entities.people).toContain('John Doe');
      expect(result.entities.orgs).toContain('Tech Corp');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle image files with vision model', async () => {
      // Create a mock image file
      const imageBlob = new Blob(['fake image data'], { type: 'image/jpeg' });
      const imageFile = new File([imageBlob], 'document.jpg', { type: 'image/jpeg' });

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

      const result = await analyzeWithCloudflareAI(imageFile, 'What do you see in this image?', mockEnv);

      expect(result).toBeDefined();
      expect(result.summary).toContain('business document');
      expect(result.key_facts).toHaveLength(3);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle text files properly', async () => {
      const textContent = `
        Legal Document
        Client: Jane Smith
        Case: Employment Dispute
        Date: 2024-01-20
        Summary: Unfair termination claim
      `;
      const textBlob = new Blob([textContent], { type: 'text/plain' });
      const textFile = new File([textBlob], 'legal-doc.txt', { type: 'text/plain' });

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

      const result = await analyzeWithCloudflareAI(textFile, 'Analyze this legal document', mockEnv);

      expect(result).toBeDefined();
      expect(result.summary).toContain('Jane Smith');
      expect(result.entities.people).toContain('Jane Smith');
      expect(result.entities.dates).toContain('2024-01-20');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should handle analysis failures gracefully', async () => {
      const corruptedBlob = new Blob(['corrupted data'], { type: 'application/pdf' });
      const corruptedFile = new File([corruptedBlob], 'corrupted.pdf', { type: 'application/pdf' });

      const mockEnv = createMockEnv(`{
        "summary": "Unable to extract meaningful content from this document",
        "key_facts": [],
        "entities": {
          "people": [],
          "orgs": [],
          "dates": []
        },
        "action_items": [
          "Please provide a readable version of the document",
          "Consider uploading in a different format"
        ],
        "confidence": 0.1
      }`);

      const result = await analyzeWithCloudflareAI(corruptedFile, 'Analyze this document', mockEnv);

      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.action_items).toHaveLength(2);
      expect(result.action_items[0]).toContain('readable version');
    });
  });

  describe('runLegalIntakeAgent with file analysis', () => {
    it('should trigger file analysis when user uploads a resume', async () => {
      const messages = [
        {
          role: 'user',
          content: 'Can you analyze my resume?',
          isUser: true
        }
      ];

      const attachments = [
        {
          name: 'resume.pdf',
          type: 'application/pdf',
          size: 63872,
          url: '/api/files/resume-123.pdf'
        }
      ];

      const mockEnv = createMockEnv(`TOOL_CALL: analyze_document
PARAMETERS: {
  "file_id": "resume-123",
  "analysis_type": "resume",
  "specific_question": "Analyze this resume for improvement opportunities"
}`);

      const result = await runLegalIntakeAgent(mockEnv, messages, 'team-123', 'session-456', undefined, attachments);

      expect(result.toolCalls).toBeDefined();
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].name).toBe('analyze_document');
      expect(result.toolCalls[0].parameters.file_id).toBe('resume-123');
      expect(result.toolCalls[0].parameters.analysis_type).toBe('resume');
    });

    it('should provide meaningful analysis response for resume', async () => {
      const messages = [
        {
          role: 'user',
          content: 'What do you think of my resume?',
          isUser: true
        }
      ];

      const attachments = [
        {
          name: 'resume.pdf',
          type: 'application/pdf',
          size: 63872,
          url: '/api/files/resume-123.pdf'
        }
      ];

      // Mock the AI to return a tool call, then provide analysis
      const mockEnv = createMockEnv(`I've analyzed your resume and found some interesting insights. John Doe is a Software Engineer with 5 years of experience at Tech Corp. Based on what I see, I can help you with:

**Key Strengths:**
- Strong technical skills in JavaScript, Python, and React
- 5 years of relevant experience
- Solid educational background

**Areas for Improvement:**
- Consider adding specific project achievements
- Highlight leadership experience
- Include quantifiable results

What would you like to focus on?`);

      const result = await runLegalIntakeAgent(mockEnv, messages, 'team-123', 'session-456', undefined, attachments);

      expect(result.response).toBeDefined();
      expect(result.response).toContain('analyzed your resume');
      expect(result.response).toContain('Key Strengths');
      expect(result.response).toContain('Areas for Improvement');
    });

    it('should handle legal document analysis appropriately', async () => {
      const messages = [
        {
          role: 'user',
          content: 'Can you review this legal document?',
          isUser: true
        }
      ];

      const attachments = [
        {
          name: 'contract.pdf',
          type: 'application/pdf',
          size: 102400,
          url: '/api/files/contract-456.pdf'
        }
      ];

      const mockEnv = createMockEnv(`I've reviewed your legal document and here's what I found:

**Document Summary:**
This appears to be an employment contract with standard terms and conditions.

**Key Points:**
- Standard employment terms
- Clear termination clauses
- Standard benefits package

**Recommendations:**
- Consider having a lawyer review specific terms
- Pay attention to non-compete clauses
- Verify all dates and amounts

Would you like me to help you understand any specific sections?`);

      const result = await runLegalIntakeAgent(mockEnv, messages, 'team-123', 'session-456', undefined, attachments);

      expect(result.response).toBeDefined();
      expect(result.response).toContain('reviewed your legal document');
      expect(result.response).toContain('Key Points');
      expect(result.response).toContain('Recommendations');
    });

    it('should continue conversation flow after file analysis', async () => {
      const messages = [
        {
          role: 'user',
          content: 'My name is John Doe and I need help with my resume',
          isUser: true
        }
      ];

      const attachments = [
        {
          name: 'resume.pdf',
          type: 'application/pdf',
          size: 63872,
          url: '/api/files/resume-123.pdf'
        }
      ];

      const mockEnv = createMockEnv(`Thank you John Doe! I've analyzed your resume and found some interesting insights. Based on what I see, I can help you with:

**Key Strengths:**
- Strong technical skills in JavaScript, Python, and React
- 5 years of relevant experience

Now I need your phone number to continue with the legal intake process.`);

      const result = await runLegalIntakeAgent(mockEnv, messages, 'team-123', 'session-456', undefined, attachments);

      expect(result.response).toBeDefined();
      expect(result.response).toContain('John Doe');
      expect(result.response).toContain('analyzed your resume');
      expect(result.response).toContain('phone number');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle missing file gracefully', async () => {
      const messages = [
        {
          role: 'user',
          content: 'Analyze this file',
          isUser: true
        }
      ];

      const attachments = [
        {
          name: 'missing.pdf',
          type: 'application/pdf',
          size: 0,
          url: '/api/files/missing.pdf'
        }
      ];

      const mockEnv = createMockEnv(`I'm sorry, I couldn't analyze that document. The file may not be accessible or may not be in a supported format. Could you please try uploading it again or provide more details about what you'd like me to help you with?`);

      const result = await runLegalIntakeAgent(mockEnv, messages, 'team-123', 'session-456', undefined, attachments);

      expect(result.response).toBeDefined();
      expect(result.response).toContain("couldn't analyze");
      expect(result.response).toContain('try uploading it again');
    });

    it('should handle unsupported file types', async () => {
      const messages = [
        {
          role: 'user',
          content: 'What is this file?',
          isUser: true
        }
      ];

      const attachments = [
        {
          name: 'data.exe',
          type: 'application/octet-stream',
          size: 1024000,
          url: '/api/files/data.exe'
        }
      ];

      const mockEnv = createMockEnv(`I'm sorry, but I cannot analyze executable files (.exe) for security reasons. Please upload a document in a supported format such as PDF, image, or text file.`);

      const result = await runLegalIntakeAgent(mockEnv, messages, 'team-123', 'session-456', undefined, attachments);

      expect(result.response).toBeDefined();
      expect(result.response).toContain('cannot analyze executable files');
      expect(result.response).toContain('supported format');
    });
  });
});
