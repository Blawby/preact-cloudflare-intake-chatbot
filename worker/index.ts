/// <reference types="@cloudflare/workers-types" />

import {
  handleHealth,
  handleRoot,
  handleAgent,
  handleAgentStream,
  handleForms,
  handleTeams,
  handleScheduling,
  handleFiles,
  handleReview,
  handlePayment,
  handleDebug
} from './routes';
import { CORS_HEADERS, SECURITY_HEADERS, createRateLimitResponse } from './errorHandler';
import { Env } from './types';
import { handleError, HttpErrors } from './errorHandler';

// Basic request validation
function validateRequest(request: Request): boolean {
  const url = new URL(request.url);
  
  // Check for reasonable request size (10MB limit)
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    return false;
  }
  
  // Check for valid content type on POST requests
  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type');
    if (!contentType) {
      return false;
    }
    // Allow both JSON and multipart/form-data for file uploads
    if (!contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
      return false;
    }
  }
  
  return true;
}

export async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      headers: { ...CORS_HEADERS, ...SECURITY_HEADERS } 
    });
  }

  // Basic request validation
  if (!validateRequest(request)) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid request',
      errorCode: 'INVALID_REQUEST'
    }), {
      status: 400,
      headers: { ...CORS_HEADERS, ...SECURITY_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Route handling with enhanced error context
    let response: Response;
    
    console.log('🔍 Route matching for path:', path);
    
    // Handle payment pages with proper security headers
    if (path.startsWith('/pay/')) {
      console.log('✅ Matched payment route');
      const paymentId = path.replace('/pay/', '');
      
      // Create a simple payment page with proper CSP headers
      const paymentPage = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment - ${paymentId}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
            .payment-form { border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
            button { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
            button:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <h1>Payment Form</h1>
          <p>Payment ID: <strong>${paymentId}</strong></p>
          <div class="payment-form">
            <form>
              <div class="form-group">
                <label for="name">Full Name</label>
                <input type="text" id="name" name="name" required>
              </div>
              <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required>
              </div>
              <div class="form-group">
                <label for="card">Card Number</label>
                <input type="text" id="card" name="card" placeholder="1234 5678 9012 3456" required>
              </div>
              <div class="form-group">
                <label for="expiry">Expiry Date</label>
                <input type="text" id="expiry" name="expiry" placeholder="MM/YY" required>
              </div>
              <div class="form-group">
                <label for="cvv">CVV</label>
                <input type="text" id="cvv" name="cvv" placeholder="123" required>
              </div>
              <button type="submit">Pay $75.00</button>
            </form>
          </div>
          <script>
            // Handle form submission
            document.querySelector('form').addEventListener('submit', function(e) {
              e.preventDefault();
              alert('Payment processing... (This is a demo)');
            });
          </script>
        </body>
        </html>
      `;
      
      return new Response(paymentPage, {
        status: 200,
        headers: { 
          ...SECURITY_HEADERS,
          'Content-Type': 'text/html;charset=utf-8'
        }
      });
    }
    
    if (path === '/api/agent/stream') {
      console.log('✅ Matched streaming route');
      response = await handleAgentStream(request, env, CORS_HEADERS);
    } else if (path.startsWith('/api/agent')) {
      console.log('✅ Matched regular agent route');
      response = await handleAgent(request, env, CORS_HEADERS);
    } else if (path === '/api/chat') {
      console.log('✅ Matched chat route');
      response = await handleAgent(request, env, CORS_HEADERS);
    } else if (path.startsWith('/api/teams')) {
      response = await handleTeams(request, env, CORS_HEADERS);
    } else if (path.startsWith('/api/forms')) {
      response = await handleForms(request, env, CORS_HEADERS);
    } else if (path.startsWith('/api/scheduling')) {
      response = await handleScheduling(request, env, CORS_HEADERS);
    } else if (path.startsWith('/api/files')) {
      response = await handleFiles(request, env, CORS_HEADERS);

    } else if (path.startsWith('/api/review')) {
      response = await handleReview(request, env, CORS_HEADERS);
    } else if (path.startsWith('/api/payment')) {
      response = await handlePayment(request, env, CORS_HEADERS);
    } else if (path.startsWith('/api/debug')) {
      response = await handleDebug(request, env, CORS_HEADERS);
    } else if (path === '/api/health') {
      response = await handleHealth(request, env, CORS_HEADERS);
    } else if (path === '/') {
      response = await handleRoot(request, env);
    } else {
      console.log('❌ No route matched');
      throw HttpErrors.notFound('Endpoint not found');
    }

    // Add security headers to all responses
    const headers = new Headers(response.headers);
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });

  } catch (error) {
    return handleError(error, CORS_HEADERS);
  }
}

export default { fetch: handleRequest };