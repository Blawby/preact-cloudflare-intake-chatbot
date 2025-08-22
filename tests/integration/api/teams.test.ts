import { describe, it, expect, beforeAll } from 'vitest';

// Configuration for real worker testing
const WORKER_URL = 'http://localhost:8787';

describe('Teams API Integration Tests - Real Worker', () => {
  beforeAll(async () => {
    console.log('🧪 Testing teams API against real worker at:', WORKER_URL);
    
    // Verify worker is running
    try {
      const healthResponse = await fetch(`${WORKER_URL}/api/health`);
      if (!healthResponse.ok) {
        throw new Error(`Worker health check failed: ${healthResponse.status}`);
      }
      console.log('✅ Worker is running and healthy');
    } catch (error) {
      throw new Error(`Worker is not running at ${WORKER_URL}. Please start with: npx wrangler dev`);
    }
  });

  describe('GET /api/teams', () => {
    it('should return all teams successfully', async () => {
      const response = await fetch(`${WORKER_URL}/api/teams`, {
        method: 'GET'
      });
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      
      expect(responseData.success).toBe(true);
      expect(Array.isArray(responseData.data)).toBe(true);
      expect(responseData.data.length).toBeGreaterThan(0);
      
      // Verify team structure
      const team = responseData.data[0];
      expect(team).toHaveProperty('id');
      expect(team).toHaveProperty('slug');
      expect(team).toHaveProperty('name');
      expect(team).toHaveProperty('config');
      
      console.log('📋 Found teams:', responseData.data.map(t => ({ id: t.id, slug: t.slug, name: t.name })));
    });

    it('should handle CORS preflight requests', async () => {
      const response = await fetch(`${WORKER_URL}/api/teams`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });
  });

  describe('GET /api/teams/{slugOrId}', () => {
    it('should return specific team by ID', async () => {
      // First get all teams to find a valid ID
      const teamsResponse = await fetch(`${WORKER_URL}/api/teams`);
      const teamsData = await teamsResponse.json();
      const validTeamId = teamsData.data[0].id;
      
      const response = await fetch(`${WORKER_URL}/api/teams/${validTeamId}`, {
        method: 'GET'
      });
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('id', validTeamId);
      expect(responseData.data).toHaveProperty('slug');
      expect(responseData.data).toHaveProperty('name');
      expect(responseData.data).toHaveProperty('config');
    });

    it('should return specific team by slug', async () => {
      // First get all teams to find a valid slug
      const teamsResponse = await fetch(`${WORKER_URL}/api/teams`);
      const teamsData = await teamsResponse.json();
      const validTeamSlug = teamsData.data[0].slug;
      
      const response = await fetch(`${WORKER_URL}/api/teams/${validTeamSlug}`, {
        method: 'GET'
      });
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('slug', validTeamSlug);
      expect(responseData.data).toHaveProperty('id');
      expect(responseData.data).toHaveProperty('name');
      expect(responseData.data).toHaveProperty('config');
    });

    it('should return 404 for non-existent team', async () => {
      const response = await fetch(`${WORKER_URL}/api/teams/non-existent-team`, {
        method: 'GET'
      });
      
      expect(response.status).toBe(404);
      const responseData = await response.json();
      
      expect(responseData.success).toBe(false);
      expect(responseData).toHaveProperty('error');
    });
  });

  describe('POST /api/teams', () => {
    it('should create new team successfully', async () => {
      const newTeam = {
        slug: `test-team-${Date.now()}`,
        name: 'Test Legal Team',
        config: {
          aiModel: 'llama',
          consultationFee: 150,
          requiresPayment: true,
          ownerEmail: 'test@example.com',
          availableServices: ['Family Law', 'Business Law'],
          jurisdiction: {
            type: 'state',
            description: 'North Carolina only',
            supportedStates: ['NC'],
            supportedCountries: ['US']
          }
        }
      };

      const response = await fetch(`${WORKER_URL}/api/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeam)
      });
      
      expect(response.status).toBe(201);
      const responseData = await response.json();
      
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('id');
      expect(responseData.data).toHaveProperty('slug', newTeam.slug);
      expect(responseData.data).toHaveProperty('name', newTeam.name);
      expect(responseData.data).toHaveProperty('config');
      
      console.log('✅ Created team:', responseData.data);
    }, 30000);

    it('should return 400 for missing required fields', async () => {
      const invalidTeam = {
        name: 'Team without slug'
        // Missing slug
      };

      const response = await fetch(`${WORKER_URL}/api/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidTeam)
      });
      
      expect(response.status).toBe(400);
      const responseData = await response.json();
      
      expect(responseData.success).toBe(false);
      expect(responseData).toHaveProperty('error');
    });
  });

  describe('PUT /api/teams/{slugOrId}', () => {
    it('should update team successfully', async () => {
      // First create a team to update
      const newTeam = {
        slug: `update-test-${Date.now()}`,
        name: 'Team to Update',
        config: { aiModel: 'llama' }
      };

      const createResponse = await fetch(`${WORKER_URL}/api/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeam)
      });
      
      const createdTeam = await createResponse.json();
      const teamId = createdTeam.data.id;

      // Now update the team
      const updateData = {
        name: 'Updated Team Name',
        config: {
          ...newTeam.config,
          consultationFee: 200
        }
      };

      const response = await fetch(`${WORKER_URL}/api/teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('name', 'Updated Team Name');
      expect(responseData.data).toHaveProperty('config');
    }, 30000);

    it('should return 404 for non-existent team update', async () => {
      const updateData = {
        name: 'Updated Name'
      };

      const response = await fetch(`${WORKER_URL}/api/teams/non-existent-id`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      expect(response.status).toBe(404);
      const responseData = await response.json();
      
      expect(responseData.success).toBe(false);
      expect(responseData).toHaveProperty('error');
    });
  });

  describe('DELETE /api/teams/{slugOrId}', () => {
    it.skip('should delete team successfully', async () => {
      // First create a team to delete
      const createRequest = {
        name: 'Test Team for Deletion',
        slug: 'test-team-delete-' + Date.now(),
        config: {
          requiresPayment: false,
          consultationFee: 0
        }
      };

      const createResponse = await fetch(`${WORKER_URL}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createRequest)
      });
      
      expect(createResponse.status).toBe(201);
      const createResult = await createResponse.json();
      expect(createResult.success).toBe(true);
      
      const teamId = createResult.data.id;
      console.log('🔍 Created team ID:', teamId);
      console.log('🔍 Created team data:', JSON.stringify(createResult.data, null, 2));
      
      // Add a small delay to ensure the team is fully created
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify the team exists before trying to delete it
      const verifyResponse = await fetch(`${WORKER_URL}/api/teams/${teamId}`, {
        method: 'GET'
      });
      
      if (verifyResponse.status !== 200) {
        const verifyData = await verifyResponse.json();
        throw new Error(`Team not found after creation! Verify Status: ${verifyResponse.status}, Data: ${JSON.stringify(verifyData, null, 2)}`);
      }
      
      // Now delete the team
      const response = await fetch(`${WORKER_URL}/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const responseData = await response.json();
      
      if (response.status !== 200) {
        throw new Error(`Delete failed! Status: ${response.status}, TeamID: ${teamId}, Response: ${JSON.stringify(responseData, null, 2)}`);
      }
      
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('deleted');
    });

    it('should return 404 for non-existent team deletion', async () => {
      const response = await fetch(`${WORKER_URL}/api/teams/non-existent-id`, {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(404);
      const responseData = await response.json();
      
      expect(responseData.success).toBe(false);
      expect(responseData).toHaveProperty('error');
    });
  });

  describe('Method Not Allowed', () => {
    it('should reject unsupported methods', async () => {
      const response = await fetch(`${WORKER_URL}/api/teams`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Test' })
      });
      
      expect(response.status).toBe(405);
      const responseText = await response.text();
      
      expect(responseText).toContain('Method not allowed');
    });
  });
});

