import { describe, it, expect, beforeAll } from 'vitest';
import { WORKER_URL } from '../../setup-real-api';

describe('TeamService Integration - Real API', () => {
  beforeAll(async () => {
    console.log('🧪 Testing TeamService against real worker at:', WORKER_URL);
    
    // Verify worker is running
    try {
      const healthResponse = await fetch(`${WORKER_URL}/api/health`);
      if (!healthResponse.ok) {
        throw new Error(`Worker health check failed: ${healthResponse.status}`);
      }
      console.log('✅ Worker is running and healthy');
    } catch (error) {
      throw new Error(`Worker is not running at ${WORKER_URL}. Please ensure wrangler dev is started.`);
    }
  });

  describe('GET /api/teams', () => {
    it('should return all teams', async () => {
      const response = await fetch(`${WORKER_URL}/api/teams`);
      
      expect(response.status).toBe(200);
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      
      // Verify team structure
      const team = result.data[0];
      expect(team).toHaveProperty('id');
      expect(team).toHaveProperty('slug');
      expect(team).toHaveProperty('name');
      expect(team).toHaveProperty('config');
    });
  });

  describe('GET /api/teams/{id}', () => {
    it('should return team by ID', async () => {
      // First get all teams to find a valid ID
      const teamsResponse = await fetch(`${WORKER_URL}/api/teams`);
      const teamsData = await teamsResponse.json();
      const validTeamId = teamsData.data[0].id;
      
      const response = await fetch(`${WORKER_URL}/api/teams/${validTeamId}`);
      
      expect(response.status).toBe(200);
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', validTeamId);
      expect(result.data).toHaveProperty('slug');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('config');
    });

    it('should return team by slug', async () => {
      // First get all teams to find a valid slug
      const teamsResponse = await fetch(`${WORKER_URL}/api/teams`);
      const teamsData = await teamsResponse.json();
      const validTeamSlug = teamsData.data[0].slug;
      
      const response = await fetch(`${WORKER_URL}/api/teams/${validTeamSlug}`);
      
      expect(response.status).toBe(200);
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('slug', validTeamSlug);
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('config');
    });

    it('should return 404 for non-existent team', async () => {
      const response = await fetch(`${WORKER_URL}/api/teams/non-existent-team`);
      
      expect(response.status).toBe(404);
      const result = await response.json();
      expect(result.success).toBe(false);
    });
  });

  describe('POST /api/teams', () => {
    it('should create a new team', async () => {
      const newTeam = {
        slug: `test-team-${Date.now()}`,
        name: 'Test Team',
        config: {
                aiModel: 'llama',
                consultationFee: 0,
                requiresPayment: false,
          ownerEmail: 'test@example.com',
          availableServices: ['Test Service'],
                jurisdiction: {
                  type: 'national',
            description: 'Test jurisdiction',
                  supportedStates: ['all'],
                  supportedCountries: ['US']
                },
          domain: 'test.example.com',
          description: 'Test team description',
          brandColor: '#000000',
          accentColor: '#ffffff',
          introMessage: 'Hello from test team!'
        }
      };

      const response = await fetch(`${WORKER_URL}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTeam)
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('slug', newTeam.slug);
      expect(result.data).toHaveProperty('name', newTeam.name);
      expect(result.data).toHaveProperty('config');
    });

    it('should validate required fields when creating team', async () => {
      const invalidTeam = {
        // Missing required fields
        name: 'Invalid Team'
      };

      const response = await fetch(`${WORKER_URL}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidTeam)
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.success).toBe(false);
    });
  });

  describe('PUT /api/teams/{id}', () => {
    it('should update an existing team', async () => {
      // First create a team
      const newTeam = {
        slug: `update-test-${Date.now()}`,
        name: 'Update Test Team',
        config: {
          aiModel: 'llama',
          consultationFee: 0,
          requiresPayment: false,
          ownerEmail: 'update@example.com',
          availableServices: ['Update Service'],
          jurisdiction: {
            type: 'national',
            description: 'Update jurisdiction',
            supportedStates: ['all'],
            supportedCountries: ['US']
          },
          domain: 'update.example.com',
          description: 'Update team description',
          brandColor: '#000000',
          accentColor: '#ffffff',
          introMessage: 'Hello from update team!'
        }
      };

      const createResponse = await fetch(`${WORKER_URL}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTeam)
      });

      const createdTeam = await createResponse.json();
      const teamId = createdTeam.data.id;

      // Update the team
      const updatedTeam = {
        ...newTeam,
        name: 'Updated Team Name',
        config: {
          ...newTeam.config,
          description: 'Updated description'
        }
      };

      const updateResponse = await fetch(`${WORKER_URL}/api/teams/${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedTeam)
      });

      expect(updateResponse.status).toBe(200);
      const result = await updateResponse.json();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('name', 'Updated Team Name');
      expect(result.data).toHaveProperty('config');
    });

    it('should return 404 when updating non-existent team', async () => {
      const updateData = {
        name: 'Non-existent Team',
        config: {}
      };

      const response = await fetch(`${WORKER_URL}/api/teams/non-existent-id`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      expect(response.status).toBe(404);
      const result = await response.json();
      expect(result.success).toBe(false);
    });
  });

  describe('DELETE /api/teams/{id}', () => {
    it('should delete an existing team', async () => {
      // First create a team to delete
      const newTeam = {
        slug: `delete-test-${Date.now()}`,
        name: 'Delete Test Team',
        config: {
          aiModel: 'llama',
          consultationFee: 0,
          requiresPayment: false,
          ownerEmail: 'delete@example.com',
          availableServices: ['Delete Service'],
          jurisdiction: {
            type: 'national',
            description: 'Delete jurisdiction',
            supportedStates: ['all'],
            supportedCountries: ['US']
          },
          domain: 'delete.example.com',
          description: 'Delete team description',
          brandColor: '#000000',
          accentColor: '#ffffff',
          introMessage: 'Hello from delete team!'
        }
      };

      const createResponse = await fetch(`${WORKER_URL}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTeam)
      });

      const createdTeam = await createResponse.json();
      const teamId = createdTeam.data.id;

      // Delete the team
      const deleteResponse = await fetch(`${WORKER_URL}/api/teams/${teamId}`, {
        method: 'DELETE'
      });

      expect(deleteResponse.status).toBe(200);
      const result = await deleteResponse.json();
      expect(result.success).toBe(true);

      // Verify team is deleted
      const getResponse = await fetch(`${WORKER_URL}/api/teams/${teamId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 when deleting non-existent team', async () => {
      const response = await fetch(`${WORKER_URL}/api/teams/non-existent-id`, {
        method: 'DELETE'
      });

      expect(response.status).toBe(404);
      const result = await response.json();
      expect(result.success).toBe(false);
    });
  });

  describe('Team configuration validation', () => {
    it('should validate team configuration structure', async () => {
      const teamsResponse = await fetch(`${WORKER_URL}/api/teams`);
      const teamsData = await teamsResponse.json();
      const team = teamsData.data[0];

      // Verify config has required fields
      expect(team.config).toHaveProperty('aiModel');
      expect(team.config).toHaveProperty('consultationFee');
      expect(team.config).toHaveProperty('requiresPayment');
      expect(team.config).toHaveProperty('ownerEmail');
      expect(team.config).toHaveProperty('availableServices');
      expect(team.config).toHaveProperty('jurisdiction');
    });

    it('should handle teams with different configurations', async () => {
      const teamsResponse = await fetch(`${WORKER_URL}/api/teams`);
      const teamsData = await teamsResponse.json();

      // Test that different teams can have different configurations
      const teams = teamsData.data;
      expect(teams.length).toBeGreaterThan(0);

      // Each team should have a unique ID and slug
      const ids = teams.map(t => t.id);
      const slugs = teams.map(t => t.slug);
      
      expect(new Set(ids).size).toBe(ids.length);
      expect(new Set(slugs).size).toBe(slugs.length);
    });
  });
});
