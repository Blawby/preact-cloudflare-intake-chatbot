import type { Env } from '../types';
import { withRetry } from '../utils/retry.js';

export interface PaymentRequest {
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
  };
  matterInfo: {
    type: string;
    description: string;
    urgency: string;
    opposingParty?: string;
  };
  teamId: string;
  sessionId: string;
}

export interface PaymentResponse {
  success: boolean;
  invoiceUrl?: string;
  paymentId?: string;
  status?: string;
  error?: string;
}

export interface InvoiceCreateRequest {
  customer_id: string;
  currency: string;
  due_date: string;
  status: string;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}

export interface InvoiceCreateResponse {
  data: {
    id: string;
    payment_link: string;
  };
}

export interface CustomerCreateResponse {
  data: {
    id: string;
  };
}

export interface CustomerCreateRequest {
  name: string;
  email: string;
  phone: string;
  currency: string;
  status: string;
  team_id: string;
  address_line_1: string;
  city: string;
  state: string;
  zip: string;
}

export interface PaymentConfig {
  defaultPrice: number; // in cents
  currency: string;
  dueDateDays: number;
  matterTypePricing?: Record<string, number>; // matter type -> price in cents
}

export class PaymentService {
  private env: Env;
  private mcpServerUrl: string;

  constructor(env: Env) {
    this.env = env;
    // Use the Blawby staging API with proper authentication
    this.mcpServerUrl = env.BLAWBY_API_URL || 'https://staging.blawby.com';
    console.log('💰 PaymentService initialized with API URL:', this.mcpServerUrl);
  }

  /**
   * Gets payment configuration for a team, with fallback to defaults
   */
  private async getPaymentConfig(teamId: string): Promise<PaymentConfig> {
    try {
      const { TeamService } = await import('./TeamService.js');
      const teamService = new TeamService(this.env);
      const team = await teamService.getTeam(teamId);
      
      // Use team's consultation fee if available, otherwise use defaults
      const teamConsultationFee = team?.config?.consultationFee;
      const defaultPrice = teamConsultationFee ? teamConsultationFee * 100 : 7500; // Convert dollars to cents
      
      // Default configuration with team-specific pricing
      return {
        defaultPrice: defaultPrice,
        currency: 'USD',
        dueDateDays: 30,
        matterTypePricing: {
          'Family Law': Math.round(defaultPrice * 1.33), // 33% more than default
          'Employment Law': Math.round(defaultPrice * 1.67), // 67% more than default
          'Personal Injury': Math.round(defaultPrice * 2.0), // 100% more than default
          'Business Law': Math.round(defaultPrice * 1.33), // 33% more than default
          'Criminal Law': Math.round(defaultPrice * 2.67), // 167% more than default
          'General Consultation': Math.round(defaultPrice * 0.67) // 33% less than default
        }
      };
    } catch (error) {
      console.warn('⚠️ Failed to load team payment config, using defaults:', error);
    }
    
    // Fallback default configuration
    return {
      defaultPrice: 7500, // $75.00 in cents
      currency: 'USD',
      dueDateDays: 30,
      matterTypePricing: {
        'Family Law': 10000, // $100.00
        'Employment Law': 12500, // $125.00
        'Personal Injury': 15000, // $150.00
        'Business Law': 10000, // $100.00
        'Criminal Law': 20000, // $200.00
        'General Consultation': 5000 // $50.00
      }
    };
  }

  /**
   * Gets the price for a specific matter type
   */
  private getMatterPrice(matterType: string, config: PaymentConfig): number {
    // Check if there's specific pricing for this matter type
    if (config.matterTypePricing && config.matterTypePricing[matterType]) {
      return config.matterTypePricing[matterType];
    }
    
    // Fall back to default price
    return config.defaultPrice;
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Handle test phone numbers (like 555-123-4567) by converting to a real format
    if (digits.startsWith('555') && digits.length === 10) {
      // Convert test numbers to a real format that the API will accept
      return '13322097232'; // Use a real phone number format for test numbers
    }
    
    // For US numbers, ensure we have the format that the API expects
    if (digits.length === 10) {
      return digits; // Return as 10 digits without country code
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return digits.substring(1); // Remove country code for US numbers
    } else if (digits.length > 10) {
      // For international numbers, try to extract the main part
      return digits.slice(-10); // Take last 10 digits
    }
    
    return digits; // Return as is if we can't format it
  }

