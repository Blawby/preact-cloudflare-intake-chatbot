import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runLegalIntakeAgent } from '../../../worker/agents/legalIntakeAgent';

describe('Opposing Party Intake Flow', () => {
  let mockEnv: any;

  beforeEach(() => {
    mockEnv = {
      AI: {
        run: vi.fn().mockResolvedValue({
          response: 'Mock AI response'
        })
      },
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({}),
            first: vi.fn().mockResolvedValue(null),
            all: vi.fn().mockResolvedValue({ results: [] })
          })
        })
      },
      CHAT_SESSIONS: {
        put: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(null)
      }
    };
  });

  describe('System Prompt Updates', () => {
    it('should include opposing party step in conversation flow', async () => {
      const messages = [
        { isUser: true, content: 'I need help with a divorce' }
      ];

      // Mock AI response that asks for name
      mockEnv.AI.run.mockResolvedValueOnce({
        response: 'Can you please provide your full name?'
      });

      const result = await runLegalIntakeAgent(mockEnv, messages, 'test-team', 'test-session');

      // Verify the AI was called with the updated system prompt
      expect(mockEnv.AI.run).toHaveBeenCalledWith(
        '@cf/meta/llama-3.1-8b-instruct',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('opposing party')
            })
          ])
        })
      );

      expect(result).toBeDefined();
    });

    it('should include opposing party in required information', async () => {
      const messages = [
        { isUser: true, content: 'I need help with a divorce' }
      ];

      // Mock AI response that asks for name
      mockEnv.AI.run.mockResolvedValueOnce({
        response: 'Can you please provide your full name?'
      });

      await runLegalIntakeAgent(mockEnv, messages, 'test-team', 'test-session');

      // Verify the system prompt includes opposing party in the conversation flow
      const systemPrompt = mockEnv.AI.run.mock.calls[0][1].messages[0].content;
      
      expect(systemPrompt).toContain('opposing party');
      expect(systemPrompt).toContain('If name, location, phone, and email provided but no opposing party');
      expect(systemPrompt).toContain('ALL information collected (name, location, phone, email, opposing party)');
    });

    it('should include opposing party in tool call examples', async () => {
      const messages = [
        { isUser: true, content: 'I need help with a divorce' }
      ];

      // Mock AI response that asks for name
      mockEnv.AI.run.mockResolvedValueOnce({
        response: 'Can you please provide your full name?'
      });

      await runLegalIntakeAgent(mockEnv, messages, 'test-team', 'test-session');

      // Verify the system prompt includes opposing party in tool call examples
      const systemPrompt = mockEnv.AI.run.mock.calls[0][1].messages[0].content;
      
      expect(systemPrompt).toContain('"opposing_party": "Jane Jobs"');
    });
  });

  describe('Conversation Flow Steps', () => {
    it('should follow the updated conversation flow with opposing party step', async () => {
      const messages = [
        { isUser: true, content: 'I need help with a divorce' }
      ];

      // Mock AI response that follows the conversation flow
      mockEnv.AI.run.mockResolvedValueOnce({
        response: 'Can you please provide your full name?'
      });

      await runLegalIntakeAgent(mockEnv, messages, 'test-team', 'test-session');

      const systemPrompt = mockEnv.AI.run.mock.calls[0][1].messages[0].content;
      
      // Verify the conversation flow includes the opposing party step
      const conversationFlowMatch = systemPrompt.match(/CONVERSATION FLOW - Follow exactly:([\s\S]*?)LOCATION VALIDATION:/);
      expect(conversationFlowMatch).toBeTruthy();
      
      const flowSteps = conversationFlowMatch![1];
      expect(flowSteps).toContain('5. If name, location, phone, and email provided but no opposing party');
      expect(flowSteps).toContain('6. If ALL information collected (name, location, phone, email, opposing party)');
    });
  });
}); 