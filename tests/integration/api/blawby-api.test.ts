import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { WORKER_URL } from '../../setup-real-api.js';

// Real Blawby API configuration for integration testing
const BLAWBY_API_URL = 'https://staging.blawby.com';
const BLAWBY_TEAM_SLUG = 'blawby-ai';

// Test context for managing test data and state
interface TestContext {
  customerIds: string[];
  apiToken?: string;
  teamUlid?: string;
}

describe('Blawby API Integration Tests - Real API Calls', () => {
  let testContext: TestContext;

  beforeAll(async () => {
    // Initialize team service to get credentials from database
    console.log('🔍 Setting up Blawby API integration tests...');
    
    try {
      // Get the team configuration from the database via the API
      const response = await fetch(`${WORKER_URL}/api/teams/${BLAWBY_TEAM_SLUG}`);
      
      if (response.ok) {
        const result = await response.json();
        const team = result.data; // API returns { success: true, data: team }
        
        if (team?.config?.blawbyApi?.enabled) {
          testContext = {
            customerIds: [],
            apiToken: team.config.blawbyApi.apiKey,
            teamUlid: team.config.blawbyApi.teamUlid
          };
          
          console.log('✅ Retrieved Blawby API credentials from database');
          console.log(`   Team ULID: ${testContext.teamUlid}`);
          console.log(`   API Token: ${testContext.apiToken ? '***' + testContext.apiToken.slice(-4) : 'NOT SET'}`);
        } else {
          console.warn('⚠️  Blawby API not enabled for blawby-ai team');
          testContext = { customerIds: [] };
        }
      } else {
        console.error(`❌ Failed to fetch team configuration: ${response.status} ${response.statusText}`);
        testContext = { customerIds: [] };
      }
    } catch (error) {
      console.error('❌ Failed to retrieve team configuration:', error);
      testContext = { customerIds: [] };
    }
    
    if (!testContext.apiToken || testContext.apiToken === 'test-token') {
      console.warn('⚠️  Blawby API token not available for testing');
      console.warn('   Tests will be skipped. Ensure blawby-ai team is configured in database.');
      console.warn('   Run setup script: ./scripts/setup-blawby-api.sh');
    }
  });

  beforeEach(() => {
    // Initialize test context for each test to ensure isolation
    testContext.customerIds = [];
  });

  afterEach(async () => {
    // Skip if no real API token or no test data
    if (!testContext.apiToken || testContext.apiToken === 'test-token' || !testContext.customerIds.length) {
      console.log('⏭️  Skipping cleanup - no valid token or test data');
      return;
    }
    
    for (const customerId of testContext.customerIds) {
      try {
        console.log(`🧹 Cleaning up test customer: ${customerId}`);
        
        const deleteResponse = await fetch(`${BLAWBY_API_URL}/api/v1/teams/${testContext.teamUlid}/customer/${customerId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${testContext.apiToken}`,
            'Accept': 'application/json'
          }
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ Successfully deleted test customer: ${customerId}`);
        } else if (deleteResponse.status === 404) {
          console.log(`ℹ️  Test customer ${customerId} already deleted (404)`);
        } else {
          console.warn(`⚠️  Failed to delete test customer ${customerId}: ${deleteResponse.status} ${deleteResponse.statusText}`);
        }
      } catch (error) {
        console.warn(`❌ Error cleaning up test customer ${customerId}:`, error);
      }
    }
  });

  describe('API Authentication', () => {
    it('should successfully authenticate with the Blawby API', async () => {
      // Skip if no real API token
      if (!testContext.apiToken || testContext.apiToken === 'test-token') {
        console.log('⏭️  Skipping real API test - no valid token');
        return;
      }

      const response = await fetch(`${BLAWBY_API_URL}/api/v1/teams/${testContext.teamUlid}/customers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testContext.apiToken}`,
          'Accept': 'application/json'
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('ulid');
      expect(data).toHaveProperty('customers');
    });

    it('should reject requests without proper authentication', async () => {
      // Skip if no real API token
      if (!testContext.apiToken || testContext.apiToken === 'test-token') {
        console.log('⏭️  Skipping real API test - no valid token');
        return;
      }

      const response = await fetch(`${BLAWBY_API_URL}/api/v1/teams/${testContext.teamUlid}/customers`, {
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
      // Skip if no real API token
      if (!testContext.apiToken || testContext.apiToken === 'test-token') {
        console.log('⏭️  Skipping real API test - no valid token');
        return;
      }

      const timestamp = Date.now();
      const email = `test-api-${timestamp}@example.com`;
      
      const customerData = {
        name: 'Test Customer API',
        email: email,
        phone: '+13322097232',
        currency: 'USD',
        status: 'Lead',
        team_id: testContext.teamUlid,
        address_line_1: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zip: '12345'
      };

      const response = await fetch(`${BLAWBY_API_URL}/api/v1/teams/${testContext.teamUlid}/customer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testContext.apiToken}`,
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
      // Skip if no real API token
      if (!testContext.apiToken || testContext.apiToken === 'test-token') {
        console.log('⏭️  Skipping real API test - no valid token');
        return;
      }

      const invalidCustomerData = {
        name: 'Test Customer',
        email: 'invalid-email',
        phone: 'invalid-phone'
      };

      const response = await fetch(`${BLAWBY_API_URL}/api/v1/teams/${testContext.teamUlid}/customer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testContext.apiToken}`,
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
      // Skip if no real API token
      if (!testContext.apiToken || testContext.apiToken === 'test-token') {
        console.log('⏭️  Skipping real API test - no valid token');
        return;
      }

      // Create customer first
      const timestamp = Date.now();
      const email = `test-invoice-${timestamp}@example.com`;
      
      const customerData = {
        name: 'Test Customer for Invoice',
        email: email,
        phone: '+13322097232',
        currency: 'USD',
        status: 'Lead',
        team_id: testContext.teamUlid
      };

      const customerResponse = await fetch(`${BLAWBY_API_URL}/api/v1/teams/${testContext.teamUlid}/customer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testContext.apiToken}`,
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
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft', // Required field
        line_items: [ // Required field
          {
            description: 'Legal consultation services',
            quantity: 1,
            unit_price: 150.00,
            amount: 150.00,
            line_total: 150.00 // Required field
          }
        ]
      };

      const invoiceResponse = await fetch(`${BLAWBY_API_URL}/api/v1/teams/${testContext.teamUlid}/invoice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testContext.apiToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(invoiceData)
      });

      console.log('📊 Invoice Response Status:', invoiceResponse.status);
      console.log('📊 Invoice Response Headers:', Object.fromEntries(invoiceResponse.headers.entries()));
      
      const invoiceResult = await invoiceResponse.json();
      console.log('📊 Invoice Response Body:', JSON.stringify(invoiceResult, null, 2));
      
      if (invoiceResponse.status !== 200) {
        console.log('❌ Invoice creation failed with validation error');
        console.log('📋 Invoice data sent:', JSON.stringify(invoiceData, null, 2));
        console.log('👤 Customer ID used:', customerIdResult);
      }
      
      if (invoiceResponse.status !== 200) {
        console.error('❌ Invoice creation failed!');
        console.error('Status:', invoiceResponse.status);
        console.error('Response:', JSON.stringify(invoiceResult, null, 2));
        console.error('Invoice data sent:', JSON.stringify(invoiceData, null, 2));
        console.error('Customer ID:', customerIdResult);
        throw new Error(`Invoice creation failed with status ${invoiceResponse.status}: ${JSON.stringify(invoiceResult)}`);
      }
      
      expect(invoiceResponse.status).toBe(200);
      expect(invoiceResult).toHaveProperty('message', 'Invoice created successfully.');
      expect(invoiceResult).toHaveProperty('data');
      expect(invoiceResult.data).toHaveProperty('id');
      expect(invoiceResult.data).toHaveProperty('customer_id', customerIdResult);
      
      // Log the actual response structure to understand the API
      console.log('✅ Invoice created successfully!');
      console.log('📊 Invoice response structure:', JSON.stringify(invoiceResult.data, null, 2));
      
      // The API returns amount_due instead of amount, and invoice_line_items instead of line_items
      expect(invoiceResult.data).toHaveProperty('amount_due', 150);
      expect(invoiceResult.data).toHaveProperty('invoice_line_items');
      expect(invoiceResult.data.invoice_line_items).toHaveLength(1);
      expect(invoiceResult.data.invoice_line_items[0]).toHaveProperty('line_total', 150);
      
      console.log('✅ Invoice created successfully with correct structure!');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Test with invalid URL to simulate network error
      try {
        await fetch('https://invalid-url-that-does-not-exist.com/api/test', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${testContext.apiToken}`,
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        // If we get here, the test should fail
        expect.fail('Expected network error but request succeeded');
      } catch (error) {
        // Expected network error
        expect(error).toBeDefined();
      }
    }, 10000); // 10 second test timeout

    it('should handle rate limiting', async () => {
      // Skip if no real API token
      if (!testContext.apiToken || testContext.apiToken === 'test-token') {
        console.log('⏭️  Skipping real API test - no valid token');
        return;
      }

      // Make multiple rapid requests to test rate limiting
      const promises = Array.from({ length: 5 }, () =>
        fetch(`${BLAWBY_API_URL}/api/v1/teams/${testContext.teamUlid}/customers`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${testContext.apiToken}`,
            'Accept': 'application/json'
          }
        })
      );

      const responses = await Promise.all(promises);
      
      // All requests should either succeed or be rate limited (429)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

}); 