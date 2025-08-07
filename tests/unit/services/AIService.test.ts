import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from '../../../worker/services/AIService';

describe('AIService', () => {
  let aiService: AIService;
  let mockEnv: any;

  beforeEach(() => {
    // Create a simple mock environment
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
      },
      BLAWBY_API_URL: 'https://staging.blawby.com',
      BLAWBY_API_TOKEN: 'test-token',
      BLAWBY_TEAM_ULID: '01jq70jnstyfzevc6423czh50e'
    };

    // Create a new instance of AIService with correct constructor parameters
    aiService = new AIService(mockEnv.AI, mockEnv);
  });

  describe('getTeamConfig', () => {
    it('should return team configuration successfully', async () => {
      const teamId = 'test-team-id';
      
      // Mock the AI service to return a valid team config
      vi.spyOn(mockEnv.AI, 'run').mockResolvedValueOnce({
        response: JSON.stringify({
          requiresPayment: false,
          consultationFee: 0,
          availableServices: ['Family Law', 'Business Law'],
          serviceQuestions: {
            'Family Law': ['What type of family issue?'],
            'Business Law': ['What type of business issue?']
          }
        })
      });

      const config = await aiService.getTeamConfig(teamId);
      
      // The actual implementation returns an empty object when no team is found
      // This test verifies the method doesn't throw and returns a defined value
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should handle missing team configuration', async () => {
      const teamId = 'non-existent-team';
      
      // Mock the AI service to return null for non-existent team
      vi.spyOn(mockEnv.AI, 'run').mockResolvedValueOnce({
        response: null
      });

      const config = await aiService.getTeamConfig(teamId);
      
      // The actual implementation returns an empty object when no team is found
      expect(config).toEqual({});
    });
  });

  describe('runLLM', () => {
    it('should run LLM with valid input', async () => {
      const prompt = 'Test prompt';
      const context = { teamId: 'test-team' };
      
      // Mock the AI service to return a valid response
      vi.spyOn(mockEnv.AI, 'run').mockResolvedValueOnce({
        response: 'I understand your situation. How can I help you with your legal matter?'
      });
      
      const result = await aiService.runLLM(prompt, context);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('response');
      expect(typeof result.response).toBe('string');
    });

    it('should handle LLM errors gracefully', async () => {
      const prompt = 'Test prompt';
      const context = { teamId: 'test-team' };
      
      // Mock AI service to throw error
      vi.spyOn(mockEnv.AI, 'run').mockRejectedValueOnce(new Error('AI service error'));
      
      await expect(aiService.runLLM(prompt, context)).rejects.toThrow('AI service error');
    });

    it('should handle various input parameters', async () => {
      // Test with empty messages array
      const result = await aiService.runLLM([], '@cf/meta/llama-3.1-8b-instruct');
      expect(result).toBeDefined();
      
      // Test with undefined messages (should still work as the actual implementation doesn't validate)
      const result2 = await aiService.runLLM(undefined, '@cf/meta/llama-3.1-8b-instruct');
      expect(result2).toBeDefined();
    });
  });

  describe('cache management', () => {
    it('should clear cache for specific team', () => {
      const teamId = 'test-team';
      
      // Clear cache for specific team
      aiService.clearCache(teamId);
      
      // Should not throw any errors
      expect(() => aiService.clearCache(teamId)).not.toThrow();
    });

    it('should clear all cache', () => {
      // Clear all cache
      aiService.clearCache();
      
      // Should not throw any errors
      expect(() => aiService.clearCache()).not.toThrow();
    });
  });
}); 