/// <reference types="@cloudflare/workers-types" />

import {
  handleHealth,
  handleRoot,
  handleAgentStream,
  handleForms,
  handleTeams,
  handleMessages,
  handleSessions,

  handleFiles,
  handleAnalyze,
  handleReview,
  handlePayment,
  handlePDF,
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
    
    if (path === '/api/agent/stream') {
      console.log('✅ Matched agent route');
      response = await handleAgentStream(request, env);
    } else if (path.startsWith('/api/teams')) {
      response = await handleTeams(request, env);
    } else if (path.startsWith('/api/messages')) {
      response = await handleMessages(request, env);
    } else if (path.startsWith('/api/sessions')) {
      response = await handleSessions(request, env);
    } else if (path.startsWith('/api/forms')) {
      response = await handleForms(request, env);

    } else if (path.startsWith('/api/files')) {
      response = await handleFiles(request, env);
    } else if (path === '/api/analyze') {
      response = await handleAnalyze(request, env);
    } else if (path.startsWith('/api/review')) {
      response = await handleReview(request, env);
    } else if (path.startsWith('/api/payment')) {
      response = await handlePayment(request, env);
    } else if (path.startsWith('/api/pdf')) {
      response = await handlePDF(request, env);
    } else if (path.startsWith('/api/debug')) {
      response = await handleDebug(request, env);
    } else if (path === '/api/health') {
      response = await handleHealth(request, env);
    } else if (path === '/') {
      response = await handleRoot(request, env);
    } else {
      console.log('❌ No route matched');
      throw HttpErrors.notFound('Endpoint not found');
    }

    // Don't reconstruct 101 Switching Protocols responses as it breaks WebSocket upgrades
    if (response.status === 101) {
      return response;
    }

    // Add CORS and security headers to all other responses centrally
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      if (key.toLowerCase() === 'vary') {
        headers.append('Vary', value);
      } else {
        headers.set(key, value);
      }
    }
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      if (key.toLowerCase() === 'vary') {
        headers.append('Vary', value);
      } else {
        headers.set(key, value);
      }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });

  } catch (error) {
    const errResp = handleError(error);
    if (errResp.status === 101) {
      return errResp;
    }
    const headers = new Headers(errResp.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      if (key.toLowerCase() === 'vary') headers.append('Vary', value);
      else headers.set(key, value);
    }
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      if (key.toLowerCase() === 'vary') headers.append('Vary', value);
      else headers.set(key, value);
    }
    return new Response(errResp.body, {
      status: errResp.status,
      statusText: errResp.statusText,
      headers
    });
  }
}

export default { fetch: handleRequest };

// Export Durable Object classes (none currently)