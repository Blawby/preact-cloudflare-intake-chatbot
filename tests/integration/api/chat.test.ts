import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleChat } from '../../../worker/routes/chat';
import { handleHealth } from '../../../worker/routes/health';
import { handleTeams } from '../../../worker/routes/teams';

// Mock the services that the route handlers depend on
vi.mock('../../../worker/services/AIService', () => ({
  AIService: vi.fn().mockImplementation(() => ({
    getTeamConfig: vi.fn().mockResolvedValue({
      requiresPayment: false,
      consultationFee: 0,
      availableServices: ['Family Law', 'Business Law'],
      serviceQuestions: {
        'Family Law': ['What type of family issue?'],
        'Business Law': ['What type of business issue?']
      }
    }),
    runLLM: vi.fn().mockResolvedValue({
      response: 'I understand your situation. How can I help you with your legal matter?'
    })
  }))
}));

// Mock the utils
vi.mock('../../../worker/utils', () => ({
  parseJsonBody: vi.fn().mockImplementation(async (request: Request) => {
    // Simulate the actual parseJsonBody behavior
    try {
      return await request.json();
    } catch {
      throw new Error("Invalid JSON");
    }
  }),
  logChatMessage: vi.fn().mockResolvedValue(undefined),
  CORS_HEADERS: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}));

describe('Chat API Integration Tests', () => {
  let mockEnv;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      AI: {},
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({}),
            all: vi.fn().mockResolvedValue({
              results: [
                { id: 'team1', name: 'Test Team', config: JSON.stringify({ availableServices: ['Family Law'] }) }
              ]
            })
          }),
          all: vi.fn().mockResolvedValue({
            results: [
              { id: 'team1', name: 'Test Team', config: JSON.stringify({ availableServices: ['Family Law'] }) }
            ]
          })
        })
      },
      CHAT_SESSIONS: {
        put: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(null)
      },
      RESEND_API_KEY: 'test-key',
      FILES_BUCKET: undefined
    };
  });

  describe('Basic Chat Functionality', () => {
    it('should handle basic chat messages', async () => {
      const requestBody = {
        messages: [
          { role: 'user', content: 'I need help with a legal matter' }
        ],
        teamId: 'team1',
        sessionId: 'session1'
      };

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await handleChat(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('response');
      expect(responseData.data).toHaveProperty('intent');
    });

    it('should handle chat with matter intent', async () => {
      const requestBody = {
        messages: [
          { role: 'user', content: 'I want to start a legal matter' }
        ],
        teamId: 'team1',
        sessionId: 'session1'
      };

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await handleChat(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('response');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const request = new Request('http://localhost/api/health', {
        method: 'GET'
      });

      const response = await handleHealth(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('status', 'ok');
    });
  });

  describe('Teams Management', () => {
    it('should return available teams', async () => {
      const request = new Request('http://localhost/api/teams', {
        method: 'GET'
      });

      const response = await handleTeams(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(Array.isArray(responseData.data)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid request method', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'GET'
      });

      const response = await handleChat(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(405);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData).toHaveProperty('error');
    });

    it('should handle missing messages', async () => {
      const requestBody = {
        teamId: 'team1',
        sessionId: 'session1'
      };

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await handleChat(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData).toHaveProperty('error');
    });
  });
}); 