  /**
   * Creates a customer with retry logic for transient failures
   */
  private async createCustomerWithRetry(
    teamUlid: string, 
    apiToken: string, 
    customerData: CustomerCreateRequest
  ): Promise<{ success: boolean; customerId?: string; error?: string }> {
    // Guard clause: validate required parameters
    if (!teamUlid || !apiToken || !customerData) {
      return {
        success: false,
        error: 'Missing required parameters: teamUlid, apiToken, or customerData'
      };
    }

    // Guard clause: validate customer data structure
    if (!customerData.name || !customerData.email || !customerData.phone) {
      return {
        success: false,
        error: 'Missing required customer data: name, email, or phone'
      };
    }

    try {
      // Generate idempotency key to prevent duplicate customers on retry
      const idempotencyKey = await this.generateCustomerIdempotencyKey(customerData);
      
      const customerResult = await withRetry(
        async () => {
          // Create new AbortController for this attempt
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          try {
            const response = await fetch(`${this.mcpServerUrl}/api/v1/teams/${teamUlid}/customer`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`,
                'Accept': 'application/json',
                'User-Agent': 'Blawby-Legal-Intake/1.0',
                'Idempotency-Key': idempotencyKey
              },
              body: JSON.stringify(customerData),
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Customer creation failed: ${response.status} - ${errorText}`);
            }

            return await response.json() as CustomerCreateResponse;
          } catch (error) {
            clearTimeout(timeoutId);
            throw error; // Re-throw to let withRetry handle it
          }
        },
        {
          attempts: 3,
          baseDelay: 500,
          maxDelay: 2000,
          operationName: 'create customer'
        }
      );

      const customerId = customerResult.data?.id;
      if (!customerId) {
        return {
          success: false,
          error: 'Failed to extract customer ID from response'
        };
      }

      console.log('✅ Customer created: id=', customerResult.data?.id);
      return { success: true, customerId };
    } catch (error) {
      console.error('❌ Customer creation error:', error);
      return {
        success: false,
        error: `Customer creation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Deletes a customer with retry logic for transient failures
   */
  private async deleteCustomerWithRetry(
    teamUlid: string, 
    apiToken: string, 
    customerId: string
  ): Promise<{ success: boolean; error?: string }> {
    // Input validation guard clauses
    if (!teamUlid || typeof teamUlid !== 'string' || teamUlid.trim() === '') {
      return { success: false, error: 'Team ULID is required and must be a non-empty string' };
    }
    
    if (!apiToken || typeof apiToken !== 'string' || apiToken.trim() === '') {
      return { success: false, error: 'API token is required and must be a non-empty string' };
    }
    
    if (!customerId || typeof customerId !== 'string' || customerId.trim() === '') {
      return { success: false, error: 'Customer ID is required and must be a non-empty string' };
    }

    try {
      await withRetry(
        async () => {
          // Create new AbortController for this attempt
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          try {
            const response = await fetch(`${this.mcpServerUrl}/api/v1/teams/${teamUlid}/customer/${customerId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Accept': 'application/json',
                'User-Agent': 'Blawby-Legal-Intake/1.0'
              },
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Customer deletion failed: ${response.status} - ${errorText}`);
            }

            return await response.json();
          } catch (error) {
            clearTimeout(timeoutId);
            throw error; // Re-throw to let withRetry handle it
          }
        },
        {
          attempts: 3,
          baseDelay: 500,
          maxDelay: 2000,
          operationName: 'delete customer'
        }
      );

      console.log('✅ Customer deleted:', customerId);
      return { success: true };
    } catch (error) {
      console.error('❌ Customer deletion error:', error);
      return {
        success: false,
        error: `Customer deletion failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Helper method to create a deterministic hash using Web Crypto API
   */
  private async createDeterministicHash(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    const hashHex = Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return hashHex.slice(0, 32); // Truncate to 32 characters for consistent length
  }

  /**
   * Generates a deterministic idempotency key from customer data
   */
  private async generateCustomerIdempotencyKey(customerData: CustomerCreateRequest): Promise<string> {
    // Create a deterministic key based on customer data to prevent duplicates
    const keyData = {
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      team_id: customerData.team_id
    };
    
    // Use Web Crypto API to create a deterministic hash
    const keyString = JSON.stringify(keyData);
    const hash = await this.createDeterministicHash(keyString);
    return `customer-${hash}`;
  }

  /**
   * Generates a deterministic idempotency key from invoice data
   */
  private async generateIdempotencyKey(invoiceData: InvoiceCreateRequest): Promise<string> {
    // Create a deterministic key based on invoice data to prevent duplicates
    const keyData = {
      customer_id: invoiceData.customer_id,
      currency: invoiceData.currency,
      due_date: invoiceData.due_date,
      line_items: invoiceData.line_items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))
    };
    
    // Use Web Crypto API to create a deterministic hash
    const keyString = JSON.stringify(keyData);
    const hash = await this.createDeterministicHash(keyString);
    return `invoice-${hash}`;
  }

