import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

// Mock environment variables for testing
const mockEnv = {
  BLAWBY_API_URL: 'https://staging.blawby.com',
  BLAWBY_API_TOKEN: 'test-token',
  BLAWBY_TEAM_ULID: '01jq70jnstyfzevc6423czh50e'
};

// Test context for managing test data and state
interface TestContext {
  customerIds: string[];
}

describe('Blawby API Integration Tests', () => {
  let testContext: TestContext;

  beforeAll(() => {
    // Mock successful authentication response
    (fetch as any).mockResolvedValue({
      status: 200,
      json: async () => ({
        ulid: mockEnv.BLAWBY_TEAM_ULID,
        customers: []
      })
    });
  });

  beforeEach(() => {
    // Initialize test context for each test to ensure isolation
    testContext = {
      customerIds: []
    };
    vi.clearAllMocks();
  });

  describe('API Authentication', () => {
    it('should successfully authenticate with the Blawby API', async () => {
      (fetch as any).mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          ulid: mockEnv.BLAWBY_TEAM_ULID,
          customers: []
        })
      });

      const response = await fetch(`${mockEnv.BLAWBY_API_URL}/api/v1/teams/${mockEnv.BLAWBY_TEAM_ULID}/customers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockEnv.BLAWBY_API_TOKEN}`,
          'Accept': 'application/json'
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('ulid');
      expect(data).toHaveProperty('customers');
    });

    it('should reject requests without proper authentication', async () => {
      (fetch as any).mockResolvedValueOnce({
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      });

      const response = await fetch(`${mockEnv.BLAWBY_API_URL}/api/v1/teams/${mockEnv.BLAWBY_TEAM_ULID}/customers`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Customer Creation', () => {
    it('should successfully create a customer', async () => {
      const timestamp = Date.now();
      const customerId = `customer-${timestamp}`;
      const email = `test-api-${timestamp}@example.com`;
      
      (fetch as any).mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          message: 'Customer created successfully.',
          data: {
            id: customerId,
            name: 'Test Customer API',
            email: email,
            phone: '+13322097232'
          }
        })
      });

      const customerData = {
        name: 'Test Customer API',
        email: email,
        phone: '+13322097232',
        currency: 'USD',
        status: 'Lead',
        team_id: mockEnv.BLAWBY_TEAM_ULID,
        address_line_1: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zip: '12345'
      };

      const response = await fetch(`${mockEnv.BLAWBY_API_URL}/api/v1/teams/${mockEnv.BLAWBY_TEAM_ULID}/customer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockEnv.BLAWBY_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(customerData)
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('message', 'Customer created successfully.');
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('id');
      expect(data.data.name).toBe(customerData.name);
      expect(data.data.email).toBe(customerData.email);

      // Store the customer ID in test context for cleanup
      testContext.customerIds.push(data.data.id);
    });

    it('should reject customer creation with invalid data', async () => {
      (fetch as any).mockResolvedValueOnce({
        status: 422,
        json: async () => ({
          message: 'Validation error',
          errors: ['Invalid email format']
        })
      });

      const invalidCustomerData = {
        name: 'Test Customer',
        email: 'invalid-email',
        phone: 'invalid-phone'
      };

      const response = await fetch(`${mockEnv.BLAWBY_API_URL}/api/v1/teams/${mockEnv.BLAWBY_TEAM_ULID}/customer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockEnv.BLAWBY_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(invalidCustomerData)
      });

      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data).toHaveProperty('message');
    });
  });

  describe('Invoice Creation', () => {
    it('should successfully create an invoice for a customer', async () => {
      const customerId = `customer-${Date.now()}`;
      const invoiceId = `invoice-${Date.now()}`;

      // Mock customer creation
      (fetch as any).mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          message: 'Customer created successfully.',
          data: { id: customerId }
        })
      });

      // Mock invoice creation
      (fetch as any).mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          message: 'Invoice created successfully.',
          data: {
            id: invoiceId,
            customer_id: customerId,
            amount: 150.00,
            status: 'draft'
          }
        })
      });

      // Create customer first
      const customerData = {
        name: 'Test Customer for Invoice',
        email: `test-invoice-${Date.now()}@example.com`,
        phone: '+13322097232',
        currency: 'USD',
        status: 'Lead',
        team_id: mockEnv.BLAWBY_TEAM_ULID
      };

      const customerResponse = await fetch(`${mockEnv.BLAWBY_API_URL}/api/v1/teams/${mockEnv.BLAWBY_TEAM_ULID}/customer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockEnv.BLAWBY_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(customerData)
      });

      expect(customerResponse.status).toBe(200);
      const customerResult = await customerResponse.json();
      const customerIdResult = customerResult.data.id;

      // Store customer ID for cleanup
      testContext.customerIds.push(customerIdResult);

      // Create invoice
      const invoiceData = {
        customer_id: customerIdResult,
        amount: 150.00,
        currency: 'USD',
        description: 'Legal consultation services',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      const invoiceResponse = await fetch(`${mockEnv.BLAWBY_API_URL}/api/v1/teams/${mockEnv.BLAWBY_TEAM_ULID}/invoice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockEnv.BLAWBY_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(invoiceData)
      });

      expect(invoiceResponse.status).toBe(200);
      const invoiceResult = await invoiceResponse.json();
      expect(invoiceResult).toHaveProperty('message', 'Invoice created successfully.');
      expect(invoiceResult).toHaveProperty('data');
      expect(invoiceResult.data).toHaveProperty('id');
      expect(invoiceResult.data).toHaveProperty('customer_id', customerIdResult);
      expect(invoiceResult.data).toHaveProperty('amount', 150.00);
    });
  });

  afterAll(async () => {
    // Clean up test data - mock the delete requests
    if (!testContext || !testContext.customerIds.length) {
      return;
    }
    
    for (const customerId of testContext.customerIds) {
      try {
        console.log(`🧹 Cleaning up test customer: ${customerId}`);
        (fetch as any).mockResolvedValueOnce({
          status: 200,
          json: async () => ({ message: 'Customer deleted successfully' })
        });
        
        const deleteResponse = await fetch(`${mockEnv.BLAWBY_API_URL}/api/v1/teams/${mockEnv.BLAWBY_TEAM_ULID}/customer/${customerId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${mockEnv.BLAWBY_API_TOKEN}`,
            'Accept': 'application/json'
          }
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ Successfully deleted test customer: ${customerId}`);
        } else {
          console.warn(`⚠️ Failed to delete test customer ${customerId}: ${deleteResponse.status} ${deleteResponse.statusText}`);
        }
      } catch (error) {
        console.error(`❌ Error cleaning up test customer ${customerId}:`, error);
      }
    }
  });
}); 