import { PaymentService } from './PaymentService.js';
import { MockPaymentService } from './MockPaymentService.js';
import type { Env } from '../types.js';
import type { Organization } from './OrganizationService.js';
import type { PaymentRequest, PaymentResponse } from '../schemas/payment.js';

export class PaymentServiceFactory {
  /**
   * Creates the appropriate payment service based on environment configuration
   */
  static createPaymentService(env: Env): PaymentService | MockPaymentService {
    const hasApiToken = env.BLAWBY_API_TOKEN && 
                       env.BLAWBY_API_TOKEN !== 'your_resend_api_key_here' &&
                       env.BLAWBY_API_TOKEN !== 'your_blawby_api_token_here';
    
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
    organizationConfig: Organization | null
  ): Promise<{ invoiceUrl: string | null; paymentId: string | null }> {
    const requiresPayment = organizationConfig?.config?.requiresPayment || false;
    const consultationFee = organizationConfig?.config?.consultationFee || 0;
    const paymentLink = organizationConfig?.config?.paymentLink || null;

    if (!requiresPayment || consultationFee <= 0) {
      return { invoiceUrl: null, paymentId: null };
    }

    try {
      const paymentService = this.createPaymentService(env);
      const paymentResult: PaymentResponse = await paymentService.createInvoice(paymentRequest);

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
        console.error('   Payment service returned error - falling back to organization payment link');
        console.error('   Organization payment link:', paymentLink);
        return { invoiceUrl: paymentLink, paymentId: null };
      }
    } catch (error) {
      console.error('❌ Payment service error:', error);
      console.error('   Payment service threw exception - falling back to organization payment link');
      console.error('   Organization payment link:', paymentLink);
      return { invoiceUrl: paymentLink, paymentId: null };
    }
  }
}
