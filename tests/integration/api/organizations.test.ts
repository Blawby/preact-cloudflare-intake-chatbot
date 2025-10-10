import { describe, it, expect, beforeAll } from 'vitest';
import { WORKER_URL } from '../../setup-real-api';

// Helper function to create a test organization
async function createTestOrganization() {
  const newOrganization = {
    slug: `test-organization-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Legal Organization',
    config: {
      consultationFee: 150,
      requiresPayment: true,
      ownerEmail: 'test@realcompany.com',
      availableServices: ['Family Law', 'Business Law'],
      jurisdiction: {
        type: 'state',
        description: 'North Carolina only',
        supportedStates: ['NC'],
        supportedCountries: ['US']
      }
    }
  };

  const response = await fetch(`${WORKER_URL}/api/organizations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newOrganization)
  });

  if (!response.ok) {
    throw new Error(`Failed to create test organization: ${response.status} ${response.statusText}`);
  }

  const responseData = await response.json();
  return responseData.data;
}

// Helper function to validate organizations data and create test organization if needed
async function getValidOrganizationData() {
  const organizationsResponse = await fetch(`${WORKER_URL}/api/organizations`);
  const organizationsData = await organizationsResponse.json();
  
  // Validate response structure
  if (!organizationsData || typeof organizationsData !== 'object') {
    throw new Error('Invalid organizations response: response is not an object');
  }
  
  if (!organizationsData.success) {
    throw new Error(`Organizations API request failed: ${organizationsData.error || 'Unknown error'}`);
  }
  
  if (!Array.isArray(organizationsData.data)) {
    throw new Error('Invalid organizations response: data is not an array');
  }
  
  if (organizationsData.data.length === 0) {
    console.log('⚠️  No organizations found, creating a test organization...');
    const testOrganization = await createTestOrganization();
    return { data: [testOrganization] };
  }
  
  return organizationsData;
}

