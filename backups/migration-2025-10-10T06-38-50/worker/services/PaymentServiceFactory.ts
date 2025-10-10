import { PaymentService } from './PaymentService.js';
import { MockPaymentService } from './MockPaymentService.js';
import type { Env } from '../types.js';
import type { Team } from './TeamService.js';

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
    opposingParty: string;
  };
  teamId: string;
  sessionId: string;
}

export interface PaymentResult {
  success: boolean;
  invoiceUrl?: string;
  paymentId?: string;
  error?: string;
}

export class PaymentServiceFactory {
  /**
   * Creates the appropriate payment service based on environment configuration
   */
  static createPaymentService(env: Env): PaymentService | MockPaymentService {
    const hasApiToken = env.BLAWBY_API_TOKEN && env.BLAWBY_API_TOKEN !== 'your_resend_api_key_here';
    
    if (hasApiToken) {
      return new PaymentService(env);
    } else {
      return new MockPaymentService(env);
    }
  }

  /**
   * Processes payment with fallback logic
   */
  static async processPayment(
    env: Env, 
    paymentRequest: PaymentRequest, 
    teamConfig: Team | null
  ): Promise<{ invoiceUrl: string | null; paymentId: string | null }> {
    const requiresPayment = teamConfig?.config?.requiresPayment || false;
    const consultationFee = teamConfig?.config?.consultationFee || 0;
    const paymentLink = teamConfig?.config?.paymentLink || null;

    if (!requiresPayment || consultationFee <= 0) {
      return { invoiceUrl: null, paymentId: null };
    }

    try {
      const paymentService = this.createPaymentService(env);
      const paymentResult = await paymentService.createInvoice(paymentRequest);

      if (paymentResult.success) {
        console.log('✅ Invoice created successfully:', { 
          invoiceUrl: paymentResult.invoiceUrl, 
          paymentId: paymentResult.paymentId 
        });
        return { 
          invoiceUrl: paymentResult.invoiceUrl || null, 
          paymentId: paymentResult.paymentId || null 
        };
      } else {
        console.error('❌ Failed to create invoice:', paymentResult.error);
        console.error('   Payment service returned error - falling back to team payment link');
        console.error('   Team payment link:', paymentLink);
        return { invoiceUrl: paymentLink, paymentId: null };
      }
    } catch (error) {
      console.error('❌ Payment service error:', error);
      console.error('   Payment service threw exception - falling back to team payment link');
      console.error('   Team payment link:', paymentLink);
      return { invoiceUrl: paymentLink, paymentId: null };
    }
  }
}