  /**
   * Creates an invoice with retry logic for transient failures
   */
  private async createInvoiceWithRetry(
    teamUlid: string, 
    apiToken: string, 
    invoiceData: InvoiceCreateRequest,
    idempotencyKey?: string
  ): Promise<{ success: boolean; invoiceUrl?: string; paymentId?: string; error?: string }> {
    try {
      // Generate idempotency key if not provided
      const key = idempotencyKey || await this.generateIdempotencyKey(invoiceData);
      
      const invoiceResult = await withRetry(
        async () => {
          // Create new AbortController for this attempt
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          try {
            const response = await fetch(`${this.mcpServerUrl}/api/v1/teams/${teamUlid}/invoice`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`,
                'Accept': 'application/json',
                'User-Agent': 'Blawby-Legal-Intake/1.0',
                'Idempotency-Key': key
              },
              body: JSON.stringify(invoiceData),
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Invoice creation failed: ${response.status} - ${errorText}`);
            }

            return await response.json() as InvoiceCreateResponse;
          } catch (error) {
            clearTimeout(timeoutId);
            throw error; // Re-throw to let withRetry handle it
          }
        },
        {
          attempts: 3,
          baseDelay: 500,
          maxDelay: 2000,
          operationName: 'create invoice'
        }
      );

      // Defensive null checks for response data
      if (!invoiceResult) {
        console.error('❌ Invoice creation returned null response');
        return {
          success: false,
          error: 'Invoice creation returned null response'
        };
      }

      if (!invoiceResult.data) {
        console.error('❌ Invoice creation response missing data field:', invoiceResult);
        return {
          success: false,
          error: 'Invoice creation response missing data field'
        };
      }

      if (!invoiceResult.data.payment_link || !invoiceResult.data.id) {
        console.error('❌ Invoice creation response missing required fields:', invoiceResult.data);
        return {
          success: false,
          error: 'Invoice creation response missing payment_link or id'
        };
      }

      console.log('✅ Invoice created: id=', invoiceResult.data?.id, 'timestamp=', new Date().toISOString());
      return {
        success: true,
        invoiceUrl: invoiceResult.data.payment_link,
        paymentId: invoiceResult.data.id
      };
    } catch (error) {
      console.error('❌ Invoice creation error:', error);
      return {
        success: false,
        error: `Invoice creation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async createInvoice(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    // Guard clause: validate required parameters
    if (!paymentRequest) {
      return {
        success: false,
        error: 'Payment request is required'
      };
    }

    if (!paymentRequest.teamId || !paymentRequest.sessionId) {
      return {
        success: false,
        error: 'Missing required fields: teamId or sessionId'
      };
    }

    if (!paymentRequest.customerInfo || !paymentRequest.matterInfo) {
      return {
        success: false,
        error: 'Missing required fields: customerInfo or matterInfo'
      };
    }

    // Guard clause: validate customer info
    if (!paymentRequest.customerInfo.name || !paymentRequest.customerInfo.email || !paymentRequest.customerInfo.phone) {
      return {
        success: false,
        error: 'Missing required customer information: name, email, or phone'
      };
    }

    // Guard clause: validate matter info
    if (!paymentRequest.matterInfo.type || !paymentRequest.matterInfo.description) {
      return {
        success: false,
        error: 'Missing required matter information: type or description'
      };
    }

    try {
      console.log('💰 Creating invoice for payment request: teamId=', paymentRequest.teamId, 'sessionId=', paymentRequest.sessionId);
      
      const teamId = paymentRequest.teamId;
      console.log('💰 Using team ID:', teamId);
      
      // Get team configuration to check if Blawby API is enabled
      const { TeamService } = await import('./TeamService.js');
      const teamService = new TeamService(this.env);
      const team = await teamService.getTeam(teamId);
      
      if (!team) {
        return {
          success: false,
          error: 'Team not found'
        };
      }
      
      // Check if Blawby API is enabled for this team
      if (!team.config.blawbyApi?.enabled) {
        console.log('❌ Blawby API not enabled for team:', teamId);
        return {
          success: false,
          error: 'Blawby API not enabled for this team'
        };
      }
      
      // Use secure API credentials from environment variables
      const apiToken = this.env.BLAWBY_API_TOKEN;
      const teamUlid = this.env.BLAWBY_TEAM_ULID;
      
      if (!apiToken) {
        console.error('❌ CRITICAL: No API token available for payment processing');
        console.error('   - env.BLAWBY_API_TOKEN:', this.env.BLAWBY_API_TOKEN ? 'SET' : 'NOT SET');
        console.error('   - Set BLAWBY_API_TOKEN environment variable for secure payment processing');
        return {
          success: false,
          error: 'API token not configured - cannot process payment. Set BLAWBY_API_TOKEN environment variable.'
        };
      }
      
      if (!teamUlid) {
        console.error('❌ CRITICAL: No team ULID available for payment processing');
        console.error('   - env.BLAWBY_TEAM_ULID:', this.env.BLAWBY_TEAM_ULID ? 'SET' : 'NOT SET');
        console.error('   - Set BLAWBY_TEAM_ULID environment variable for secure payment processing');
        return {
          success: false,
          error: 'Team ULID not configured - cannot process payment. Set BLAWBY_TEAM_ULID environment variable.'
        };
      }
      
      console.log('💰 Team API configuration:', {
        enabled: team.config.blawbyApi?.enabled,
        hasApiKey: !!apiToken,
        teamUlid: teamUlid
      });
      
      // Get payment configuration for this team
      const paymentConfig = await this.getPaymentConfig(teamId);
      console.log('💰 Payment configuration:', paymentConfig);
      
      // Step 1: Create customer with retry logic
      const customerData: CustomerCreateRequest = {
        name: paymentRequest.customerInfo.name,
        email: paymentRequest.customerInfo.email,
        phone: this.formatPhoneNumber(paymentRequest.customerInfo.phone),
        currency: paymentConfig.currency,
        status: 'Lead',
        team_id: teamUlid,
        address_line_1: paymentRequest.customerInfo.location || '',
        city: 'Test City',
        state: 'TS',
        zip: '12345'
      };

      const customerResult = await this.createCustomerWithRetry(teamUlid, apiToken, customerData);
      if (!customerResult.success) {
        return {
          success: false,
          error: customerResult.error || 'Failed to create customer'
        };
      }

      // Store customer ID for potential cleanup
      const customerId = customerResult.customerId!;

      try {
        // Step 2: Create invoice with retry logic
        const matterPrice = this.getMatterPrice(paymentRequest.matterInfo.type, paymentConfig);
        const dueDate = new Date(Date.now() + paymentConfig.dueDateDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const invoiceData: InvoiceCreateRequest = {
          customer_id: customerId,
          currency: paymentConfig.currency,
          due_date: dueDate,
          status: 'draft',
          line_items: [
            {
              description: `${paymentRequest.matterInfo.type}: ${paymentRequest.matterInfo.description}`,
              quantity: 1,
              unit_price: matterPrice,
              line_total: matterPrice
            }
          ]
        };

        console.log('💰 Invoice data with configurable pricing:', {
          matterType: paymentRequest.matterInfo.type,
          price: matterPrice,
          currency: paymentConfig.currency,
          dueDate: dueDate
        });

        const invoiceResult = await this.createInvoiceWithRetry(teamUlid, apiToken, invoiceData);
        if (!invoiceResult.success) {
          // Invoice creation failed - attempt to clean up the orphaned customer
          console.log('🔄 Invoice creation failed, attempting to delete orphaned customer:', customerId);
          const deleteResult = await this.deleteCustomerWithRetry(teamUlid, apiToken, customerId);
          if (!deleteResult.success) {
            console.error('❌ Failed to clean up orphaned customer:', customerId, 'Error:', deleteResult.error);
          } else {
            console.log('✅ Successfully cleaned up orphaned customer:', customerId);
          }
          
          return {
            success: false,
            error: invoiceResult.error || 'Failed to create invoice'
          };
        }

        return {
          success: true,
          invoiceUrl: invoiceResult.invoiceUrl,
          paymentId: invoiceResult.paymentId
        };
      } catch (error) {
        // Any downstream error - attempt to clean up the orphaned customer
        console.log('🔄 Downstream error occurred, attempting to delete orphaned customer:', customerId);
        const deleteResult = await this.deleteCustomerWithRetry(teamUlid, apiToken, customerId);
        if (!deleteResult.success) {
          console.error('❌ Failed to clean up orphaned customer:', customerId, 'Error:', deleteResult.error);
        } else {
          console.log('✅ Successfully cleaned up orphaned customer:', customerId);
        }
        
        // Log both the original error and any cleanup error, but return the original error
        console.error('❌ Original error:', error);
        throw error; // Re-throw to be caught by outer try/catch
      }

    } catch (error) {
      console.error('❌ Payment service error:', error);
      return {
        success: false,
        error: `Payment service error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    try {
      const teamId = this.env.BLAWBY_TEAM_ULID || 'default';
      const response = await fetch(`${this.mcpServerUrl}/api/v1/teams/${teamId}/invoices/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.env.BLAWBY_API_TOKEN || ''}`,
          'Accept': 'application/json',
          'User-Agent': 'Blawby-Legal-Intake/1.0'
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to get payment status: ${response.status}`
        };
      }

      const result = await response.json();
      return {
        success: true,
        invoiceUrl: result[0]?.payment_link,
        paymentId: result[0]?.id,
        status: result[0]?.status
      };

    } catch (error) {
      console.error('❌ Payment status check error:', error);
      return {
        success: false,
        error: `Failed to check payment status: ${error}`
      };
    }
  }
} 