describe('Organizations API Integration Tests - Real Worker', () => {
  beforeAll(async () => {
    console.log('🧪 Testing organizations API against real worker at:', WORKER_URL);
    
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

  describe('GET /api/organizations', () => {
    it('should return all organizations successfully', async () => {
      const response = await fetch(`${WORKER_URL}/api/organizations`, {
        method: 'GET'
      });
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      
      expect(responseData.success).toBe(true);
      expect(Array.isArray(responseData.data)).toBe(true);
      expect(responseData.data.length).toBeGreaterThan(0);
      
      // Verify organization structure
      const organization = responseData.data[0];
      expect(organization).toHaveProperty('id');
      expect(organization).toHaveProperty('slug');
      expect(organization).toHaveProperty('name');
      expect(organization).toHaveProperty('config');
      
      console.log('📋 Found organizations:', responseData.data.map(t => ({ id: t.id, slug: t.slug, name: t.name })));
    });

    it('should handle CORS preflight requests', async () => {
      const response = await fetch(`${WORKER_URL}/api/organizations`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      expect(response.status).toBe(204); // OPTIONS requests should return 204 No Content
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });
  });

  describe('GET /api/organizations/{slugOrId}', () => {
    it('should return specific organization by ID', async () => {
      // First get all organizations to find a valid ID
      const organizationsData = await getValidOrganizationData();
      const validOrganizationId = organizationsData.data[0].id;
      
      const response = await fetch(`${WORKER_URL}/api/organizations/${validOrganizationId}`, {
        method: 'GET'
      });
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('id', validOrganizationId);
      expect(responseData.data).toHaveProperty('slug');
      expect(responseData.data).toHaveProperty('name');
      expect(responseData.data).toHaveProperty('config');
    });

    it('should return specific organization by slug', async () => {
      // First get all organizations to find a valid slug
      const organizationsData = await getValidOrganizationData();
      const validOrganizationSlug = organizationsData.data[0].slug;
      
      const response = await fetch(`${WORKER_URL}/api/organizations/${validOrganizationSlug}`, {
        method: 'GET'
      });
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('slug', validOrganizationSlug);
      expect(responseData.data).toHaveProperty('id');
      expect(responseData.data).toHaveProperty('name');
      expect(responseData.data).toHaveProperty('config');
    });

    it('should return 404 for non-existent organization', async () => {
      const response = await fetch(`${WORKER_URL}/api/organizations/non-existent-organization`, {
        method: 'GET'
      });
      
      expect(response.status).toBe(404);
      const responseData = await response.json();
      
      expect(responseData.success).toBe(false);
      expect(responseData).toHaveProperty('error');
    });
  });

  describe('POST /api/organizations', () => {
    it('should create new organization successfully', async () => {
      const newOrganization = {
        slug: `test-organization-${Date.now()}`,
        name: 'Test Legal Organization',
        config: {
          aiModel: '@cf/openai/gpt-oss-20b',
          consultationFee: 150,
          requiresPayment: true,
          ownerEmail: 'test@realcompany.com',
          availableServices: ['Family Law', 'Business Law'],
          jurisdiction: {
            type: 'state',
            description: 'North Carolina only',
            supportedStates: ['NC'],
            supportedCountries: ['US']
          }
        }
      };

      const response = await fetch(`${WORKER_URL}/api/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrganization)
      });
      
      expect(response.status).toBe(201);
      const responseData = await response.json();
      
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('id');
      expect(responseData.data).toHaveProperty('slug', newOrganization.slug);
      expect(responseData.data).toHaveProperty('name', newOrganization.name);
      expect(responseData.data).toHaveProperty('config');
      
      console.log('✅ Created organization:', responseData.data);
    }, 30000);

    it('should return 400 for missing required fields', async () => {
      const invalidOrganization = {
        name: 'Organization without slug'
        // Missing slug
      };

      const response = await fetch(`${WORKER_URL}/api/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidOrganization)
      });
      
      expect(response.status).toBe(400);
      const responseData = await response.json();
      
      expect(responseData.success).toBe(false);
      expect(responseData).toHaveProperty('error');
    });
  });

  describe('PUT /api/organizations/{slugOrId}', () => {
    it('should update organization successfully', async () => {
      // First create a organization to update
      const newOrganization = {
        slug: `update-test-${Date.now()}`,
        name: 'Organization to Update',
        config: {}
      };

      const createResponse = await fetch(`${WORKER_URL}/api/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrganization)
      });
      
      const createdOrganization = await createResponse.json();
      const organizationId = createdOrganization.data.id;

      // Now update the organization
      const updateData = {
        name: 'Updated Organization Name',
        config: {
          ...newOrganization.config,
          consultationFee: 200
        }
      };

      const response = await fetch(`${WORKER_URL}/api/organizations/${organizationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveProperty('name', 'Updated Organization Name');
      expect(responseData.data).toHaveProperty('config');
    }, 30000);

    it('should return 404 for non-existent organization update', async () => {
      const updateData = {
        name: 'Updated Organization Name'
      };

      const response = await fetch(`${WORKER_URL}/api/organizations/non-existent-id`, {
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

  describe('DELETE /api/organizations/{slugOrId}', () => {
    it('should delete organization successfully', async () => {
      // First create a organization to delete
      const createRequest = {
        name: 'Test Organization for Deletion',
        slug: 'test-organization-delete-' + Date.now(),
        config: {
          requiresPayment: false,
          consultationFee: 0
        }
      };

      const createResponse = await fetch(`${WORKER_URL}/api/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createRequest)
      });
      
      expect(createResponse.status).toBe(201);
      const createResult = await createResponse.json();
      expect(createResult.success).toBe(true);
      
      const organizationId = createResult.data.id;
      console.log('🔍 Created organization ID:', organizationId);
      console.log('🔍 Created organization data:', JSON.stringify(createResult.data, null, 2));
      
      // Add a small delay to ensure the organization is fully created
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify the organization exists before trying to delete it
      const verifyResponse = await fetch(`${WORKER_URL}/api/organizations/${organizationId}`, {
        method: 'GET'
      });
      
      if (verifyResponse.status !== 200) {
        const verifyData = await verifyResponse.json();
        throw new Error(`Organization not found after creation! Verify Status: ${verifyResponse.status}, Data: ${JSON.stringify(verifyData, null, 2)}`);
      }
      
      // Now delete the organization
      const response = await fetch(`${WORKER_URL}/api/organizations/${organizationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const responseData = await response.json();
      
      if (response.status !== 200) {
        throw new Error(`Delete failed! Status: ${response.status}, OrganizationID: ${organizationId}, Response: ${JSON.stringify(responseData, null, 2)}`);
      }
      
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('deleted');
    });

    it('should return 404 for non-existent organization deletion', async () => {
      const response = await fetch(`${WORKER_URL}/api/organizations/non-existent-id`, {
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
      const response = await fetch(`${WORKER_URL}/api/organizations`, {
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

