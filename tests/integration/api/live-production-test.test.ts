import { describe, it, expect, beforeAll } from 'vitest';

// Configuration for live production testing
const PRODUCTION_URL = 'https://blawby-ai-chatbot.paulchrisluke.workers.dev';
const TEAM_ID = 'north-carolina-legal-services';
const SESSION_ID = `test-session-${Date.now()}`;

// Test file data (base64 encoded PDF)
const TEST_PDF_BASE64 = 'JVBERi0xLjQKJcOkw7zDtsO8DQoxIDAgb2JqDQo8PA0KL1R5cGUgL0NhdGFsb2cNCi9QYWdlcyAyIDAgUg0KPj4NCmVuZG9iag0KMiAwIG9iag0KPDwNCi9UeXBlIC9QYWdlcw0KL0tpZHMgWzMgMCBSXQ0KL0NvdW50IDENCj4+DQplbmRvYmoNCjMgMCBvYmoNCjw8DQovVHlwZSAvUGFnZQ0KL1BhcmVudCAyIDAgUg0KL1Jlc291cmNlcyA8PA0KL0ZvbnQgPDwNCi9GMSA0IDAgUg0KPj4NCj4+DQovQ29udGVudHMgNSAwIFINCj4+DQplbmRvYmoNCjQgMCBvYmoNCjw8DQovVHlwZSAvRm9udA0KL1N1YnR5cGUgL1R5cGUxDQovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkDQo+Pg0KZW5kb2JqDQo1IDAgb2JqDQo8PA0KL0xlbmd0aCAxNDQNCj4+DQpzdHJlYW0NCi9GMSAxMiBUZg0KMCBnDQo3MiA3MjAgVGQNCihUZXN0IFBERiBEb2N1bWVudCkgVGoNCkVUDQplbmRzdHJlYW0NCmVuZG9iag0KeHJlZg0KMCA2DQowMDAwMDAwMDAwIDY1NTM1IGYNCjAwMDAwMDAwMTAgMDAwMDAgbg0KMDAwMDAwMDA3OSAwMDAwMCBuDQowMDAwMDAwMTczIDAwMDAwIG4NCjAwMDAwMDAzMDEgMDAwMDAgbg0KMDAwMDAwMDM4MCAwMDAwMCBuDQp0cmFpbGVyDQo8PA0KL1NpemUgNg0KL1Jvb3QgMSAwIFINCj4+DQpzdGFydHhyZWYNCjQ5Mg0KJSVFT0Y=';

// Test image data (base64 encoded PNG)
const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

interface FileUploadResponse {
  success: boolean;
  data?: {
    fileId: string;
    url: string;
  };
  error?: string;
}

interface ChatResponse {
  success: boolean;
  data?: {
    response: string;
    toolCalls?: Array<{
      name: string;
      parameters: any;
    }>;
    analysis?: any;
  };
  error?: string;
}

