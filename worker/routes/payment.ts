import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';
import { parseJsonBody } from '../utils';
import { PaymentService } from '../services/PaymentService';
import { PaymentRequest } from '../schemas';
import { MockPaymentService } from '../services/MockPaymentService';

export async function handlePayment(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // POST /api/payment/create-invoice - Create payment invoice
  if (path === '/api/payment/create-invoice' && request.method === 'POST') {
    try {
      const body = await parseJsonBody(request) as PaymentRequest;

      // Validate required fields
      if (!body.customerInfo?.name || !body.customerInfo?.email || !body.customerInfo?.phone) {
        throw HttpErrors.badRequest('Missing required customer information');
      }

      if (!body.matterInfo?.type || !body.matterInfo?.description) {
        throw HttpErrors.badRequest('Missing required matter information');
      }

      if (!body.teamId) {
        throw HttpErrors.badRequest('Missing team ID');
      }

      // Use real service for staging.blawby.com, mock for localhost
      const isDevelopment = env.BLAWBY_API_URL?.includes('localhost');
      const paymentService = isDevelopment ? new MockPaymentService(env) : new PaymentService(env);
      const result = await paymentService.createInvoice(body);

      if (!result.success) {
        return new Response(JSON.stringify({
          success: false,
          error: result.error
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return createSuccessResponse({
        success: true,
        invoiceUrl: result.invoiceUrl,
        paymentId: result.paymentId
      });

    } catch (error) {
      return handleError(error);
    }
  }

  // GET /api/payment/status/:paymentId - Get payment status
  if (path.startsWith('/api/payment/status/') && request.method === 'GET') {
    try {
      const paymentId = path.split('/').pop();
      
      if (!paymentId) {
        throw HttpErrors.badRequest('Payment ID is required');
      }

      // Use real service for staging.blawby.com, mock for localhost
      const isDevelopment = env.BLAWBY_API_URL?.includes('localhost');
      const paymentService = isDevelopment ? new MockPaymentService(env) : new PaymentService(env);
      const result = await paymentService.getPaymentStatus(paymentId);

      if (!result.success) {
        return new Response(JSON.stringify({
          success: false,
          error: result.error
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return createSuccessResponse({
        success: true,
        invoiceUrl: result.invoiceUrl,
        paymentId: result.paymentId
      });

    } catch (error) {
      return handleError(error);
    }
  }

  // GET /api/payment/history - Get payment history for a user or team
  if (path === '/api/payment/history' && request.method === 'GET') {
    try {
      const url = new URL(request.url);
      const teamId = url.searchParams.get('teamId');
      const customerEmail = url.searchParams.get('customerEmail');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      if (!teamId && !customerEmail) {
        throw HttpErrors.badRequest('Either teamId or customerEmail is required');
      }

      let query = 'SELECT * FROM payment_history';
      let params: any[] = [];
      const conditions = [];

      if (teamId) {
        conditions.push('team_id = ?');
        params.push(teamId);
      }

      if (customerEmail) {
        conditions.push('customer_email = ?');
        params.push(customerEmail);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const stmt = env.DB.prepare(query);
      const results = await stmt.bind(...params).all();

      return createSuccessResponse({
        success: true,
        payments: results.results,
        count: results.results.length,
        pagination: {
          limit,
          offset,
          hasMore: results.results.length === limit
        }
      });

    } catch (error) {
      return handleError(error);
    }
  }

  // GET /api/payment/stats - Get payment statistics
  if (path === '/api/payment/stats' && request.method === 'GET') {
    try {
      const url = new URL(request.url);
      const teamId = url.searchParams.get('teamId');
      const period = url.searchParams.get('period') || '30'; // days

      let query = `
        SELECT 
          COUNT(*) as total_payments,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_payments,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_payments,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_payments,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_payments,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue
        FROM payment_history
        WHERE created_at >= datetime('now', '-${period} days')
      `;

      let params: any[] = [];

      if (teamId) {
        query += ' AND team_id = ?';
        params.push(teamId);
      }

      const stats = await env.DB.prepare(query).bind(...params).first();

      return createSuccessResponse({
        success: true,
        stats: stats,
        period: `${period} days`
      });

    } catch (error) {
      return handleError(error);
    }
  }

  // GET /api/payment/:paymentId - Get specific payment details
  if (path.startsWith('/api/payment/') && path.split('/').length === 4 && request.method === 'GET') {
    try {
      const paymentId = path.split('/')[3];
      
      if (!paymentId) {
        throw HttpErrors.badRequest('Payment ID is required');
      }

      const payment = await env.DB.prepare(`
        SELECT * FROM payment_history WHERE payment_id = ?
      `).bind(paymentId).first();

      if (!payment) {
        throw HttpErrors.notFound('Payment not found');
      }

      return createSuccessResponse({
        success: true,
        payment: payment
      });

    } catch (error) {
      return handleError(error);
    }
  }

  // PUT /api/payment/:paymentId - Update payment status
  if (path.startsWith('/api/payment/') && path.split('/').length === 4 && request.method === 'PUT') {
    try {
      const paymentId = path.split('/')[3];
      const body = await parseJsonBody(request);
      
      if (!paymentId) {
        throw HttpErrors.badRequest('Payment ID is required');
      }

      const { status, notes } = body;

      if (!status) {
        throw HttpErrors.badRequest('Status is required');
      }

      await env.DB.prepare(`
        UPDATE payment_history 
        SET status = ?, notes = ?, updated_at = datetime('now')
        WHERE payment_id = ?
      `).bind(status, notes || null, paymentId).run();

      return createSuccessResponse({
        success: true,
        message: 'Payment status updated successfully'
      });

    } catch (error) {
      return handleError(error);
    }
  }

  // DELETE /api/payment/:paymentId - Cancel/refund payment
  if (path.startsWith('/api/payment/') && path.split('/').length === 4 && request.method === 'DELETE') {
    try {
      const paymentId = path.split('/')[3];
      
      if (!paymentId) {
        throw HttpErrors.badRequest('Payment ID is required');
      }

      await env.DB.prepare(`
        UPDATE payment_history 
        SET status = 'cancelled', updated_at = datetime('now')
        WHERE payment_id = ?
      `).bind(paymentId).run();

      return createSuccessResponse({
        success: true,
        message: 'Payment cancelled successfully'
      });

    } catch (error) {
      return handleError(error);
    }
  }

  // POST /api/payment/webhook - Handle payment webhooks from payment processor
  if (path === '/api/payment/webhook' && request.method === 'POST') {
    try {
      const body = await parseJsonBody(request);
      
      console.log('💰 Payment webhook received:', body);

      // Validate webhook signature if needed
      // const signature = request.headers.get('x-blawby-signature');
      // if (!signature || !validateWebhookSignature(body, signature, env.WEBHOOK_SECRET)) {
      //   throw HttpErrors.unauthorized('Invalid webhook signature');
      // }

      // Handle different webhook events
      const eventType = body.eventType;
      const paymentId = body.paymentId;
      const status = body.status;
      const amount = body.amount || 0;
      const customerEmail = body.customerEmail || '';

      // Store payment history
      await env.DB.prepare(`
        INSERT INTO payment_history (
          payment_id, team_id, customer_email, amount, status, 
          event_type, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(payment_id) DO UPDATE SET
          status = ?, updated_at = datetime('now')
      `).bind(
        paymentId,
        body.teamId || 'unknown',
        customerEmail,
        amount,
        status,
        eventType,
        JSON.stringify(body),
        status
      ).run();

      switch (eventType) {
        case 'payment.completed':
          // Update matter status to paid
          await env.DB.prepare(`
            UPDATE matters 
            SET status = 'active', 
                custom_fields = json_set(custom_fields, '$.paymentStatus', ?, '$.paymentId', ?)
            WHERE custom_fields->>'$.paymentId' = ?
          `).bind(status, paymentId, paymentId).run();
          
          console.log('✅ Payment completed for payment ID:', paymentId);
          break;

        case 'payment.failed':
          // Update matter status to payment failed
          await env.DB.prepare(`
            UPDATE matters 
            SET status = 'lead',
                custom_fields = json_set(custom_fields, '$.paymentStatus', ?, '$.paymentId', ?)
            WHERE custom_fields->>'$.paymentId' = ?
          `).bind(status, paymentId, paymentId).run();
          
          console.log('❌ Payment failed for payment ID:', paymentId);
          break;

        case 'payment.refunded':
          // Update matter status to refunded
          await env.DB.prepare(`
            UPDATE matters 
            SET status = 'lead',
                custom_fields = json_set(custom_fields, '$.paymentStatus', ?, '$.paymentId', ?)
            WHERE custom_fields->>'$.paymentId' = ?
          `).bind(status, paymentId, paymentId).run();
          
          console.log('🔄 Payment refunded for payment ID:', paymentId);
          break;

        default:
          console.log('📝 Unhandled payment webhook event type:', eventType);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('❌ Payment webhook error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Payment webhook processing failed' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Handle unknown payment endpoints
  if (path.startsWith('/api/payment/')) {
    throw HttpErrors.notFound('Payment endpoint not found');
  }
  
  throw HttpErrors.notFound('Payment endpoint not found');
} 