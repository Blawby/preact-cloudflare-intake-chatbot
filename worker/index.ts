/// <reference types="@cloudflare/workers-types" />

import { handleAgent, handleAgentStream } from './routes/agent';
import { handleTeams } from './routes/teams';
import { handleForms } from './routes/forms';
import { handleScheduling } from './routes/scheduling';
import { handleFiles } from './routes/files';
import { handleWebhooks } from './routes/webhooks';
import { handleReview } from './routes/review';
import { handlePayment } from './routes/payment';
import { handleTeamSecrets } from './routes/team-secrets';
import { handleHealth } from './routes/health';
import { handleRoot } from './routes/root';
import { Env } from './types';
import { handleError, HttpErrors, CORS_HEADERS, SECURITY_HEADERS } from './errorHandler';

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
    if (!contentType || !contentType.includes('application/json')) {
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
    
    if (path === '/api/agent/stream') {
      console.log('✅ Matched streaming route');
      response = await handleAgentStream(request, env, CORS_HEADERS);
    } else if (path.startsWith('/api/agent')) {
      console.log('✅ Matched regular agent route');
      response = await handleAgent(request, env, CORS_HEADERS);
    } else if (path.startsWith('/api/teams')) {
      response = await handleTeams(request, env, CORS_HEADERS);
    } else if (path.startsWith('/api/team-secrets')) {
      response = await handleTeamSecrets(request, env, CORS_HEADERS);
    } else if (path.startsWith('/api/forms')) {
      response = await handleForms(request, env, CORS_HEADERS);
    } else if (path.startsWith('/api/scheduling')) {
      response = await handleScheduling(request, env, CORS_HEADERS);
    } else if (path.startsWith('/api/files')) {
      response = await handleFiles(request, env, CORS_HEADERS);
    } else if (path.startsWith('/api/webhooks')) {
      response = await handleWebhooks(request, env, CORS_HEADERS);
    } else if (path.startsWith('/api/review')) {
      response = await handleReview(request, env, CORS_HEADERS);
    } else if (path.startsWith('/api/payment')) {
      response = await handlePayment(request, env, CORS_HEADERS);
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