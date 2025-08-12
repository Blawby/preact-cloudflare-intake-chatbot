import { describe, it, expect } from 'vitest';

// Simple test to verify real API connectivity
const WORKER_URL = 'https://blawby-ai-chatbot.paulchrisluke.workers.dev';

describe('Simple Real API Test', () => {
  it('should be able to make a real HTTP request', async () => {
    console.log('Testing real API connectivity...');
    
    try {
      // Test basic connectivity first
      const response = await fetch(`${WORKER_URL}/api/health`);
      console.log('Health check response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Health check result:', result);
        expect(result).toBeDefined();
      } else {
        console.log('Health check failed, but that\'s okay for this test');
      }
      
      // Test that we can at least reach the worker
      expect(response).toBeDefined();
      console.log('✅ Basic connectivity test passed');
      
    } catch (error) {
      console.error('Connectivity test failed:', error);
      throw error;
    }
  }, 30000);

  it('should handle a simple text file analysis', async () => {
    console.log('Testing simple text file analysis...');
    
    const textContent = 'Hello, this is a test document. My name is John Doe.';
    const textBlob = new Blob([textContent], { type: 'text/plain' });
    const textFile = new File([textBlob], 'test.txt', { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', textFile);
    formData.append('question', 'What is this document about?');

    try {
      const response = await fetch(`${WORKER_URL}/api/analyze`, {
        method: 'POST',
        body: formData
      });

      console.log('Analysis response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Analysis result:', JSON.stringify(result, null, 2));
        
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.analysis).toBeDefined();
        expect(result.data.analysis.summary).toBeDefined();
        
        console.log('✅ Simple text analysis test passed');
      } else {
        const errorText = await response.text();
        console.error('Analysis failed:', errorText);
        throw new Error(`Analysis failed with status ${response.status}: ${errorText}`);
      }
      
    } catch (error) {
      console.error('Text analysis test failed:', error);
      throw error;
    }
  }, 60000);
});
