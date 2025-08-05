import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BlawbyApiService } from '../BlawbyApiService';

describe('BlawbyApiService', () => {
  let blawbyApi: BlawbyApiService;

  beforeEach(() => {
    // Mock environment variables
    process.env.BLAWBY_API_URL = 'https://app.blawby.com';
    process.env.BLAWBY_API_TOKEN = 'test_token';
    
    blawbyApi = new BlawbyApiService();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.BLAWBY_API_URL;
    delete process.env.BLAWBY_API_TOKEN;
  });

  describe('createCustomer', () => {
    it('should create a customer with valid data', async () => {
      const customerInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
        currency: 'USD',
        status: 'Lead',
      };

      // Mock fetch to return success response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: 'Customer created successfully.',
          data: {
            id: 'customer_123',
            name: 'John Doe',
            email: 'john@example.com',
            phone: '555-123-4567',
            status: 'Lead'
          }
        })
      });

      const result = await blawbyApi.createCustomer('01jw3mhms63s9jvx9299nbwq1g', customerInfo);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.data.id).toBe('customer_123');
    });

    it('should handle API errors gracefully', async () => {
      const customerInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
        currency: 'USD',
        status: 'Lead',
      };

      // Mock fetch to return error response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          message: 'The email has already been taken.',
          errors: {
            email: ['The email has already been taken.']
          }
        })
      });

      const result = await blawbyApi.createCustomer('01jw3mhms63s9jvx9299nbwq1g', customerInfo);

      expect(result.success).toBe(false);
      expect(result.error).toContain('email has already been taken');
    });

    it('should validate missing teamUlid', async () => {
      const customerInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
      };

      const result = await blawbyApi.createCustomer('', customerInfo);

      expect(result.success).toBe(false);
      expect(result.error).toContain('teamUlid is required');
    });

    it('should validate missing name', async () => {
      const customerInfo = {
        name: '',
        email: 'john@example.com',
        phone: '555-123-4567',
      };

      const result = await blawbyApi.createCustomer('01jw3mhms63s9jvx9299nbwq1g', customerInfo);

      expect(result.success).toBe(false);
      expect(result.error).toContain('name is required');
    });

    it('should validate missing email', async () => {
      const customerInfo = {
        name: 'John Doe',
        email: '',
        phone: '555-123-4567',
      };

      const result = await blawbyApi.createCustomer('01jw3mhms63s9jvx9299nbwq1g', customerInfo);

      expect(result.success).toBe(false);
      expect(result.error).toContain('email is required');
    });

    it('should validate invalid email format', async () => {
      const customerInfo = {
        name: 'John Doe',
        email: 'invalid-email',
        phone: '555-123-4567',
      };

      const result = await blawbyApi.createCustomer('01jw3mhms63s9jvx9299nbwq1g', customerInfo);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });

    it('should validate invalid phone format', async () => {
      const customerInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: 'invalid-phone',
      };

      const result = await blawbyApi.createCustomer('01jw3mhms63s9jvx9299nbwq1g', customerInfo);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone number format');
    });

    it('should validate name length', async () => {
      const customerInfo = {
        name: 'A', // Too short
        email: 'john@example.com',
        phone: '555-123-4567',
      };

      const result = await blawbyApi.createCustomer('01jw3mhms63s9jvx9299nbwq1g', customerInfo);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Name must be between 2 and 100 characters');
    });

    it('should validate email length', async () => {
      const customerInfo = {
        name: 'John Doe',
        email: 'a'.repeat(256) + '@example.com', // Too long
        phone: '555-123-4567',
      };

      const result = await blawbyApi.createCustomer('01jw3mhms63s9jvx9299nbwq1g', customerInfo);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email address is too long');
    });
  });

  describe('getCustomerByEmail', () => {
    it('should find existing customer by email', async () => {
      const email = 'john@example.com';
      const teamUlid = '01jw3mhms63s9jvx9299nbwq1g';

      // Mock fetch to return customer list
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          customers: {
            data: [
              {
                id: 'customer_123',
                name: 'John Doe',
                email: 'john@example.com',
                phone: '555-123-4567',
                status: 'Lead'
              }
            ]
          }
        })
      });

      const result = await blawbyApi.getCustomerByEmail(teamUlid, email);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.email).toBe(email);
    });

    it('should return error when customer not found', async () => {
      const email = 'nonexistent@example.com';
      const teamUlid = '01jw3mhms63s9jvx9299nbwq1g';

      // Mock fetch to return empty customer list
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          customers: {
            data: []
          }
        })
      });

      const result = await blawbyApi.getCustomerByEmail(teamUlid, email);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Customer not found');
    });
  });

  describe('createInvoice', () => {
    it('should create an invoice successfully', async () => {
      const teamUlid = '01jw3mhms63s9jvx9299nbwq1g';
      const customerId = 'customer_123';
      const amount = 75;
      const description = 'Legal consultation';

      // Mock fetch to return success response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: 'Invoice created successfully.',
          data: {
            id: 'inv_123',
            customer_id: customerId,
            team_id: teamUlid,
            amount_due: amount,
            status: 'draft',
            currency: 'USD',
            payment_link: 'https://app.blawby.com/pay/inv_123'
          }
        })
      });

      const result = await blawbyApi.createInvoice(teamUlid, customerId, amount, description);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.data.id).toBe('inv_123');
      expect(result.data.data.payment_link).toBe('https://app.blawby.com/pay/inv_123');
    });
  });
}); 