import type { D1Database } from '@cloudflare/workers-types';
import { BlawbyApiService } from './BlawbyApiService';

interface Environment {
  DB?: D1Database;
  TEAM_SECRETS?: any;
  PAYMENT_API_KEY?: string;
  PAYMENT_API_URL?: string;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  location?: string;
}

interface MatterInfo {
  type: string;
  description: string;
  urgency: string;
  opposingParty?: string;
}

interface PaymentRequest {
  customerInfo: CustomerInfo;
  matterInfo: MatterInfo;
  teamId: string;
  sessionId: string;
  consultationFee?: number;
}

interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  invoiceUrl?: string;
  customerId?: string;
  error?: string;
}

export class BlawbyPaymentService {
  private blawbyApi: BlawbyApiService;
  private env?: Environment; // Database environment

  constructor(apiToken?: string, baseUrl?: string, env?: Environment) {
    this.blawbyApi = new BlawbyApiService(apiToken, baseUrl);
    this.env = env;
  }

  /**
   * Create a customer and invoice for payment
   */
  async createInvoice(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log('💰 [BLAWBY] Creating invoice for payment request:', paymentRequest);

      const { customerInfo, matterInfo, teamId } = paymentRequest;

      // First, check if customer already exists
      let customerResponse = await this.blawbyApi.getCustomerByEmail(teamId, customerInfo.email);
      let customerId: string;

      console.log('🔍 [BLAWBY] Customer search result:', customerResponse);

      if (customerResponse.success && customerResponse.data) {
        // Customer exists, use existing customer ID
        customerId = customerResponse.data.id;
        console.log('✅ [BLAWBY] Found existing customer:', customerId, customerResponse.data);
      } else {
        // Create new customer
        console.log('🔍 [BLAWBY] Creating new customer with info:', customerInfo);
        const createCustomerResponse = await this.blawbyApi.createCustomer(teamId, customerInfo);
        
        console.log('🔍 [BLAWBY] Create customer response:', createCustomerResponse);
        
        if (!createCustomerResponse.success) {
          console.error('❌ [BLAWBY] Failed to create customer:', createCustomerResponse.error);
          return {
            success: false,
            error: `Failed to create customer: ${createCustomerResponse.error}`,
          };
        }

        customerId = createCustomerResponse.data.data.id;
        console.log('✅ [BLAWBY] Created new customer:', customerId, createCustomerResponse.data.data);

        // Create a memo for the new customer with matter details
        const memoContent = `New client from intake form. Matter: ${matterInfo.type} - ${matterInfo.description}. Urgency: ${matterInfo.urgency}. Opposing party: ${matterInfo.opposingParty || 'Not specified'}.`;
        
        await this.blawbyApi.createCustomerMemo(teamId, customerId, memoContent);
      }

      // Create invoice for the customer
      const consultationFee = paymentRequest.consultationFee || 75; // Use team config or fallback to default
      const invoiceDescription = `Consultation fee for ${matterInfo.type} matter: ${matterInfo.description}`;
      
      console.log('🔍 [BLAWBY] Creating invoice for customer:', customerId);
      console.log('🔍 [BLAWBY] Invoice details:', { teamId, customerId, consultationFee, invoiceDescription });
      
      console.log('🟡 [DEBUG] About to create invoice. customerId:', customerId);
      const invoiceResponse = await this.blawbyApi.createInvoice(
        teamId,
        customerId,
        consultationFee,
        invoiceDescription
      );

      console.log('🔍 [BLAWBY] Create invoice response:', invoiceResponse);

      if (!invoiceResponse.success) {
        console.error('❌ [BLAWBY] Failed to create invoice:', invoiceResponse.error);
        return {
          success: false,
          error: `Failed to create invoice: ${invoiceResponse.error}`,
        };
      }

      const invoiceData = invoiceResponse.data.data;
      console.log('✅ [BLAWBY] Invoice created successfully:', invoiceData);

      const paymentResult = {
        success: true,
        paymentId: invoiceData.id,
        invoiceUrl: invoiceData.payment_link,
        customerId: customerId,
      };

      // Store payment history for audit compliance
      await this.storePaymentHistory(paymentRequest, paymentResult, consultationFee);

      return paymentResult;

    } catch (error) {
      console.error('❌ [BLAWBY] Error in createInvoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    try {
      console.log('💰 [BLAWBY] Checking payment status for:', paymentId);
      
      // This would need to be implemented based on the Blawby API
      // For now, we'll return a mock response
      return {
        success: true,
        paymentId,
        invoiceUrl: `https://app.blawby.com/pay/${paymentId}`,
      };
    } catch (error) {
      console.error('❌ [BLAWBY] Error getting payment status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

    /**
   * Store payment history in database for audit compliance
   */
  async storePaymentHistory(
    paymentRequest: PaymentRequest,
    paymentResult: PaymentResponse,
    consultationFee: number
  ): Promise<void> {
    try {
      console.log('💰 [BLAWBY] Storing payment history in database...');

      if (!this.env?.DB) {
        console.warn('⚠️ [BLAWBY] No database environment available, skipping payment history storage');
        return;
      }

      const { customerInfo, matterInfo, teamId } = paymentRequest;
      const { paymentId, invoiceUrl, customerId } = paymentResult;

      // Generate a unique ID for the payment history record
      const historyId = `ph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Prepare the payment history data
      const paymentHistoryData = {
        id: historyId,
        payment_id: paymentId || `temp_${Date.now()}`,
        team_id: teamId,
        customer_email: customerInfo.email,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone || '',
        amount: consultationFee * 100, // Convert to cents
        currency: 'USD',
        status: paymentResult.success ? 'pending' : 'failed',
        event_type: paymentResult.success ? 'payment.created' : 'payment.failed',
        matter_type: matterInfo.type,
        matter_description: matterInfo.description,
        invoice_url: invoiceUrl || null,
        metadata: JSON.stringify({
          customerId,
          sessionId: paymentRequest.sessionId,
          urgency: matterInfo.urgency,
          opposingParty: matterInfo.opposingParty,
          paymentMethod: 'blawby_api',
          consultationFee,
          originalRequest: paymentRequest,
          paymentResult
        }),
        notes: `Payment created via Blawby API. Matter: ${matterInfo.type} - ${matterInfo.description}. Urgency: ${matterInfo.urgency}.`
      };

      console.log('🔍 [BLAWBY] Payment history data:', paymentHistoryData);

      // Insert payment history into database
      const result = await this.env.DB.prepare(`
        INSERT INTO payment_history (
          id, payment_id, team_id, customer_email, customer_name, customer_phone,
          amount, currency, status, event_type, matter_type, matter_description,
          invoice_url, metadata, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        paymentHistoryData.id,
        paymentHistoryData.payment_id,
        paymentHistoryData.team_id,
        paymentHistoryData.customer_email,
        paymentHistoryData.customer_name,
        paymentHistoryData.customer_phone,
        paymentHistoryData.amount,
        paymentHistoryData.currency,
        paymentHistoryData.status,
        paymentHistoryData.event_type,
        paymentHistoryData.matter_type,
        paymentHistoryData.matter_description,
        paymentHistoryData.invoice_url,
        paymentHistoryData.metadata,
        paymentHistoryData.notes
      ).run();

      console.log('✅ [BLAWBY] Payment history stored successfully:', result);
    } catch (error) {
      console.error('❌ [BLAWBY] Failed to store payment history:', error);
      // Don't throw error to avoid breaking the payment flow
      // Just log it for debugging purposes
    }
  }
} 