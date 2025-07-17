import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleMatterCreation } from '../../../worker/routes/matter-creation';

// Mock the services that the route handlers depend on
vi.mock('../../../worker/services/AIService', () => ({
  AIService: vi.fn().mockImplementation(() => ({
    getTeamConfig: vi.fn().mockImplementation(async (teamId) => {
      if (teamId === 'invalid-team') return {};
      return {
        availableServices: ['Family Law', 'Business Law', 'Employment Law', 'Criminal Law'],
        serviceQuestions: {
          'Family Law': [
            'What type of family issue are you dealing with?',
            'Are there any children involved?',
            'Have you filed any court documents?',
            'What is your current living situation?',
            'Do you have any existing court orders?'
          ],
          'Business Law': [
            'What type of business issue are you facing?',
            'Is this related to contracts, employment, or something else?',
            'What is the estimated value of this matter?',
            'Have you consulted with any other attorneys?'
          ]
        }
      };
    }),
    runLLM: vi.fn().mockResolvedValue({
      response: 'I understand your situation. Let me help you with the next steps.'
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
  createMatterRecord: vi.fn().mockResolvedValue('matter-123'),
  storeMatterQuestion: vi.fn().mockResolvedValue(undefined),
  storeAISummary: vi.fn().mockResolvedValue(undefined),
  CORS_HEADERS: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}));

// Mock the quality assessment
vi.mock('../../../worker/utils/qualityAssessment', () => ({
  assessMatterQuality: vi.fn().mockReturnValue({
    score: 85,
    readyForLawyer: true,
    breakdown: {
      answerQuality: 90,
      completeness: 80,
      clarity: 85
    },
    issues: []
  })
}));

// Mock the webhook service
vi.mock('../../../worker/services/WebhookService', () => ({
  WebhookService: vi.fn().mockImplementation(() => ({
    sendWebhook: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('Matter Creation API Integration Tests', () => {
  const mockEnv = {
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

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Selection Flow', () => {
    it('should return available services on initial request', async () => {
      const requestBody = {
        teamId: 'team1',
        step: 'service-selection'
      };

      const request = new Request('http://localhost/api/matter-creation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await handleMatterCreation(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('step');
      expect(data.step).toBe('service-selection');
      expect(data).toHaveProperty('services');
    });

    it('should proceed to questions when service is selected', async () => {
      const requestBody = {
        teamId: 'team1',
        step: 'service-selection',
        service: 'Family Law'
      };

      const request = new Request('http://localhost/api/matter-creation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await handleMatterCreation(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('step');
      expect(data.step).toBe('questions');
      expect(data).toHaveProperty('selectedService');
    });
  });

  describe('Question Flow', () => {
    it('should progress through questions correctly', async () => {
      const requestBody = {
        teamId: 'team1',
        step: 'questions',
        service: 'Family Law',
        currentQuestionIndex: 0
      };

      const request = new Request('http://localhost/api/matter-creation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await handleMatterCreation(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.step).toBe('questions');
      expect(data).toHaveProperty('currentQuestion');
    });

    it('should complete question flow and move to matter details', async () => {
      const requestBody = {
        teamId: 'team1',
        step: 'questions',
        service: 'Family Law',
        currentQuestionIndex: 5, // Beyond the number of questions
        answers: {
          'question1': { question: 'What type of family issue?', answer: 'Divorce' },
          'question2': { question: 'Are there children involved?', answer: 'Yes, two children' }
        }
      };

      const request = new Request('http://localhost/api/matter-creation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await handleMatterCreation(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.step).toBe('matter-review');
    });
  });

  describe('Matter Details with Quality Scoring', () => {
    it('should process matter details and return quality score', async () => {
      const requestBody = {
        teamId: 'team1',
        step: 'matter-review',
        service: 'Family Law',
        description: 'I need help with a divorce case involving child custody',
        answers: {
          'question1': { question: 'What type of family issue?', answer: 'Divorce' },
          'question2': { question: 'Are there children involved?', answer: 'Yes, two children' }
        }
      };

      const request = new Request('http://localhost/api/matter-creation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await handleMatterCreation(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('qualityScore');
      expect(data.qualityScore).toHaveProperty('score');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid team ID', async () => {
      const requestBody = {
        teamId: 'invalid-team',
        step: 'service-selection'
      };

      const request = new Request('http://localhost/api/matter-creation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await handleMatterCreation(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(404);
    });

    it('should handle missing required fields', async () => {
      const requestBody = {
        step: 'service-selection'
        // Missing teamId
      };

      const request = new Request('http://localhost/api/matter-creation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await handleMatterCreation(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(400);
    });

    it('should handle invalid request method', async () => {
      const request = new Request('http://localhost/api/matter-creation', {
        method: 'GET'
      });

      const response = await handleMatterCreation(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(405);
    });
  });
}); 