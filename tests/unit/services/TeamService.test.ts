import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TeamService, Team, TeamConfig } from '../../../worker/services/TeamService';

describe('TeamService', () => {
  let teamService: TeamService;
  let mockEnv: any;

  const mockTeam: Team = {
    id: '01K0TNGNKTM4Q0AG0XF0A8ST0Q',
    slug: 'blawby-ai',
    name: 'Blawby AI',
    config: {
      aiModel: 'llama',
      consultationFee: 0,
      requiresPayment: false,
      ownerEmail: 'paulchrisluke@gmail.com',
      availableServices: [
        "Business Law",
        "Contract Review"
      ],
      jurisdiction: {
        type: 'national',
        description: 'Available nationwide',
        supportedStates: [
          "all"
        ],
        supportedCountries: [
          "US"
        ]
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
    mockEnv = {
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

    teamService = new TeamService(mockEnv);
  });

  describe('getTeam', () => {
    it('should return team by ID', async () => {
      const mockDbResponse = {
        id: mockTeam.id,
        slug: mockTeam.slug,
        name: mockTeam.name,
        config: JSON.stringify(mockTeam.config),
        created_at: mockTeam.createdAt,
        updated_at: mockTeam.updatedAt
      };

      mockEnv.DB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockDbResponse)
        })
      });

      const result = await teamService.getTeam(mockTeam.id);
      
      expect(result).toEqual(mockTeam);
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        'SELECT id, slug, name, config, created_at, updated_at FROM teams WHERE id = ?'
      );
    });

    it('should return team by slug when ID not found', async () => {
      const mockDbResponse = {
        id: mockTeam.id,
        slug: mockTeam.slug,
        name: mockTeam.name,
        config: JSON.stringify(mockTeam.config),
        created_at: mockTeam.createdAt,
        updated_at: mockTeam.updatedAt
      };

      // First call returns null (ID not found)
      mockEnv.DB.prepare.mockReturnValueOnce({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null)
        })
      });

      // Second call returns team (slug found)
      mockEnv.DB.prepare.mockReturnValueOnce({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockDbResponse)
        })
      });

      const result = await teamService.getTeam(mockTeam.slug);
      
      expect(result).toEqual(mockTeam);
      expect(mockEnv.DB.prepare).toHaveBeenCalledTimes(2);
    });

    it('should return null when team not found', async () => {
      mockEnv.DB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null)
        })
      });

      const result = await teamService.getTeam('non-existent');
      
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockEnv.DB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('Database error'))
        })
      });

      const result = await teamService.getTeam(mockTeam.id);
      
      expect(result).toBeNull();
    });

    it('should use cache for repeated requests', async () => {
      const mockDbResponse = {
        id: mockTeam.id,
        slug: mockTeam.slug,
        name: mockTeam.name,
        config: JSON.stringify(mockTeam.config),
        created_at: mockTeam.createdAt,
        updated_at: mockTeam.updatedAt
      };

      mockEnv.DB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockDbResponse)
        })
      });

      // First call
      const result1 = await teamService.getTeam(mockTeam.id);
      expect(result1).toEqual(mockTeam);

      // Second call should use cache
      const result2 = await teamService.getTeam(mockTeam.id);
      expect(result2).toEqual(mockTeam);

      // Should only call database once
      expect(mockEnv.DB.prepare).toHaveBeenCalledTimes(1);
    });
  });

  describe('listTeams', () => {
    it('should return all teams', async () => {
      const mockDbResponse = {
        results: [
          {
            id: mockTeam.id,
            slug: mockTeam.slug,
            name: mockTeam.name,
            config: JSON.stringify(mockTeam.config),
            created_at: mockTeam.createdAt,
            updated_at: mockTeam.updatedAt
          },
          {
            id: 'team2',
            slug: 'team2',
            name: 'Team 2',
            config: JSON.stringify({ aiModel: 'llama' }),
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      };

      mockEnv.DB.prepare.mockReturnValue({
        all: vi.fn().mockResolvedValue(mockDbResponse)
      });

      const result = await teamService.listTeams();
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockTeam);
      expect(result[1]).toHaveProperty('id', 'team2');
    });

    it('should return empty array when no teams exist', async () => {
      mockEnv.DB.prepare.mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [] })
      });

      const result = await teamService.listTeams();
      
      expect(result).toEqual([]);
    });
  });

  describe('createTeam', () => {
    it('should create new team successfully', async () => {
      const newTeamData = {
        slug: 'new-team',
        name: 'New Team',
        config: {
          aiModel: 'llama',
          consultationFee: 50
        }
      };

      mockEnv.DB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({})
        })
      });

      const result = await teamService.createTeam(newTeamData);
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('slug', 'new-team');
      expect(result).toHaveProperty('name', 'New Team');
      expect(result).toHaveProperty('config');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });
  });

  describe('updateTeam', () => {
    it('should update existing team', async () => {
      const updateData = {
        name: 'Updated Team Name',
        config: {
          consultationFee: 100
        }
      };

      // Mock getTeam to return existing team
      vi.spyOn(teamService, 'getTeam').mockResolvedValue(mockTeam);

      mockEnv.DB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({})
        })
      });

      const result = await teamService.updateTeam(mockTeam.id, updateData);
      
      expect(result).toHaveProperty('name', 'Updated Team Name');
      expect(result).toHaveProperty('config.consultationFee', 100);
      expect(result).toHaveProperty('updatedAt');
    });

    it('should return null when team not found', async () => {
      vi.spyOn(teamService, 'getTeam').mockResolvedValue(null);

      const result = await teamService.updateTeam('non-existent', { name: 'Updated' });
      
      expect(result).toBeNull();
    });
  });

  describe('deleteTeam', () => {
    it('should delete team successfully', async () => {
      mockEnv.DB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ changes: 1 })
        })
      });

      const result = await teamService.deleteTeam(mockTeam.id);
      
      expect(result).toBe(true);
    });

    it('should return false when team not found', async () => {
      mockEnv.DB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ changes: 0 })
        })
      });

      const result = await teamService.deleteTeam('non-existent');
      
      expect(result).toBe(false);
    });
  });

  describe('Environment Variable Resolution', () => {
    it('should resolve environment variables in config', async () => {
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

      const mockDbResponse = {
        id: teamWithEnvVars.id,
        slug: teamWithEnvVars.slug,
        name: teamWithEnvVars.name,
        config: JSON.stringify(teamWithEnvVars.config),
        created_at: teamWithEnvVars.createdAt,
        updated_at: teamWithEnvVars.updatedAt
      };

      mockEnv.DB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockDbResponse)
        })
      });

      const result = await teamService.getTeam(mockTeam.id);
      
      expect(result?.config.blawbyApi?.apiKey).toBe('test-token');
      expect(result?.config.blawbyApi?.teamUlid).toBe('01jq70jnstyfzevc6423czh50e');
    });

    it('should handle missing environment variables', async () => {
      const teamWithMissingEnvVars = {
        ...mockTeam,
        config: {
          ...mockTeam.config,
          blawbyApi: {
            enabled: true,
            apiKey: '${MISSING_VAR}',
            teamUlid: '${ANOTHER_MISSING_VAR}'
          }
        }
      };

      const mockDbResponse = {
        id: teamWithMissingEnvVars.id,
        slug: teamWithMissingEnvVars.slug,
        name: teamWithMissingEnvVars.name,
        config: JSON.stringify(teamWithMissingEnvVars.config),
        created_at: teamWithMissingEnvVars.createdAt,
        updated_at: teamWithMissingEnvVars.updatedAt
      };

      mockEnv.DB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockDbResponse)
        })
      });

      const result = await teamService.getTeam(mockTeam.id);
      
      expect(result?.config.blawbyApi?.apiKey).toBe('${MISSING_VAR}');
      expect(result?.config.blawbyApi?.teamUlid).toBe('${ANOTHER_MISSING_VAR}');
    });
  });

  describe('Cache Management', () => {
    it('should clear cache for specific team', async () => {
      const mockDbResponse = {
        id: mockTeam.id,
        slug: mockTeam.slug,
        name: mockTeam.name,
        config: JSON.stringify(mockTeam.config),
        created_at: mockTeam.createdAt,
        updated_at: mockTeam.updatedAt
      };

      mockEnv.DB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockDbResponse)
        })
      });

      // First call - populate cache
      await teamService.getTeam(mockTeam.id);

      // Clear cache
      teamService.clearCache(mockTeam.id);

      // Second call - should hit database again
      await teamService.getTeam(mockTeam.id);

      // Should call database twice
      expect(mockEnv.DB.prepare).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache', async () => {
      const mockDbResponse = {
        id: mockTeam.id,
        slug: mockTeam.slug,
        name: mockTeam.name,
        config: JSON.stringify(mockTeam.config),
        created_at: mockTeam.createdAt,
        updated_at: mockTeam.updatedAt
      };

      mockEnv.DB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockDbResponse)
        })
      });

      // First call - populate cache
      await teamService.getTeam(mockTeam.id);

      // Clear all cache
      teamService.clearCache();

      // Second call - should hit database again
      await teamService.getTeam(mockTeam.id);

      // Should call database twice
      expect(mockEnv.DB.prepare).toHaveBeenCalledTimes(2);
    });
  });

  describe('API Token Management', () => {
    it('should validate team access with API token (mocked)', async () => {
      // NOTE: This is a unit test with mocked data
      // For real database testing, see tests/integration/services/TeamService.integration.test.ts
      
      const teamId = 'test-team-id';
      const validApiToken = 'valid-token';
      
      // Mock team with blawbyApi configuration
      const teamWithApiKey = {
        id: teamId,
        slug: 'test-team',
        name: 'Test Team',
        config: JSON.stringify({
          blawbyApi: {
            enabled: true,
            apiKey: validApiToken,
            teamUlid: 'test-ulid',
            apiUrl: 'https://test.com'
          }
        }),
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockEnv.DB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(teamWithApiKey)
        })
      });

      // Mock crypto.subtle for test environment
      const originalSubtle = crypto.subtle;
      crypto.subtle = {
        digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
      } as any;

      try {
        const result = await teamService.validateTeamAccess(teamId, validApiToken);
        expect(result).toBe(true);
      } finally {
        crypto.subtle = originalSubtle;
      }
    });

    it('should reject invalid API token (mocked)', async () => {
      const teamId = 'test-team-id';
      const validApiToken = 'valid-token';
      const invalidApiToken = 'invalid-token';
      
      // Mock team with valid API key
      const teamWithApiKey = {
        id: teamId,
        slug: 'test-team',
        name: 'Test Team',
        config: JSON.stringify({
          blawbyApi: {
            enabled: true,
            apiKey: validApiToken, // Different from the token being tested
            teamUlid: 'test-ulid',
            apiUrl: 'https://test.com'
          }
        }),
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockEnv.DB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(teamWithApiKey)
        })
      });
      
      // Test with invalid token should return false
      const result = await teamService.validateTeamAccess(teamId, invalidApiToken);
      expect(result).toBe(false);
    });
  });
});