describe('Live Production System Tests', () => {
  let uploadedFileId: string;
  let uploadedFileUrl: string;

  beforeAll(async () => {
    console.log('🚀 Starting live production tests against:', PRODUCTION_URL);
  });

  describe('File Upload Flow', () => {
    it('should upload a PDF file to production', async () => {
      // Convert base64 to blob
      const pdfBytes = Uint8Array.from(atob(TEST_PDF_BASE64), c => c.charCodeAt(0));
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pdfFile = new File([pdfBlob], 'test-document.pdf', { type: 'application/pdf' });

      // Create FormData
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('teamId', TEAM_ID);
      formData.append('sessionId', SESSION_ID);

      console.log('📤 Uploading test PDF file...');

      // Upload file
      const uploadResponse = await fetch(`${PRODUCTION_URL}/api/files/upload`, {
        method: 'POST',
        body: formData
      });

      expect(uploadResponse.status).toBe(200);
      
      const uploadResult: FileUploadResponse = await uploadResponse.json();
      console.log('📤 Upload response:', uploadResult);

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.data?.fileId).toBeDefined();
      expect(uploadResult.data?.url).toBeDefined();

      uploadedFileId = uploadResult.data!.fileId;
      uploadedFileUrl = uploadResult.data!.url;

      console.log('✅ File uploaded successfully:', {
        fileId: uploadedFileId,
        url: uploadedFileUrl
      });
    }, 30000);

    it('should upload an image file to production', async () => {
      // Convert base64 to blob
      const imageBytes = Uint8Array.from(atob(TEST_IMAGE_BASE64), c => c.charCodeAt(0));
      const imageBlob = new Blob([imageBytes], { type: 'image/png' });
      const imageFile = new File([imageBlob], 'test-image.png', { type: 'image/png' });

      // Create FormData
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('teamId', TEAM_ID);
      formData.append('sessionId', SESSION_ID);

      console.log('📤 Uploading test image file...');

      // Upload file
      const uploadResponse = await fetch(`${PRODUCTION_URL}/api/files/upload`, {
        method: 'POST',
        body: formData
      });

      expect(uploadResponse.status).toBe(200);
      
      const uploadResult: FileUploadResponse = await uploadResponse.json();
      console.log('📤 Image upload response:', uploadResult);

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.data?.fileId).toBeDefined();
    }, 30000);
  });

  describe('Chat with File Analysis', () => {
    it('should analyze uploaded PDF and provide legal intake response', async () => {
      expect(uploadedFileId).toBeDefined();
      
      console.log('💬 Sending chat message with PDF attachment...');

      const chatResponse = await fetch(`${PRODUCTION_URL}/api/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              content: 'Can you analyze this document?',
              isUser: true
            }
          ],
          teamId: TEAM_ID,
          sessionId: SESSION_ID,
          attachments: [
            {
              name: 'test-document.pdf',
              url: uploadedFileUrl,
              type: 'application/pdf'
            }
          ]
        })
      });

      expect(chatResponse.status).toBe(200);
      
      const chatResult: ChatResponse = await chatResponse.json();
      console.log('💬 Chat response:', JSON.stringify(chatResult, null, 2));

      expect(chatResult.success).toBe(true);
      expect(chatResult.data?.response).toBeDefined();

      // Verify the response contains legal analysis
      const response = chatResult.data!.response;
      expect(response).toContain("analyze_document");
      expect(response).toContain("ANALYSIS RESULTS");
      expect(response).toContain("Document Type");
      expect(response).toContain("Key Parties Involved");

      // Verify tool calls if present
      if (chatResult.data?.toolCalls) {
        expect(chatResult.data.toolCalls.length).toBeGreaterThan(0);
        const analyzeCall = chatResult.data.toolCalls.find(call => call.name === 'analyze_document');
        expect(analyzeCall).toBeDefined();
        expect(analyzeCall?.parameters.file_id).toBeDefined();
      }

      console.log('✅ PDF analysis completed successfully');
    }, 60000);

    it('should handle direct file analysis via /api/analyze endpoint', async () => {
      expect(uploadedFileId).toBeDefined();

      console.log('🔍 Testing direct file analysis...');

      // Create a test file for analysis
      const pdfBytes = Uint8Array.from(atob(TEST_PDF_BASE64), c => c.charCodeAt(0));
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pdfFile = new File([pdfBlob], 'test-document.pdf', { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('question', 'Analyze this document for legal intake purposes');

      const analyzeResponse = await fetch(`${PRODUCTION_URL}/api/analyze`, {
        method: 'POST',
        body: formData
      });

      expect(analyzeResponse.status).toBe(200);
      
      const analyzeResult = await analyzeResponse.json();
      console.log('🔍 Analysis response:', JSON.stringify(analyzeResult, null, 2));

      expect(analyzeResult.success).toBe(true);
      expect(analyzeResult.data?.analysis).toBeDefined();
      expect(analyzeResult.data?.analysis.summary).toBeDefined();
      expect(analyzeResult.data?.analysis.confidence).toBeGreaterThan(0);
      expect(analyzeResult.data?.analysis.key_facts).toBeDefined();
      expect(analyzeResult.data?.analysis.entities).toBeDefined();

      console.log('✅ Direct file analysis completed successfully');
    }, 60000);
  });

  describe('Error Handling', () => {
    it('should handle invalid file types gracefully', async () => {
      console.log('❌ Testing invalid file type...');

      const invalidFile = new File(['test content'], 'test.exe', { type: 'application/x-msdownload' });
      const formData = new FormData();
      formData.append('file', invalidFile);
      formData.append('teamId', TEAM_ID);
      formData.append('sessionId', SESSION_ID);

      const uploadResponse = await fetch(`${PRODUCTION_URL}/api/files/upload`, {
        method: 'POST',
        body: formData
      });

      const uploadResult = await uploadResponse.json();
      console.log('❌ Invalid file upload response:', uploadResult);

      expect(uploadResult.success).toBe(false);
      expect(uploadResult.error).toContain('not allowed');
    }, 30000);

    it('should handle missing files gracefully', async () => {
      console.log('❌ Testing missing file...');

      const chatResponse = await fetch(`${PRODUCTION_URL}/api/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              content: 'Analyze this document',
              isUser: true
            }
          ],
          teamId: TEAM_ID,
          sessionId: SESSION_ID,
          attachments: [
            {
              name: 'nonexistent.pdf',
              url: 'https://example.com/nonexistent.pdf',
              type: 'application/pdf'
            }
          ]
        })
      });

      expect(chatResponse.status).toBe(200);
      
      const chatResult = await chatResponse.json();
      console.log('❌ Missing file response:', chatResult);

      expect(chatResult.success).toBe(true);
      // Should still provide a response, even if file analysis fails
      expect(chatResult.data?.response).toBeDefined();
    }, 30000);
  });

  describe('Performance Tests', () => {
    it('should complete file upload within reasonable time', async () => {
      const startTime = Date.now();
      
      const pdfBytes = Uint8Array.from(atob(TEST_PDF_BASE64), c => c.charCodeAt(0));
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pdfFile = new File([pdfBlob], 'performance-test.pdf', { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('teamId', TEAM_ID);
      formData.append('sessionId', SESSION_ID);

      const uploadResponse = await fetch(`${PRODUCTION_URL}/api/files/upload`, {
        method: 'POST',
        body: formData
      });

      const uploadTime = Date.now() - startTime;
      console.log(`⏱️ File upload completed in ${uploadTime}ms`);

      expect(uploadResponse.status).toBe(200);
      expect(uploadTime).toBeLessThan(10000); // Should complete within 10 seconds
    }, 15000);

    it('should complete file analysis within reasonable time', async () => {
      const startTime = Date.now();
      
      const pdfBytes = Uint8Array.from(atob(TEST_PDF_BASE64), c => c.charCodeAt(0));
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pdfFile = new File([pdfBlob], 'performance-analysis.pdf', { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('question', 'Analyze this document for legal intake');

      const analyzeResponse = await fetch(`${PRODUCTION_URL}/api/analyze`, {
        method: 'POST',
        body: formData
      });

      const analysisTime = Date.now() - startTime;
      console.log(`⏱️ File analysis completed in ${analysisTime}ms`);

      expect(analyzeResponse.status).toBe(200);
      expect(analysisTime).toBeLessThan(30000); // Should complete within 30 seconds
    }, 35000);
  });

  describe('Integration Flow', () => {
    it('should complete full workflow: upload -> chat -> analysis -> matter creation', async () => {
      console.log('🔄 Testing complete workflow...');

      // Step 1: Upload file
      const pdfBytes = Uint8Array.from(atob(TEST_PDF_BASE64), c => c.charCodeAt(0));
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pdfFile = new File([pdfBlob], 'workflow-test.pdf', { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('teamId', TEAM_ID);
      formData.append('sessionId', SESSION_ID);

      const uploadResponse = await fetch(`${PRODUCTION_URL}/api/files/upload`, {
        method: 'POST',
        body: formData
      });

      const uploadResult: FileUploadResponse = await uploadResponse.json();
      expect(uploadResult.success).toBe(true);

      // Step 2: Send chat message with file
      const chatResponse = await fetch(`${PRODUCTION_URL}/api/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              content: 'Analyze this document and help me create a legal matter',
              isUser: true
            }
          ],
          teamId: TEAM_ID,
          sessionId: SESSION_ID,
          attachments: [
            {
              name: 'workflow-test.pdf',
              url: uploadResult.data!.url,
              type: 'application/pdf'
            }
          ]
        })
      });

      const chatResult: ChatResponse = await chatResponse.json();
      expect(chatResult.success).toBe(true);
      expect(chatResult.data?.response).toContain("analyze_document");

      console.log('✅ Complete workflow test passed');
    }, 90000);
  });
});
