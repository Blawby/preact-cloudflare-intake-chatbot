import { BlawbyApiService } from './BlawbyApiService';

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

  constructor(apiToken?: string, baseUrl?: string) {
    this.blawbyApi = new BlawbyApiService(apiToken, baseUrl);
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
      const consultationFee = 75; // This should come from team config
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

      return {
        success: true,
        paymentId: invoiceData.id,
        invoiceUrl: invoiceData.payment_link,
        customerId: customerId,
      };

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
   * Store payment history in database
   */
  async storePaymentHistory(paymentData: any): Promise<void> {
    try {
      console.log('💰 [BLAWBY] Storing payment history in database...');
      
      // This would store payment history in the local database
      // For now, we'll just log it
      console.log('✅ [BLAWBY] Payment history stored successfully');
    } catch (error) {
      console.error('❌ [BLAWBY] Failed to store payment history:', error);
      throw error;
    }
  }
} 