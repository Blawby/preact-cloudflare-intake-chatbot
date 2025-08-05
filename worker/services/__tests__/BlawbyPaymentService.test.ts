import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the BlawbyApiService before importing BlawbyPaymentService
const mockGetCustomerByEmail = vi.fn();
const mockCreateCustomer = vi.fn();
const mockCreateCustomerMemo = vi.fn();
const mockCreateInvoice = vi.fn();

vi.mock('../BlawbyApiService', () => ({
  BlawbyApiService: vi.fn().mockImplementation(() => ({
    getCustomerByEmail: mockGetCustomerByEmail,
    createCustomer: mockCreateCustomer,
    createCustomerMemo: mockCreateCustomerMemo,
    createInvoice: mockCreateInvoice,
  })),
}));

import { BlawbyPaymentService } from '../BlawbyPaymentService';

describe('BlawbyPaymentService', () => {
  let paymentService: BlawbyPaymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    paymentService = new BlawbyPaymentService('test-token', 'https://test.blawby.com');
  });

  describe('createInvoice', () => {
    it('should use consultation fee from payment request', async () => {
      const paymentRequest = {
        customerInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-123-4567',
        },
        matterInfo: {
          type: 'Personal Injury',
          description: 'Car accident case',
          urgency: 'High',
        },
        teamId: 'team-123',
        sessionId: 'session-123',
        consultationFee: 150, // Custom consultation fee
      };

      // Mock customer exists
      mockGetCustomerByEmail.mockResolvedValue({
        success: true,
        data: { id: 'customer-123', email: 'john@example.com' },
      });

      // Mock invoice creation
      mockCreateInvoice.mockResolvedValue({
        success: true,
        data: {
          data: {
            id: 'invoice-123',
            payment_link: 'https://test.blawby.com/pay/invoice-123',
          },
        },
      });

      const result = await paymentService.createInvoice(paymentRequest);

      expect(result.success).toBe(true);
      expect(result.paymentId).toBe('invoice-123');
      expect(result.invoiceUrl).toBe('https://test.blawby.com/pay/invoice-123');

      // Verify that createInvoice was called with the custom consultation fee
      expect(mockCreateInvoice).toHaveBeenCalledWith(
        'team-123',
        'customer-123',
        150, // Should use the consultation fee from payment request
        expect.stringContaining('Consultation fee for Personal Injury matter')
      );
    });

    it('should use default consultation fee when not provided', async () => {
      const paymentRequest = {
        customerInfo: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '555-987-6543',
        },
        matterInfo: {
          type: 'Family Law',
          description: 'Divorce proceedings',
          urgency: 'Medium',
        },
        teamId: 'team-456',
        sessionId: 'session-456',
        // No consultationFee provided
      };

      // Mock customer exists
      mockGetCustomerByEmail.mockResolvedValue({
        success: true,
        data: { id: 'customer-456', email: 'jane@example.com' },
      });

      // Mock invoice creation
      mockCreateInvoice.mockResolvedValue({
        success: true,
        data: {
          data: {
            id: 'invoice-456',
            payment_link: 'https://test.blawby.com/pay/invoice-456',
          },
        },
      });

      const result = await paymentService.createInvoice(paymentRequest);

      expect(result.success).toBe(true);

      // Verify that createInvoice was called with the default consultation fee (75)
      expect(mockCreateInvoice).toHaveBeenCalledWith(
        'team-456',
        'customer-456',
        75, // Should use default consultation fee
        expect.stringContaining('Consultation fee for Family Law matter')
      );
    });

    it('should handle customer creation when customer does not exist', async () => {
      const paymentRequest = {
        customerInfo: {
          name: 'New Customer',
          email: 'new@example.com',
          phone: '555-111-2222',
        },
        matterInfo: {
          type: 'Criminal Defense',
          description: 'DUI case',
          urgency: 'High',
        },
        teamId: 'team-789',
        sessionId: 'session-789',
        consultationFee: 200,
      };

      // Mock customer not found
      mockGetCustomerByEmail.mockResolvedValue({
        success: false,
        error: 'Customer not found',
      });

      // Mock customer creation
      mockCreateCustomer.mockResolvedValue({
        success: true,
        data: {
          data: { id: 'customer-789', email: 'new@example.com' },
        },
      });

      // Mock memo creation
      mockCreateCustomerMemo.mockResolvedValue({
        success: true,
      });

      // Mock invoice creation
      mockCreateInvoice.mockResolvedValue({
        success: true,
        data: {
          data: {
            id: 'invoice-789',
            payment_link: 'https://test.blawby.com/pay/invoice-789',
          },
        },
      });

      const result = await paymentService.createInvoice(paymentRequest);

      expect(result.success).toBe(true);
      expect(result.customerId).toBe('customer-789');

      // Verify customer was created
      expect(mockCreateCustomer).toHaveBeenCalledWith(
        'team-789',
        paymentRequest.customerInfo
      );

      // Verify memo was created
      expect(mockCreateCustomerMemo).toHaveBeenCalledWith(
        'team-789',
        'customer-789',
        expect.stringContaining('New client from intake form')
      );

      // Verify invoice was created with custom consultation fee
      expect(mockCreateInvoice).toHaveBeenCalledWith(
        'team-789',
        'customer-789',
        200, // Should use the consultation fee from payment request
        expect.stringContaining('Consultation fee for Criminal Defense matter')
      );
    });
  });
}); 