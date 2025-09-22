import type { Env } from '../types';
import { withRetry } from '../utils/retry.js';
import { Currency } from '../agents/legalIntakeAgent.js';

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
  currency: Currency;
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
  currency: Currency;
  status: string;
  team_id: string;
  address_line_1?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface PaymentConfig {
  defaultPrice: number; // in cents
  currency: Currency;
  dueDateDays: number;
  matterTypePricing?: Record<string, number>; // matter type -> price in cents
}

// Invoice creation error codes for better error handling
type InvoiceErrorCode = 
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_ABORT' 
  | 'SERVER_ERROR'
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'UNKNOWN_ERROR';

interface InvoiceResult {
  success: boolean;
  invoiceUrl?: string;
  paymentId?: string;
  error?: string;
  errorCode?: InvoiceErrorCode;
  isIndeterminate?: boolean; // true if we can't determine if invoice was created server-side
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
      
      // Validate and normalize the consultation fee
      const normalizedFee = this.validateConsultationFee(teamConsultationFee);
      
      // Convert to integer cents and ensure minimum value
      const defaultPriceCents = Math.max(100, Math.round(normalizedFee * 100)); // Minimum 100 cents ($1.00)
      
      // Default configuration with team-specific pricing
      return {
        defaultPrice: defaultPriceCents,
        currency: Currency.USD,
        dueDateDays: 30,
        matterTypePricing: {
          'Family Law': Math.round(defaultPriceCents * 1.33), // 33% more than default
          'Employment Law': Math.round(defaultPriceCents * 1.67), // 67% more than default
          'Personal Injury': Math.round(defaultPriceCents * 2.0), // 100% more than default
          'Business Law': Math.round(defaultPriceCents * 1.33), // 33% more than default
          'Criminal Law': Math.round(defaultPriceCents * 2.67), // 167% more than default
          'General Consultation': Math.round(defaultPriceCents * 0.67) // 33% less than default
        }
      };
    } catch (error) {
      console.warn('⚠️ Failed to load team payment config, using defaults:', error);
    }
    
    // Fallback default configuration
    return {
      defaultPrice: 7500, // $75.00 in cents
      currency: Currency.USD,
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
                'Accept': 'application/json'
              },
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Customer deletion failed: ${response.status} - ${errorText}`);
            }

            // Only parse JSON if there's a body (not 204 No Content)
            if (response.status === 204 || response.status === 205 || response.headers.get('Content-Length') === '0') {
              return null;
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
   * Helper method to create HMAC-based idempotency hash using Web Crypto API
   */
  private async hmacHex(secret: string, input: string): Promise<string> {
    if (!secret) {
      throw new Error('IDEMPOTENCY_SALT is required for secure hashing');
    }
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const inputData = encoder.encode(input);
    
    // Import the secret as a key for HMAC-SHA-256
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false, // not extractable
      ['sign']
    );
    
    // Sign the input data
    const signature = await crypto.subtle.sign('HMAC', key, inputData);
    const signatureArray = new Uint8Array(signature);
    
    // Convert to hex string and truncate to 32 characters
    const hashHex = Array.from(signatureArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return hashHex.slice(0, 32);
  }

  /**
   * Helper method to create a deterministic hash using HMAC for idempotency
   */
  private async createDeterministicHash(input: string): Promise<string> {
    const salt = this.env.IDEMPOTENCY_SALT;
    if (!salt) {
      throw new Error('IDEMPOTENCY_SALT environment variable is required');
    }
    
    return await this.hmacHex(salt, input);
  }

  /**
   * Helper method to create HMAC-based hash with fallback for missing secrets
   */
  private async createSecureHash(input: string, secretName: string, secretValue?: string): Promise<string> {
    if (!secretValue) {
      // Only use deterministic fallback in development environment
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (!isDevelopment) {
        throw new Error(`${secretName} is required but not configured. Cannot proceed without secure secret in production.`);
      }
      
      console.warn(`⚠️ ${secretName} is missing, using deterministic fallback (development only)`);
      // Use a constant fallback key derived from the secret name for consistency
      const fallbackKey = `fallback-${secretName}-${this.env.IDEMPOTENCY_SALT || 'default'}`;
      return await this.hmacHex(fallbackKey, input);
    }
    
    return await this.hmacHex(secretValue, input);
  }

  /**
   * Helper method to parse location string into address components
   */
  private parseLocation(location?: string): { city?: string; state?: string; zip?: string } {
    if (!location || typeof location !== 'string') {
      return {};
    }

    const trimmed = location.trim();
    if (!trimmed) {
      return {};
    }

    // Try to parse common location formats
    // Format: "City, State ZIP" or "City, State" or "City State ZIP"
    const patterns = [
      /^(.+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i, // "City, ST 12345"
      /^(.+),\s*([A-Z]{2})$/i, // "City, ST"
      /^(.+)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i, // "City ST 12345"
      /^(.+)$/i // Just city name
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const [, city, state, zip] = match;
        const result: { city?: string; state?: string; zip?: string } = {};
        
        if (city) result.city = city.trim();
        if (state) result.state = state.trim().toUpperCase();
        if (zip) result.zip = zip.trim();
        
        return result;
      }
    }

    // If no pattern matches, treat the whole string as city
    return { city: trimmed };
  }

  /**
   * Generates a deterministic idempotency key from customer data using HMAC
   */
  private async generateCustomerIdempotencyKey(customerData: CustomerCreateRequest): Promise<string> {
    // Create a canonical key based on customer data to prevent duplicates
    const keyData = {
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      team_id: customerData.team_id
    };
    
    // Use HMAC with payment-specific secret for secure hashing
    const keyString = JSON.stringify(keyData);
    const hash = await this.createSecureHash(keyString, 'PAYMENT_IDEMPOTENCY_SECRET', this.env.PAYMENT_IDEMPOTENCY_SECRET);
    return `customer-${hash}`;
  }

  /**
   * Generates a deterministic idempotency key from invoice data using HMAC
   */
  private async generateInvoiceIdempotencyKey(invoiceData: InvoiceCreateRequest): Promise<string> {
    // Create a canonical key based on invoice data to prevent duplicates
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
    
    // Use HMAC with payment-specific secret for secure hashing
    const keyString = JSON.stringify(keyData);
    const hash = await this.createSecureHash(keyString, 'PAYMENT_IDEMPOTENCY_SECRET', this.env.PAYMENT_IDEMPOTENCY_SECRET);
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
  ): Promise<InvoiceResult> {
    try {
      // Generate idempotency key if not provided
      const key = idempotencyKey || await this.generateInvoiceIdempotencyKey(invoiceData);
      
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
                'Idempotency-Key': key
              },
              body: JSON.stringify(invoiceData),
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorText = await response.text();
              const error = new Error(`Invoice creation failed: ${response.status} - ${errorText}`);
              // Add error code based on HTTP status
              (error as any).errorCode = response.status >= 500 ? 'SERVER_ERROR' :
                                        response.status === 401 ? 'AUTHENTICATION_ERROR' :
                                        response.status === 429 ? 'RATE_LIMIT_ERROR' :
                                        response.status >= 400 ? 'VALIDATION_ERROR' : 'UNKNOWN_ERROR';
              throw error;
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
      
      // Determine error code and if the error is indeterminate
      let errorCode: InvoiceErrorCode = 'UNKNOWN_ERROR';
      let isIndeterminate = false;
      
      if (error instanceof Error) {
        // Check for specific error types
        if (error.name === 'AbortError' || error.message.includes('aborted')) {
          errorCode = 'NETWORK_ABORT';
          isIndeterminate = true; // Network abort could still create invoice server-side
        } else if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
          errorCode = 'NETWORK_TIMEOUT';
          isIndeterminate = true; // Timeout could still create invoice server-side
        } else if ((error as any).errorCode) {
          errorCode = (error as any).errorCode;
          // Server errors and rate limits are indeterminate
          isIndeterminate = errorCode === 'SERVER_ERROR' || errorCode === 'RATE_LIMIT_ERROR';
        }
      }
      
      return {
        success: false,
        error: `Invoice creation failed: ${error instanceof Error ? error.message : String(error)}`,
        errorCode,
        isIndeterminate
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
      const locationInfo = this.parseLocation(paymentRequest.customerInfo.location);
      const customerData: CustomerCreateRequest = {
        name: paymentRequest.customerInfo.name,
        email: paymentRequest.customerInfo.email,
        phone: this.formatPhoneNumber(paymentRequest.customerInfo.phone),
        currency: paymentConfig.currency,
        status: 'Lead',
        team_id: teamUlid,
        // Only include address fields if we have real values
        ...(paymentRequest.customerInfo.location && { address_line_1: paymentRequest.customerInfo.location }),
        ...(locationInfo.city && { city: locationInfo.city }),
        ...(locationInfo.state && { state: locationInfo.state }),
        ...(locationInfo.zip && { zip: locationInfo.zip })
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
          // Conservative guard: Only delete customer if we're certain the invoice wasn't created
          // Network aborts, timeouts, and server errors could still create invoices server-side
          if (invoiceResult.isIndeterminate) {
            console.warn('⚠️ Invoice creation failed with indeterminate error - preserving customer to avoid data loss:', {
              customerId,
              errorCode: invoiceResult.errorCode,
              error: invoiceResult.error
            });
            
            return {
              success: false,
              error: `Invoice creation failed due to ${invoiceResult.errorCode?.toLowerCase().replace('_', ' ')}. Please check your payment status or contact support.`
            };
          }
          
          // Only attempt cleanup for deterministic failures (validation errors, auth errors)
          console.log('🔄 Invoice creation failed with deterministic error, attempting to delete orphaned customer:', customerId);
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
          'Accept': 'application/json'
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

  /**
   * Validates and normalizes consultation fee from team configuration
   * @param teamConsultationFee - The consultation fee from team config (can be any type)
   * @returns A valid number representing the consultation fee in dollars
   */
  private validateConsultationFee(teamConsultationFee: any): number {
    if (teamConsultationFee !== undefined && teamConsultationFee !== null) {
      const parsedFee = parseFloat(String(teamConsultationFee));
      if (isFinite(parsedFee) && parsedFee > 0) {
        return parsedFee;
      } else {
        console.warn('⚠️ Invalid consultation fee, using default $75.00:', teamConsultationFee);
      }
    }
    return 75.00; // Default fallback
  }
} 