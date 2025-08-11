import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleTeams } from '../../../worker/routes/teams';

// Mock the TeamService module
const mockListTeams = vi.fn();
const mockGetTeam = vi.fn();
const mockCreateTeam = vi.fn();
const mockUpdateTeam = vi.fn();
const mockDeleteTeam = vi.fn();

vi.mock('../../../worker/services/TeamService', () => ({
  TeamService: vi.fn().mockImplementation(() => ({
    listTeams: mockListTeams,
    getTeam: mockGetTeam,
    createTeam: mockCreateTeam,
    updateTeam: mockUpdateTeam,
    deleteTeam: mockDeleteTeam
  }))
}));

describe('Teams API Integration Tests', () => {
  let mockEnv: any;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  const mockTeam = {
    id: '01K0TNGNKTM4Q0AG0XF0A8ST0Q',
    slug: 'blawby-ai',
    name: 'Blawby AI',
    config: {
      aiModel: 'llama',
      consultationFee: 0,
      requiresPayment: false,
      ownerEmail: 'paulchrisluke@gmail.com',
      availableServices: ['Business Law', 'Contract Review'],
      jurisdiction: {
        type: 'national',
        description: 'Available nationwide',
        supportedStates: ['all'],
        supportedCountries: ['US']
      },
      domain: 'ai.blawby.com',
      description: 'AI-powered legal assistance',
      brandColor: '#2563eb',
      accentColor: '#3b82f6',
      introMessage: 'Hello! How can I help you today?'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEnv = {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({}),
            first: vi.fn().mockResolvedValue(null),
            all: vi.fn().mockResolvedValue({ results: [] })
          })
        })
      }
    };
  });

  describe('GET /api/teams', () => {
    it('should return all teams successfully', async () => {
      const teams = [mockTeam, { ...mockTeam, id: 'team2', slug: 'team2', name: 'Team 2' }];
      mockListTeams.mockResolvedValue(teams);

      const request = new Request('http://localhost/api/teams', {
        method: 'GET'
      });

      const response = await handleTeams(request, mockEnv);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(Array.isArray(responseData.data)).toBe(true);
      expect(responseData.data).toHaveLength(2);
      expect(responseData.data[0]).toHaveProperty('id', mockTeam.id);
      expect(responseData.data[0]).toHaveProperty('slug', mockTeam.slug);
      expect(responseData.data[0]).toHaveProperty('name', mockTeam.name);
    });

    it('should return empty array when no teams exist', async () => {
      mockListTeams.mockResolvedValue([]);

      const request = new Request('http://localhost/api/teams', {
        method: 'GET'
      });

      const response = await handleTeams(request, mockEnv);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(Array.isArray(responseData.data)).toBe(true);
      expect(responseData.data).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      mockListTeams.mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/teams', {
        method: 'GET'
      });

      const response = await handleTeams(request, mockEnv);
      
      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Database error');
    });
  });

  describe('GET /api/teams/{id}', () => {
    it('should return specific team by ID', async () => {
      mockGetTeam.mockResolvedValue(mockTeam);

      const request = new Request(`http://localhost/api/teams/${mockTeam.id}`, {
        method: 'GET'
      });

      const response = await handleTeams(request, mockEnv);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('id', mockTeam.id);
      expect(responseData.data).toHaveProperty('slug', mockTeam.slug);
      expect(responseData.data).toHaveProperty('name', mockTeam.name);
      expect(responseData.data).toHaveProperty('config');
    });

    it('should return specific team by slug', async () => {
      mockGetTeam.mockResolvedValue(mockTeam);

      const request = new Request('http://localhost/api/teams/blawby-ai', {
        method: 'GET'
      });

      const response = await handleTeams(request, mockEnv);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('slug', 'blawby-ai');
    });

    it('should return 404 for non-existent team', async () => {
      mockGetTeam.mockResolvedValue(null);

      const request = new Request('http://localhost/api/teams/non-existent', {
        method: 'GET'
      });

      const response = await handleTeams(request, mockEnv);
      
      expect(response.status).toBe(404);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Team not found');
    });
  });

  describe('POST /api/teams', () => {
    it('should create new team successfully', async () => {
      const newTeamData = {
        slug: 'new-team',
        name: 'New Legal Team',
        config: {
          aiModel: 'llama',
          consultationFee: 50,
          requiresPayment: true,
          ownerEmail: 'owner@example.com',
          availableServices: ['Family Law'],
          jurisdiction: {
            type: 'state',
            description: 'Available in California',
            supportedStates: ['CA'],
            supportedCountries: ['US']
          }
        }
      };

      const createdTeam = {
        ...newTeamData,
        id: 'new-team-id',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      mockGetTeam.mockResolvedValue(null); // Team doesn't exist
      mockCreateTeam.mockResolvedValue(createdTeam);

      const request = new Request('http://localhost/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTeamData)
      });

      const response = await handleTeams(request, mockEnv);
      
      expect(response.status).toBe(201);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('id', 'new-team-id');
      expect(responseData.data).toHaveProperty('slug', 'new-team');
      expect(responseData.data).toHaveProperty('name', 'New Legal Team');
    });

    it('should return 400 for missing required fields', async () => {
      const invalidTeamData = {
        name: 'Team without slug'
        // Missing slug and config
      };

      const request = new Request('http://localhost/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidTeamData)
      });

      const response = await handleTeams(request, mockEnv);
      
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Missing required fields');
    });

    it('should return 409 for duplicate slug', async () => {
      const newTeamData = {
        slug: 'blawby-ai', // Existing slug
        name: 'Duplicate Team',
        config: { aiModel: 'llama' }
      };

      mockGetTeam.mockResolvedValue(mockTeam); // Team already exists

      const request = new Request('http://localhost/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTeamData)
      });

      const response = await handleTeams(request, mockEnv);
      
      expect(response.status).toBe(409);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Team with this slug already exists');
    });
  });

  describe('PUT /api/teams/{id}', () => {
    it('should update team successfully', async () => {
      const updateData = {
        name: 'Updated Team Name',
        config: {
          consultationFee: 100
        }
      };

      const updatedTeam = {
        ...mockTeam,
        ...updateData,
        updatedAt: '2024-01-02T00:00:00Z'
      };

      mockGetTeam.mockResolvedValue(mockTeam); // Team exists
      mockUpdateTeam.mockResolvedValue(updatedTeam);

      const request = new Request('http://localhost/api/teams/blawby-ai', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const response = await handleTeams(request, mockEnv);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('name', 'Updated Team Name');
      expect(responseData.data.config).toHaveProperty('consultationFee', 100);
    });

    it('should return 404 for non-existent team update', async () => {
      mockGetTeam.mockResolvedValue(null); // Team doesn't exist
      mockUpdateTeam.mockResolvedValue(null); // updateTeam should also return null

      const request = new Request('http://localhost/api/teams/non-existent', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Updated Name' })
      });

      const response = await handleTeams(request, mockEnv);
      
      expect(response.status).toBe(404);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Team not found');
    });
  });

  describe('DELETE /api/teams/{id}', () => {
    it('should delete team successfully', async () => {
      mockDeleteTeam.mockResolvedValue(true);

      const request = new Request('http://localhost/api/teams/blawby-ai', {
        method: 'DELETE'
      });

      const response = await handleTeams(request, mockEnv);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Team deleted successfully');
    });

    it('should return 404 for non-existent team deletion', async () => {
      mockDeleteTeam.mockResolvedValue(false);

      const request = new Request('http://localhost/api/teams/non-existent', {
        method: 'DELETE'
      });

      const response = await handleTeams(request, mockEnv);
      
      expect(response.status).toBe(404);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Team not found');
    });
  });

  describe('CORS and OPTIONS', () => {
    it('should handle OPTIONS request correctly', async () => {
      const request = new Request('http://localhost/api/teams', {
        method: 'OPTIONS'
      });

      const response = await handleTeams(request, mockEnv);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('PUT');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('DELETE');
    });

    it('should include CORS headers in all responses', async () => {
      mockListTeams.mockResolvedValue([mockTeam]);

      const request = new Request('http://localhost/api/teams', {
        method: 'GET'
      });

      const response = await handleTeams(request, mockEnv);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      const request = new Request('http://localhost/api/teams', {
        method: 'PATCH'
      });

      const response = await handleTeams(request, mockEnv);
      
      expect(response.status).toBe(405);
      const responseText = await response.text();
      expect(responseText).toBe('Method not allowed');
    });
  });

  describe('Environment Variable Resolution', () => {
    it('should resolve environment variables in team config', async () => {
      // Unmock TeamService for this test to test real environment variable resolution
      vi.unmock('../../../worker/services/TeamService');
      
      // Add environment variables to mockEnv
      const testEnv = {
        ...mockEnv,
        BLAWBY_API_TOKEN: 'test-api-token-123',
        BLAWBY_TEAM_ULID: 'test-team-ulid-456'
      };

      const teamWithEnvVars = {
        ...mockTeam,
        config: {
          ...mockTeam.config,
          blawbyApi: {
            enabled: true,
            apiKey: '${BLAWBY_API_TOKEN}',
            teamUlid: '${BLAWBY_TEAM_ULID}'
          }
        }
      };

      // Mock the database response with the team containing environment variables
      const mockDbResponse = {
        id: teamWithEnvVars.id,
        slug: teamWithEnvVars.slug,
        name: teamWithEnvVars.name,
        config: JSON.stringify(teamWithEnvVars.config),
        created_at: teamWithEnvVars.createdAt,
        updated_at: teamWithEnvVars.updatedAt
      };

      testEnv.DB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockDbResponse)
        })
      });

      const request = new Request('http://localhost/api/teams/blawby-ai', {
        method: 'GET'
      });

      const response = await handleTeams(request, testEnv);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.data.config.blawbyApi).toHaveProperty('apiKey', 'test-api-token-123');
      expect(responseData.data.config.blawbyApi).toHaveProperty('teamUlid', 'test-team-ulid-456');
      
      // Restore the mock after the test
      vi.doMock('../../../worker/services/TeamService', () => ({
        TeamService: vi.fn().mockImplementation(() => ({
          listTeams: mockListTeams,
          getTeam: mockGetTeam,
          createTeam: mockCreateTeam,
          updateTeam: mockUpdateTeam,
          deleteTeam: mockDeleteTeam
        }))
      }));
    });
  });
});
