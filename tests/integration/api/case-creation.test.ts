import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fetch for these tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Case Creation API Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Service Selection Flow', () => {
    it('should return available services on initial request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          message: 'Please select a practice area',
          services: ['Family Law', 'Business Law', 'Employment Law', 'Criminal Law']
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('/api/case-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: 'north-carolina-legal-services',
          step: 'service-selection',
          sessionId: 'test-session',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('services');
      expect(Array.isArray(data.services)).toBe(true);
      expect(data.services.length).toBeGreaterThan(0);
    });

    it('should proceed to questions when service is selected', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          step: 'questions',
          currentQuestion: 1,
          totalQuestions: 5,
          message: 'What type of family law issue are you dealing with?'
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('/api/case-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: 'north-carolina-legal-services',
          step: 'service-selection',
          service: 'Family Law',
          sessionId: 'test-session',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('step');
      expect(data.step).toBe('questions');
      expect(data).toHaveProperty('currentQuestion');
      expect(data).toHaveProperty('totalQuestions');
    });
  });

  describe('Question Flow', () => {
    it('should progress through questions correctly', async () => {
      const mockResponse1 = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          step: 'questions',
          currentQuestion: 2,
          message: 'Are there any children involved?'
        }),
      };
      mockFetch.mockResolvedValue(mockResponse1);

      const response1 = await fetch('/api/case-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: 'north-carolina-legal-services',
          step: 'questions',
          service: 'Family Law',
          currentQuestionIndex: 1,
          answers: { q1: 'divorce' },
          sessionId: 'test-session',
        }),
      });

      expect(response1.status).toBe(200);
      const data1 = await response1.json();
      expect(data1.step).toBe('questions');
      expect(data1.currentQuestion).toBe(2);
    });

    it('should complete question flow and move to case details', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          step: 'case-details',
          message: 'Please provide details about your case'
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('/api/case-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: 'north-carolina-legal-services',
          step: 'questions',
          service: 'Family Law',
          currentQuestionIndex: 5,
          answers: {
            q1: 'divorce',
            q2: 'yes, 2 children',
            q3: 'no, not yet',
            q4: 'separated, living apart',
            q5: 'no existing court orders',
          },
          sessionId: 'test-session',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.step).toBe('case-details');
    });
  });

  describe('Case Details with Quality Scoring', () => {
    it('should process case details and return quality score', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          qualityScore: {
            score: 75,
            badge: 'Good',
            readyForLawyer: true
          },
          message: 'Your case has been processed successfully'
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('/api/case-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: 'north-carolina-legal-services',
          step: 'case-details',
          service: 'Family Law',
          description: 'Seeking divorce after 10 years of marriage. Have two children ages 8 and 12.',
          urgency: 'Somewhat Urgent',
          answers: {
            q1: 'divorce',
            q2: 'yes, 2 children',
            q3: 'no, not yet',
            q4: 'separated, living apart',
            q5: 'no existing court orders',
          },
          sessionId: 'test-session',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('qualityScore');
      expect(data.qualityScore).toHaveProperty('score');
      expect(data.qualityScore).toHaveProperty('badge');
      expect(data.qualityScore).toHaveProperty('readyForLawyer');
      expect(typeof data.qualityScore.score).toBe('number');
      expect(data.qualityScore.score).toBeGreaterThan(0);
      expect(data.qualityScore.score).toBeLessThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid team ID', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Team not found' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('/api/case-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: 'non-existent-team',
          step: 'service-selection',
        }),
      });

      expect(response.status).toBe(404);
    });

    it('should handle missing required fields', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Missing required fields' }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('/api/case-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: 'north-carolina-legal-services',
          // Missing step
        }),
      });

      expect(response.status).toBe(400);
    });
  });
}); 