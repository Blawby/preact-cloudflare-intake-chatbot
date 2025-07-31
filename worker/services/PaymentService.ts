import type { Env } from '../types';

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
  error?: string;
}

export class PaymentService {
  private env: Env;
  private mcpServerUrl: string;

  constructor(env: Env) {
    this.env = env;
    // For development, use a mock endpoint. In production, this should point to the real Blawby API
    this.mcpServerUrl = env.PAYMENT_API_URL || 'http://localhost:3000/api/payment';
  }

  async createInvoice(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log('💰 Creating invoice for payment request:', paymentRequest);

      const payload = {
        customer: {
          name: paymentRequest.customerInfo.name,
          email: paymentRequest.customerInfo.email,
          phone: paymentRequest.customerInfo.phone,
          location: paymentRequest.customerInfo.location
        },
        matter: {
          type: paymentRequest.matterInfo.type,
          description: paymentRequest.matterInfo.description,
          urgency: paymentRequest.matterInfo.urgency,
          opposingParty: paymentRequest.matterInfo.opposingParty || ''
        },
        teamId: paymentRequest.teamId,
        sessionId: paymentRequest.sessionId,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(this.mcpServerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.PAYMENT_API_KEY || ''}`,
          'User-Agent': 'Blawby-Legal-Intake/1.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Payment API error:', response.status, errorText);
        return {
          success: false,
          error: `Payment service error: ${response.status} - ${errorText}`
        };
      }

      const result = await response.json();
      console.log('✅ Payment API response:', result);

      return {
        success: true,
        invoiceUrl: result.invoiceUrl,
        paymentId: result.paymentId
      };

    } catch (error) {
      console.error('❌ Payment service error:', error);
      return {
        success: false,
        error: `Failed to create invoice: ${error.message}`
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/status/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.env.PAYMENT_API_KEY || ''}`,
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
        invoiceUrl: result.invoiceUrl,
        paymentId: result.paymentId
      };

    } catch (error) {
      console.error('❌ Payment status check error:', error);
      return {
        success: false,
        error: `Failed to check payment status: ${error.message}`
      };
    }
  }
} 