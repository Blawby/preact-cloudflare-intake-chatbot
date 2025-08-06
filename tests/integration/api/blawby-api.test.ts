import { describe, it, expect, beforeAll } from 'vitest';

// Mock environment variables for testing
const mockEnv = {
  BLAWBY_API_URL: 'https://staging.blawby.com',
  BLAWBY_API_TOKEN: process.env.BLAWBY_API_TOKEN || 'test-token',
  BLAWBY_TEAM_ULID: '01jq70jnstyfzevc6423czh50e'
};

describe('Blawby API Integration Tests', () => {
  describe('API Authentication', () => {
    it('should successfully authenticate with the Blawby API', async () => {
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
      const customerData = {
        name: 'Test Customer API',
        email: `test-api-${Date.now()}@example.com`,
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

      // Store the customer ID for invoice creation test
      (global as any).testCustomerId = data.data.id;
    });

    it('should reject customer creation with invalid data', async () => {
      const invalidCustomerData = {
        name: 'Test Customer',
        email: 'invalid-email',
        phone: '123', // Too short
        currency: 'USD',
        status: 'Lead',
        team_id: mockEnv.BLAWBY_TEAM_ULID
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
      expect(data).toHaveProperty('errors');
    });
  });

  describe('Invoice Creation', () => {
    it('should successfully create an invoice for a customer', async () => {
      // First create a customer
      const customerData = {
        name: 'Test Customer for Invoice',
        email: `test-invoice-${Date.now()}@example.com`,
        phone: '+13322097232',
        currency: 'USD',
        status: 'Lead',
        team_id: mockEnv.BLAWBY_TEAM_ULID,
        address_line_1: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zip: '12345'
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
      const customerId = customerResult.data.id;

      // Now create an invoice
      const invoiceData = {
        customer_id: customerId,
        currency: 'USD',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        line_items: [
          {
            description: 'Legal consultation: Divorce',
            quantity: 1,
            unit_price: 7500,
            line_total: 7500
          }
        ]
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
      expect(invoiceResult.data).toHaveProperty('payment_link');
      expect(invoiceResult.data.payment_link).toContain('staging.blawby.com');
    });
  });
}); 