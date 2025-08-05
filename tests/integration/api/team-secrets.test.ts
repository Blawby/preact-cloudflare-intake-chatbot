import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleTeamSecrets } from '../../../worker/routes/team-secrets';

describe('Team Secrets API Integration Tests', () => {
  let mockEnv;
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      TEAM_SECRETS: {
        put: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(JSON.stringify({
          teamId: '01jq70jnstyfzevc6423czh50e',
          apiKey: 'test-api-key',
          teamUlid: '01jq70jnstyfzevc6423czh50f',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })),
        delete: vi.fn().mockResolvedValue(undefined),
        list: vi.fn().mockResolvedValue({
          keys: [
            { name: '01jq70jnstyfzevc6423czh50e' }
          ]
        })
      }
    };
  });

  describe('POST /api/team-secrets/:teamId - Store Team Secret', () => {
    it('should store a team secret successfully', async () => {
      const requestBody = {
        apiKey: 'test-production-key',
        teamUlid: '01jq70jnstyfzevc6423czh50f'
      };

      const request = new Request('http://localhost/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await handleTeamSecrets(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.success).toBe(true);
      expect(responseData.data.message).toContain('Team secret stored successfully');
    });

    it('should handle missing apiKey', async () => {
      const requestBody = {
        teamUlid: '01jq70jnstyfzevc6423czh50f'
      };

      const request = new Request('http://localhost/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await handleTeamSecrets(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('API key and team ULID are required');
    });

    it('should handle missing teamUlid', async () => {
      const requestBody = {
        apiKey: 'test-production-key'
      };

      const request = new Request('http://localhost/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await handleTeamSecrets(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('API key and team ULID are required');
    });
  });

  describe('GET /api/team-secrets/:teamId - Get Team Secret', () => {
    it('should retrieve a team secret successfully', async () => {
      const request = new Request('http://localhost/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
        method: 'GET'
      });

      const response = await handleTeamSecrets(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.success).toBe(true);
      expect(responseData.data.teamId).toBe('01jq70jnstyfzevc6423czh50e');
      expect(responseData.data.hasSecret).toBe(true);
    });

    it('should handle non-existent team secret', async () => {
      // Mock KV to return null for non-existent team
      mockEnv.TEAM_SECRETS.get = vi.fn().mockResolvedValue(null);

      const request = new Request('http://localhost/api/team-secrets/01jq70jnstyfzevc6423czh50g', {
        method: 'GET'
      });

      const response = await handleTeamSecrets(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.hasSecret).toBe(false);
    });
  });

  describe('PUT /api/team-secrets/:teamId - Update Team Secret', () => {
    it('should update a team secret successfully', async () => {
      const requestBody = {
        apiKey: 'updated-production-key',
        teamUlid: '01jq70jnstyfzevc6423czh50f'
      };

      const request = new Request('http://localhost/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await handleTeamSecrets(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.success).toBe(true);
      expect(responseData.data.message).toContain('Team secret updated successfully');
    });
  });

  describe('DELETE /api/team-secrets/:teamId - Delete Team Secret', () => {
    it('should delete a team secret successfully', async () => {
      const request = new Request('http://localhost/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
        method: 'DELETE'
      });

      const response = await handleTeamSecrets(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.success).toBe(true);
      expect(responseData.data.message).toContain('Team secret deleted successfully');
    });
  });

  describe('GET /api/team-secrets - List All Team Secrets', () => {
    it('should list all team secrets successfully', async () => {
      const request = new Request('http://localhost/api/team-secrets', {
        method: 'GET'
      });

      const response = await handleTeamSecrets(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.success).toBe(true);
      expect(Array.isArray(responseData.data.teams)).toBe(true);
      expect(responseData.data.teams.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle KV storage errors gracefully', async () => {
      // Mock KV to throw an error
      const mockPut = vi.fn().mockRejectedValue(new Error('KV storage error'));
      mockEnv.TEAM_SECRETS.put = mockPut;

      const requestBody = {
        apiKey: 'test-production-key',
        teamUlid: '01jq70jnstyfzevc6423czh50f'
      };

      const request = new Request('http://localhost/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await handleTeamSecrets(request, mockEnv, corsHeaders);
      
      // Verify that the KV put method was actually called
      expect(mockPut).toHaveBeenCalled();
      
      // Verify error response status and content
      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('KV storage error');
      expect(responseData.errorCode).toBe('GENERIC_ERROR');
    });

    it('should handle invalid JSON in request body', async () => {
      const request = new Request('http://localhost/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      const response = await handleTeamSecrets(request, mockEnv, corsHeaders);
      
      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Invalid JSON');
      expect(responseData.errorCode).toBe('GENERIC_ERROR');
    });

    it('should handle different types of KV storage errors', async () => {
      // Test with a different type of KV error
      const mockPut = vi.fn().mockRejectedValue(new Error('Database connection failed'));
      mockEnv.TEAM_SECRETS.put = mockPut;

      const requestBody = {
        apiKey: 'test-production-key',
        teamUlid: '01jq70jnstyfzevc6423czh50f'
      };

      const request = new Request('http://localhost/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await handleTeamSecrets(request, mockEnv, corsHeaders);
      
      // Verify that the KV put method was actually called
      expect(mockPut).toHaveBeenCalled();
      
      // Verify error response status and content
      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Database connection failed');
      expect(responseData.errorCode).toBe('GENERIC_ERROR');
    });
  });

  describe('Security Tests', () => {
    it('should not expose API keys in responses', async () => {
      const request = new Request('http://localhost/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
        method: 'GET'
      });

      const response = await handleTeamSecrets(request, mockEnv, corsHeaders);
      const responseData = await response.json();
      
      // Verify that the response doesn't contain the actual API key
      expect(JSON.stringify(responseData)).not.toContain('test-api-key');
      expect(responseData.data).not.toContain('test-api-key');
    });

    describe('Team ID Format Validation', () => {
      it('should reject invalid team ID format with 400 status', async () => {
        const requestBody = {
          apiKey: 'test-production-key',
          teamUlid: 'invalid-team-id'
        };

        const request = new Request('http://localhost/api/team-secrets/invalid-team-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const response = await handleTeamSecrets(request, mockEnv, corsHeaders);
        
        expect(response.status).toBe(400);
        const responseData = await response.json();
        expect(responseData.success).toBe(false);
        expect(responseData.error).toContain('Invalid team ID format');
      });

      it('should reject team ID that is too short with 400 status', async () => {
        const requestBody = {
          apiKey: 'test-production-key',
          teamUlid: '01jq70jnstyfzevc6423czh50f'
        };

        const request = new Request('http://localhost/api/team-secrets/short', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const response = await handleTeamSecrets(request, mockEnv, corsHeaders);
        
        expect(response.status).toBe(400);
        const responseData = await response.json();
        expect(responseData.success).toBe(false);
        expect(responseData.error).toContain('Invalid team ID format');
      });

      it('should reject team ID that is too long with 400 status', async () => {
        const requestBody = {
          apiKey: 'test-production-key',
          teamUlid: '01jq70jnstyfzevc6423czh50f'
        };

        const request = new Request('http://localhost/api/team-secrets/01jq70jnstyfzevc6423czh50e123456789', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const response = await handleTeamSecrets(request, mockEnv, corsHeaders);
        
        expect(response.status).toBe(400);
        const responseData = await response.json();
        expect(responseData.success).toBe(false);
        expect(responseData.error).toContain('Invalid team ID format');
      });

      it('should reject team ID with invalid characters with 400 status', async () => {
        const requestBody = {
          apiKey: 'test-production-key',
          teamUlid: '01jq70jnstyfzevc6423czh50f'
        };

        const request = new Request('http://localhost/api/team-secrets/01jq70jnstyfzevc6423czh50!', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const response = await handleTeamSecrets(request, mockEnv, corsHeaders);
        
        expect(response.status).toBe(400);
        const responseData = await response.json();
        expect(responseData.success).toBe(false);
        expect(responseData.error).toContain('Invalid team ID format');
      });



      it('should accept valid ULID format team ID with 200 status', async () => {
        const requestBody = {
          apiKey: 'test-production-key',
          teamUlid: '01jq70jnstyfzevc6423czh50f'
        };

        const request = new Request('http://localhost/api/team-secrets/01jq70jnstyfzevc6423czh50e', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const response = await handleTeamSecrets(request, mockEnv, corsHeaders);
        
        expect(response.status).toBe(200);
        const responseData = await response.json();
        expect(responseData.success).toBe(true);
        expect(responseData.data.success).toBe(true);
      });
    });
  });
}); 