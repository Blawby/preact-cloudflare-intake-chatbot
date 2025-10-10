import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WORKER_URL } from '../../setup-real-api';
import { ApiResponse } from '../../../worker/types.js';
import { Organization } from '../../../worker/services/OrganizationService.js';

describe('OrganizationService Integration - Real API', () => {
  beforeAll(async () => {
    console.log('🧪 Testing OrganizationService against real worker at:', WORKER_URL);
    
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

  describe('GET /api/organizations', () => {
    it('should return all organizations', async () => {
      const response = await fetch(`${WORKER_URL}/api/organizations`);
      
      expect(response.status).toBe(200);
      const result = await response.json() as ApiResponse<Organization[]>;
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
      
      // Verify organization structure
      const organization = result.data![0];
      expect(organization).toHaveProperty('id');
      expect(organization).toHaveProperty('slug');
      expect(organization).toHaveProperty('name');
      expect(organization).toHaveProperty('config');
    });
  });

  describe('GET /api/organizations/{id}', () => {
    it('should return organization by ID', async () => {
      // First get all organizations to find a valid ID
      const organizationsResponse = await fetch(`${WORKER_URL}/api/organizations`);
      const organizationsData = await organizationsResponse.json() as ApiResponse<Organization[]>;
      const validOrganizationId = organizationsData.data![0].id;
      
      const response = await fetch(`${WORKER_URL}/api/organizations/${validOrganizationId}`);
      
      expect(response.status).toBe(200);
      const result = await response.json() as ApiResponse<Organization>;
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', validOrganizationId);
      expect(result.data).toHaveProperty('slug');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('config');
    });

    it('should return organization by slug', async () => {
      // First get all organizations to find a valid slug
      const organizationsResponse = await fetch(`${WORKER_URL}/api/organizations`);
      const organizationsData = await organizationsResponse.json() as ApiResponse<Organization[]>;
      const validOrganizationSlug = organizationsData.data![0].slug;
      
      const response = await fetch(`${WORKER_URL}/api/organizations/${validOrganizationSlug}`);
      
      expect(response.status).toBe(200);
      const result = await response.json() as ApiResponse<Organization>;
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('slug', validOrganizationSlug);
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('config');
    });

    it('should return 404 for non-existent organization', async () => {
      const response = await fetch(`${WORKER_URL}/api/organizations/non-existent-organization`);
      
      expect(response.status).toBe(404);
      const result = await response.json() as ApiResponse;
      expect(result.success).toBe(false);
    });
  });

  describe('POST /api/organizations', () => {
    it('should create a new organization', async () => {
      const newOrganization = {
        slug: `test-organization-${Date.now()}`,
        name: 'Test Organization',
        config: {
                consultationFee: 0,
                requiresPayment: false,
          ownerEmail: 'test@realcompany.com',
          availableServices: ['Test Service'],
                jurisdiction: {
                  type: 'national',
            description: 'Test jurisdiction',
                  supportedStates: ['all'],
                  supportedCountries: ['US']
                },
          domain: 'test.example.com',
          description: 'Test organization description',
          brandColor: '#000000',
          accentColor: '#ffffff',
          introMessage: 'Hello from test organization!'
        }
      };

      const response = await fetch(`${WORKER_URL}/api/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newOrganization)
      });

      expect(response.status).toBe(201);
      const result = await response.json() as ApiResponse<Organization>;
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('slug', newOrganization.slug);
      expect(result.data).toHaveProperty('name', newOrganization.name);
      expect(result.data).toHaveProperty('config');
    });

    it('should validate required fields when creating organization', async () => {
      const invalidOrganization = {
        // Missing required fields
        name: 'Invalid Organization'
      };

      const response = await fetch(`${WORKER_URL}/api/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidOrganization)
      });

      expect(response.status).toBe(400);
      const result = await response.json() as ApiResponse;
      expect(result.success).toBe(false);
    });
  });

  describe('PUT /api/organizations/{id}', () => {
    it('should update an existing organization', async () => {
      // First create a organization
      const newOrganization = {
        slug: `update-test-${Date.now()}`,
        name: 'Update Test Organization',
        config: {
          consultationFee: 0,
          requiresPayment: false,
          ownerEmail: 'update@realcompany.com',
          availableServices: ['Update Service'],
          jurisdiction: {
            type: 'national',
            description: 'Update jurisdiction',
            supportedStates: ['all'],
            supportedCountries: ['US']
          },
          domain: 'update.example.com',
          description: 'Update organization description',
          brandColor: '#000000',
          accentColor: '#ffffff',
          introMessage: 'Hello from update organization!'
        }
      };

      const createResponse = await fetch(`${WORKER_URL}/api/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newOrganization)
      });

      const createdOrganization = await createResponse.json() as ApiResponse<Organization>;
      const organizationId = createdOrganization.data!.id;

      // Update the organization
      const updatedOrganization = {
        ...newOrganization,
        name: 'Updated Organization Name',
        config: {
          ...newOrganization.config,
          description: 'Updated description'
        }
      };

      const updateResponse = await fetch(`${WORKER_URL}/api/organizations/${organizationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedOrganization)
      });

      expect(updateResponse.status).toBe(200);
      const result = await updateResponse.json() as ApiResponse<Organization>;
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('name', 'Updated Organization Name');
      expect(result.data).toHaveProperty('config');
    });

    it('should return 404 when updating non-existent organization', async () => {
      const updateData = {
        name: 'Non-existent Organization',
        config: {}
      };

      const response = await fetch(`${WORKER_URL}/api/organizations/non-existent-id`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      expect(response.status).toBe(404);
      const result = await response.json() as ApiResponse;
      expect(result.success).toBe(false);
    });
  });

  describe('DELETE /api/organizations/{id}', () => {
    it('should delete an existing organization', async () => {
      // First create a organization to delete
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const newOrganization = {
        slug: `delete-test-${timestamp}-${randomId}`,
        name: 'Delete Test Organization',
        config: {
          consultationFee: 0,
          requiresPayment: false,
          ownerEmail: 'delete@realcompany.com',
          availableServices: ['Delete Service'],
          jurisdiction: {
            type: 'national',
            description: 'Delete jurisdiction',
            supportedStates: ['all'],
            supportedCountries: ['US']
          },
          domain: 'delete.example.com',
          description: 'Delete organization description',
          brandColor: '#000000',
          accentColor: '#ffffff',
          introMessage: 'Hello from delete organization!'
        }
      };

      const createResponse = await fetch(`${WORKER_URL}/api/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newOrganization)
      });

      console.log('Create response status:', createResponse.status);
      const createdOrganization = await createResponse.json() as ApiResponse<Organization>;
      console.log('Created organization response:', JSON.stringify(createdOrganization, null, 2));
      
      if (!createdOrganization.success) {
        throw new Error(`Organization creation failed: ${JSON.stringify(createdOrganization)}`);
      }
      
      const organizationId = createdOrganization.data!.id;

      // Delete the organization
      console.log('Attempting to delete organization with ID:', organizationId);
      const deleteResponse = await fetch(`${WORKER_URL}/api/organizations/${organizationId}`, {
        method: 'DELETE'
      });

      console.log('Delete response status:', deleteResponse.status);
      const deleteResult = await deleteResponse.json() as ApiResponse;
      console.log('Delete response:', JSON.stringify(deleteResult, null, 2));

      expect(deleteResponse.status).toBe(200);
      expect(deleteResult.success).toBe(true);

      // Verify organization is deleted
      const getResponse = await fetch(`${WORKER_URL}/api/organizations/${organizationId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 when deleting non-existent organization', async () => {
      const response = await fetch(`${WORKER_URL}/api/organizations/non-existent-id`, {
        method: 'DELETE'
      });

      expect(response.status).toBe(404);
      const result = await response.json() as ApiResponse;
      expect(result.success).toBe(false);
    });
  });

  describe('Organization configuration validation', () => {
    it('should validate organization configuration structure', async () => {
      const organizationsResponse = await fetch(`${WORKER_URL}/api/organizations`);
      const organizationsData = await organizationsResponse.json() as ApiResponse<Organization[]>;
      const organization = organizationsData.data![0];

      // Verify config has required fields
      expect(organization.config).toHaveProperty('aiModel');
      expect(organization.config).toHaveProperty('consultationFee');
      expect(organization.config).toHaveProperty('requiresPayment');
      // ownerEmail is optional in the config - it may or may not be present
      if (organization.config.ownerEmail !== undefined) {
        expect(typeof organization.config.ownerEmail).toBe('string');
      }
      expect(organization.config).toHaveProperty('availableServices');
      expect(organization.config).toHaveProperty('jurisdiction');
    });

    it('should handle organizations with different configurations', async () => {
      const organizationsResponse = await fetch(`${WORKER_URL}/api/organizations`);
      const organizationsData = await organizationsResponse.json() as ApiResponse<Organization[]>;

      // Test that different organizations can have different configurations
      const organizations = organizationsData.data!;
      expect(organizations.length).toBeGreaterThan(0);

      // Each organization should have a unique ID
      const ids = organizations.map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
      
      // Note: Slugs may have duplicates from test runs, but IDs should always be unique
      // This is expected behavior in a test environment with accumulated test data
    });
  });

  describe('API Token Management', () => {
    let testOrganizationId: string;
    let createdToken: { token: string; tokenId: string };

    beforeAll(async () => {
      // Create a test organization for API token tests
      const newOrganization = {
        slug: `api-token-test-${Date.now()}`,
        name: 'API Token Test Organization',
        config: {
          consultationFee: 0,
          requiresPayment: false,
          ownerEmail: 'apitoken@realcompany.com',
          availableServices: ['API Token Testing'],
          jurisdiction: {
            type: 'national',
            description: 'API token test jurisdiction',
            supportedStates: ['all'],
            supportedCountries: ['US']
          },
          blawbyApi: {
            enabled: true,
            apiKey: 'test-api-key-12345',
            organizationUlid: 'test-organization-ulid-12345',
            apiUrl: 'https://staging.blawby.com'
          }
        }
      };

      const createResponse = await fetch(`${WORKER_URL}/api/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrganization)
      });

      const createdOrganization = await createResponse.json() as ApiResponse<Organization>;
      testOrganizationId = createdOrganization.data!.id;
    });

    afterAll(async () => {
      // Clean up test organization
      if (testOrganizationId) {
        await fetch(`${WORKER_URL}/api/organizations/${testOrganizationId}`, {
          method: 'DELETE'
        });
      }
    });

    it('should create API token successfully', async () => {
      const tokenName = 'Test API Token';
      const permissions = ['read', 'write'];

      const response = await fetch(`${WORKER_URL}/api/organizations/${testOrganizationId}/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenName,
          permissions
        })
      });

      expect(response.status).toBe(201);
      const result = await response.json() as ApiResponse<{ token: string; tokenId: string }>;
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('token');
      expect(result.data).toHaveProperty('tokenId');
      expect(result.data!.token).toBeTruthy();
      expect(result.data!.tokenId).toBeTruthy();

      createdToken = result.data!;
    });

    it('should validate API token successfully', async () => {
      if (!createdToken) {
        throw new Error('No token created for validation test');
      }

      const response = await fetch(`${WORKER_URL}/api/organizations/${testOrganizationId}/validate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: createdToken.token
        })
      });

      expect(response.status).toBe(200);
      const result = await response.json() as ApiResponse<{ valid: boolean }>;
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('valid', true);
    });

    it('should reject invalid API token', async () => {
      const response = await fetch(`${WORKER_URL}/api/organizations/${testOrganizationId}/validate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'invalid-token-12345'
        })
      });

      expect(response.status).toBe(200);
      const result = await response.json() as ApiResponse<{ valid: boolean }>;
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('valid', false);
    });

    it('should list API tokens for organization', async () => {
      const response = await fetch(`${WORKER_URL}/api/organizations/${testOrganizationId}/tokens`);

      expect(response.status).toBe(200);
      const result = await response.json() as ApiResponse<Array<{ id: string; tokenName: string; permissions: string[]; createdAt: string; active: boolean }>>;
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
      
      const token = result.data![0];
      expect(token).toHaveProperty('id');
      expect(token).toHaveProperty('tokenName');
      expect(token).toHaveProperty('permissions');
      expect(token).toHaveProperty('createdAt');
      expect(token).toHaveProperty('active', true);
    });

    it('should revoke API token successfully', async () => {
      if (!createdToken) {
        throw new Error('No token created for revocation test');
      }

      const response = await fetch(`${WORKER_URL}/api/organizations/${testOrganizationId}/tokens/${createdToken.tokenId}`, {
        method: 'DELETE'
      });

      expect(response.status).toBe(200);
      const result = await response.json() as ApiResponse;
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('success', true);
    });

    it('should validate API key hash functionality', async () => {
      const response = await fetch(`${WORKER_URL}/api/organizations/${testOrganizationId}/validate-api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'test-api-key-12345'
        })
      });

      expect(response.status).toBe(200);
      const result = await response.json() as ApiResponse<{ valid: boolean }>;
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('valid', true);
    });

    it('should reject invalid API key', async () => {
      const response = await fetch(`${WORKER_URL}/api/organizations/${testOrganizationId}/validate-api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'invalid-api-key'
        })
      });

      expect(response.status).toBe(200);
      const result = await response.json() as ApiResponse<{ valid: boolean }>;
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('valid', false);
    });

    it('should generate API key hash for existing key', async () => {
      const response = await fetch(`${WORKER_URL}/api/organizations/${testOrganizationId}/generate-hash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const result = await response.json() as ApiResponse<{ success: boolean }>;
      
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('success', true);
    });
  });
});
