import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:8787';

// Helper function to parse SSE responses
async function parseSSEResponse(response: Response): Promise<{ responseText: string; events: Array<{ type: string; [key: string]: any }> }> {
  if (!response.body) {
    throw new Error('No response body available');
  }

  const chunks: string[] = [];
  for await (const chunk of response.body) {
    chunks.push(chunk.toString());
  }
  
  const fullResponse = chunks.join('');
  const lines = fullResponse.split('\n');
  let responseText = '';
  const events: Array<{ type: string; [key: string]: any }> = [];
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        events.push(data);
        
        if (data.type === 'text') {
          responseText += data.text;
        } else if (data.type === 'final') {
          responseText = data.response;
        }
      } catch (e) {
        if (process.env.DEBUG) {
          console.debug('Failed to parse SSE data line:', line, e);
        }
        // Ignore parsing errors
      }
    }
  }
  
  return { responseText, events };
}

describe('Agent Routing Tests', () => {
  beforeAll(async () => {
    console.log('🧪 Setting up Agent Routing test environment...');
    
    // Check if API is available
    try {
      const healthResponse = await fetch(`${API_BASE_URL}/api/health`);
      if (!healthResponse.ok) {
        throw new Error(`API not available: ${healthResponse.status}`);
      }
      console.log('✅ API is running and healthy');
    } catch (error) {
      console.error('❌ API not available:', error);
      throw error;
    }
  });

  describe('Intake Agent Routing', () => {
    it('should route to intake agent when paralegal is disabled', async () => {
      console.log('🔍 Testing Intake Agent routing...');
      
      const response = await fetch(`${API_BASE_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'I need legal help with a divorce'
            }
          ],
          teamId: 'blawby-ai', // This team has paralegal disabled
          sessionId: 'intake-test-session'
        })
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');
      
      // Read the stream to verify it's using intake agent
      const { responseText } = await parseSSEResponse(response);
      
      // Verify intake agent response characteristics
      // Intake agent should ask for name/info, not give action steps
      expect(responseText.toLowerCase()).toMatch(/name|tell me|can you/i);
      expect(responseText.toLowerCase()).not.toMatch(/action steps|next steps|here's what you should do/i);
      
      console.log('✅ Verified Intake Agent routing - response preview:', responseText.substring(0, 100));
    });

    it('should create matters when sufficient information is provided', async () => {
      console.log('🔍 Testing Intake Agent matter creation...');
      
      const response = await fetch(`${API_BASE_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'My name is Sarah Johnson and I need help with a divorce. My husband and I are considering divorce.'
            }
          ],
          teamId: 'blawby-ai',
          sessionId: 'intake-matter-test-session'
        })
      });

      expect(response.status).toBe(200);
      
      // Read the stream to check for tool calls
      const { events } = await parseSSEResponse(response);
      
      const toolCallEvent = events.find(event => event.type === 'tool_call' && event.toolName === 'create_matter');
      const hasToolCall = !!toolCallEvent;
      const toolCallData = toolCallEvent;
      
      // Verify matter creation
      expect(hasToolCall).toBe(true);
      expect(toolCallData?.toolName).toBe('create_matter');
      expect(toolCallData?.parameters?.name?.toLowerCase()).toBe('sarah johnson');
      expect(toolCallData?.parameters?.matter_type).toBe('Family Law');
      
      console.log('✅ Verified Intake Agent matter creation');
    });
  });

  describe('Paralegal Agent Routing', () => {
    it('should route to paralegal agent when paralegal is enabled', async () => {
      console.log('🔍 Testing Paralegal Agent routing...');
      
      const response = await fetch(`${API_BASE_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'I need help with a legal issue'
            }
          ],
          teamId: 'paralegal-test-team', // This team has paralegal enabled
          sessionId: 'paralegal-test-session'
        })
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');
      
      // Read the stream to verify it's using paralegal agent
      const { responseText } = await parseSSEResponse(response);
      
      // Verify paralegal agent response characteristics
      // Paralegal agent should provide guidance/advice, not ask for matter creation
      expect(responseText.toLowerCase()).toMatch(/help|guidance|advice|steps|action/i);
      expect(responseText.toLowerCase()).not.toMatch(/create.*matter|matter.*creation/i);
      
      console.log('✅ Verified Paralegal Agent routing - response preview:', responseText.substring(0, 100));
    });
  });

  describe('Routing Logic Tests', () => {
    it('should route to intake agent when user explicitly wants human help', async () => {
      console.log('🔍 Testing explicit human intent routing...');
      
      const response = await fetch(`${API_BASE_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'I need to speak with a lawyer'
            }
          ],
          teamId: 'paralegal-test-team', // Even with paralegal enabled
          sessionId: 'human-intent-test-session'
        })
      });

      expect(response.status).toBe(200);
      
      // Read the stream
      const { responseText } = await parseSSEResponse(response);
      
      // Should route to intake agent (ask for name/info) even with paralegal enabled
      expect(responseText.toLowerCase()).toMatch(/name|tell me|can you/i);
      
      console.log('✅ Verified explicit human intent routing to Intake Agent');
    });
  });
});
