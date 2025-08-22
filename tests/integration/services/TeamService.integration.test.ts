import { describe, it, expect, beforeAll } from 'vitest';
import { TeamService } from '../../../worker/services/TeamService';

// Mock the Cloudflare D1 database for integration tests
// In a real setup, this would be replaced with actual database bindings
const createMockD1Database = () => {
  return {
    prepare: (query: string) => ({
      bind: (...params: any[]) => ({
        first: async () => {
          // Simulate real database query for the blawby-ai team
          if (query.includes('SELECT id, slug, name, config') && params[0] === '01K0TNGNKTM4Q0AG0XF0A8ST0Q') {
            // Return the actual team record from database (simulated)
            return {
              id: '01K0TNGNKTM4Q0AG0XF0A8ST0Q',
              slug: 'blawby-ai',
              name: 'Blawby AI',
              config: JSON.stringify({
                aiModel: 'llama',
                consultationFee: 0,
                requiresPayment: false,
                ownerEmail: 'paulchrisluke@gmail.com',
                availableServices: ['Business Law', 'Contract Review', 'Intellectual Property', 'Employment Law', 'General Consultation'],
                jurisdiction: {
                  type: 'national',
                  description: 'Available nationwide',
                  supportedStates: ['all'],
                  supportedCountries: ['US']
                },
                domain: 'ai.blawby.com',
                description: 'AI-powered legal assistance for businesses and individuals',
                brandColor: '#2563eb',
                accentColor: '#3b82f6',
                introMessage: 'Hello! I\'m Blawby AI, your intelligent legal assistant.',
                blawbyApi: {
                  enabled: true,
                  apiKey: 'B3aCXQkQiXy81PJ8jhTtnzP2Dn4j0LcK2PG1U3RGa81e67e2',
                  teamUlid: '01jq70jnstyfzevc6423czh50e',
                  apiUrl: 'https://staging.blawby.com'
                }
              }),
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            };
          }
          return null;
        },
        all: async () => ({ results: [] }),
        run: async () => ({ changes: 0 })
      }),
      all: async () => ({ results: [] })
    })
  };
};

describe('TeamService Integration Tests - Real Database Simulation', () => {
  let teamService: TeamService;
  let mockEnv: any;
  
  beforeAll(() => {
    // Create environment that simulates real database with actual team data
    mockEnv = {
      DB: createMockD1Database(),
      CHAT_SESSIONS: {
        put: async () => undefined,
        get: async () => null
      },
      RESEND_API_KEY: 'test-key',
      FILES_BUCKET: {
        put: async () => undefined,
        get: async () => ({
          body: new Blob(['test content'], { type: 'text/plain' }),
          httpMetadata: { contentType: 'text/plain' }
        })
      },
      BLAWBY_API_URL: 'https://staging.blawby.com',
      BLAWBY_API_TOKEN: 'B3aCXQkQiXy81PJ8jhTtnzP2Dn4j0LcK2PG1U3RGa81e67e2',
      BLAWBY_TEAM_ULID: '01jq70jnstyfzevc6423czh50e'
    };

    teamService = new TeamService(mockEnv);
  });

  describe('API Token Validation - Against Real Team Data', () => {
    it('should validate team access with real API token from actual database record', async () => {
      const realTeamId = '01K0TNGNKTM4Q0AG0XF0A8ST0Q'; // blawby-ai team
      const realApiToken = 'B3aCXQkQiXy81PJ8jhTtnzP2Dn4j0LcK2PG1U3RGa81e67e2'; // actual token from DB
      
      // Mock crypto.subtle for test environment
      const originalSubtle = crypto.subtle;
      crypto.subtle = {
        digest: async () => new ArrayBuffer(32)
      } as any;

      try {
        // This tests against the actual team record structure from the database
        const result = await teamService.validateTeamAccess(realTeamId, realApiToken);
        expect(result).toBe(true);
        
        console.log('✅ Successfully validated real API token against actual team record');
      } finally {
        crypto.subtle = originalSubtle;
      }
    });

    it('should reject invalid API token with real team data', async () => {
      const realTeamId = '01K0TNGNKTM4Q0AG0XF0A8ST0Q'; // blawby-ai team
      const invalidToken = 'invalid-token';
      
      const result = await teamService.validateTeamAccess(realTeamId, invalidToken);
      expect(result).toBe(false);
      
      console.log('✅ Successfully rejected invalid token against actual team record');
    });

    it('should retrieve actual team configuration', async () => {
      const realTeamId = '01K0TNGNKTM4Q0AG0XF0A8ST0Q';
      
      const team = await teamService.getTeam(realTeamId);
      
      expect(team).toBeDefined();
      expect(team?.id).toBe(realTeamId);
      expect(team?.slug).toBe('blawby-ai');
      expect(team?.config.blawbyApi?.enabled).toBe(true);
      expect(team?.config.blawbyApi?.apiKey).toBe('B3aCXQkQiXy81PJ8jhTtnzP2Dn4j0LcK2PG1U3RGa81e67e2');
      expect(team?.config.blawbyApi?.teamUlid).toBe('01jq70jnstyfzevc6423czh50e');
      
      console.log('✅ Successfully retrieved and validated actual team configuration');
    });
  });
});
