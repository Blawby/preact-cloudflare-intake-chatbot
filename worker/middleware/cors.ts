/// <reference types="@cloudflare/workers-types" />

import { Env } from '../types';

// CORS configuration options
export interface CorsOptions {
  /** Allowed origins - use '*' for all origins or specific domains */
  allowedOrigins?: string | string[];
  /** Allowed HTTP methods */
  allowedMethods?: string[];
  /** Allowed headers */
  allowedHeaders?: string[];
  /** Whether to allow credentials */
  allowCredentials?: boolean;
  /** Max age for preflight cache */
  maxAge?: number;
  /** Whether to expose headers to the client */
  exposeHeaders?: string[];
}

// Default CORS configuration
const DEFAULT_CORS_OPTIONS: Required<CorsOptions> = {
  allowedOrigins: '*',
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  allowCredentials: false,
  maxAge: 86400, // 24 hours
  exposeHeaders: []
};

// Security headers following Cloudflare best practices
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

/**
 * Creates CORS headers based on the request and configuration
 */
function createCorsHeaders(request: Request, options: Required<CorsOptions>): Record<string, string> {
  const origin = request.headers.get('Origin');
  const headers: Record<string, string> = {};

  // Handle origin
  if (options.allowedOrigins === '*') {
    headers['Access-Control-Allow-Origin'] = '*';
  } else if (Array.isArray(options.allowedOrigins)) {
    if (origin && options.allowedOrigins.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
    } else {
      headers['Access-Control-Allow-Origin'] = options.allowedOrigins[0] || '*';
    }
  } else if (typeof options.allowedOrigins === 'string') {
    if (origin === options.allowedOrigins || options.allowedOrigins === '*') {
      headers['Access-Control-Allow-Origin'] = options.allowedOrigins;
    } else {
      headers['Access-Control-Allow-Origin'] = options.allowedOrigins;
    }
  }

  // Add other CORS headers
  headers['Access-Control-Allow-Methods'] = options.allowedMethods.join(', ');
  headers['Access-Control-Allow-Headers'] = options.allowedHeaders.join(', ');
  headers['Access-Control-Max-Age'] = options.maxAge.toString();

  if (options.allowCredentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  if (options.exposeHeaders.length > 0) {
    headers['Access-Control-Expose-Headers'] = options.exposeHeaders.join(', ');
  }

  return headers;
}

/**
 * CORS middleware wrapper for Cloudflare Workers
 * Handles preflight requests and adds CORS headers to all responses
 */
export function withCORS(
  handler: (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response> | Response,
  options: CorsOptions = {}
) {
  const corsOptions = { ...DEFAULT_CORS_OPTIONS, ...options };

  return async (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      const corsHeaders = createCorsHeaders(request, corsOptions);
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders,
          ...SECURITY_HEADERS
        }
      });
    }

    // Run the original handler
    const response = await handler(request, env, ctx);

    // Don't modify WebSocket upgrade responses (status 101)
    if (response.status === 101) {
      return response;
    }

    // Add CORS headers to the response
    const corsHeaders = createCorsHeaders(request, corsOptions);
    const newHeaders = new Headers(response.headers);

    // Add CORS headers
    for (const [key, value] of Object.entries(corsHeaders)) {
      newHeaders.set(key, value);
    }

    // Add security headers
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      if (key.toLowerCase() === 'vary') {
        newHeaders.append('Vary', value);
      } else {
        newHeaders.set(key, value);
      }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  };
}

/**
 * Production-ready CORS configuration for domain-restricted access
 * Use this for production environments where you want to restrict access to specific domains
 */
export function createProductionCorsOptions(allowedDomains: string[]): CorsOptions {
  return {
    allowedOrigins: allowedDomains,
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    allowCredentials: false,
    maxAge: 86400,
    exposeHeaders: []
  };
}

/**
 * Development CORS configuration that allows all origins
 * Use this for development environments
 */
export function createDevelopmentCorsOptions(): CorsOptions {
  return {
    allowedOrigins: '*',
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    allowCredentials: false,
    maxAge: 86400,
    exposeHeaders: []
  };
}

/**
 * Helper function to determine CORS configuration based on environment
 */
export function getCorsConfig(env: Env): CorsOptions {
  const isProduction = env.NODE_ENV === 'production';
  
  if (isProduction) {
    // In production, restrict to specific domains
    const allowedDomains = [
      'https://ai.blawby.com',
      'https://blawby.com',
      'https://www.blawby.com'
    ];
    return createProductionCorsOptions(allowedDomains);
  } else {
    // In development, allow all origins
    return createDevelopmentCorsOptions();
  }
}
