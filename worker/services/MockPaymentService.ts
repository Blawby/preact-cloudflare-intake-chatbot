import type { Env } from '../types';
import { PaymentRequest, PaymentResponse } from './PaymentService';

export class MockPaymentService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async createInvoice(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log('💰 [MOCK] Creating invoice for payment request:', paymentRequest);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate mock payment ID and invoice URL
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const invoiceUrl = `https://app.blawby.com/pay/inv_${Date.now()}`;

      console.log('✅ [MOCK] Payment API response:', { paymentId, invoiceUrl });

      // Store payment history in database
      try {
        console.log('💰 [MOCK] Storing payment history in database...');
        
        // First check if the team exists
        const teamCheck = await this.env.DB.prepare(`
          SELECT id FROM teams WHERE id = ?
        `).bind(paymentRequest.teamId).first();
        
        if (!teamCheck) {
          console.warn('⚠️ [MOCK] Team not found in database, skipping payment history storage');
          console.warn('⚠️ [MOCK] Available teams:', await this.env.DB.prepare('SELECT id, slug FROM teams').all());
        } else {
          const result = await this.env.DB.prepare(`
            INSERT INTO payment_history (
              id, payment_id, team_id, customer_email, customer_name, customer_phone,
              amount, status, event_type, matter_type, matter_description, invoice_url,
              metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).bind(
            `ph_${Date.now()}`,
            paymentId,
            paymentRequest.teamId,
            paymentRequest.customerInfo.email,
            paymentRequest.customerInfo.name,
            paymentRequest.customerInfo.phone,
            5000, // Mock amount in cents ($50.00)
            'pending',
            'payment.created',
            paymentRequest.matterInfo.type,
            paymentRequest.matterInfo.description,
            invoiceUrl,
            JSON.stringify(paymentRequest)
          ).run();

          console.log('✅ [MOCK] Payment history stored in database:', result);
        }
      } catch (error) {
        console.error('❌ [MOCK] Failed to store payment history:', error);
        console.error('❌ [MOCK] Error details:', error.message);
      }

      return {
        success: true,
        invoiceUrl: invoiceUrl,
        paymentId: paymentId
      };

    } catch (error) {
      console.error('❌ [MOCK] Payment service error:', error);
      return {
        success: false,
        error: `Failed to create invoice: ${error.message}`
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    try {
      console.log('💰 [MOCK] Getting payment status for:', paymentId);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));

      // Mock different payment statuses based on payment ID
      const statuses = ['pending', 'completed', 'failed'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

      const invoiceUrl = `https://app.blawby.com/pay/inv_${paymentId.split('_')[1]}`;

      return {
        success: true,
        invoiceUrl: invoiceUrl,
        paymentId: paymentId,
        status: randomStatus
      };

    } catch (error) {
      console.error('❌ [MOCK] Payment status check error:', error);
      return {
        success: false,
        error: `Failed to check payment status: ${error.message}`
      };
    }
  }
} 