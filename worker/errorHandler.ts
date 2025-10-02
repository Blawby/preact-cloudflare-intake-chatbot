import { HttpError, ApiResponse } from './types';
import { ZodError } from 'zod';

// Structured logging for better observability
export function logError(error: unknown, context: Record<string, any> = {}) {
  const errorData = {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString(),
    worker: 'blawby-ai-chatbot'
  };
  
  console.error(JSON.stringify(errorData));
}

// Centralized error handler with enhanced features
export function handleError(error: unknown): Response {
  logError(error, { endpoint: 'unknown' });

  let status = 500;
  let message = 'Internal server error';
  let details: any = undefined;
  let errorCode = 'INTERNAL_ERROR';

  if (error instanceof HttpError) {
    status = error.status;
    message = error.message;
    details = error.details;
    errorCode = `HTTP_${status}`;
  } else if (error instanceof ZodError) {
    status = 400;
    message = 'Validation error';
    details = error.errors;
    errorCode = 'VALIDATION_ERROR';
  } else if (error instanceof SyntaxError) {
    status = 400;
    message = 'Invalid JSON format';
    errorCode = 'INVALID_JSON';
  } else if (error instanceof Error) {
    message = error.message;
    errorCode = 'GENERIC_ERROR';
  }

  const response: ApiResponse = {
    success: false,
    error: message,
    errorCode,
    ...(details && { details })
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// Helper function to create HTTP errors
export function createHttpError(status: number, message: string, details?: any): HttpError {
  return new HttpError(status, message, details);
}

// Common HTTP error helpers
export const HttpErrors = {
  badRequest: (message: string, details?: any) => createHttpError(400, message, details),
  unauthorized: (message: string = 'Unauthorized', details?: any) => createHttpError(401, message, details),
  forbidden: (message: string = 'Forbidden', details?: any) => createHttpError(403, message, details),
  notFound: (message: string = 'Not found', details?: any) => createHttpError(404, message, details),
  methodNotAllowed: (message: string = 'Method not allowed', details?: any) => createHttpError(405, message, details),
  payloadTooLarge: (message: string = 'Payload too large', details?: any) => createHttpError(413, message, details),
  conflict: (message: string, details?: any) => createHttpError(409, message, details),
  unprocessableEntity: (message: string, details?: any) => createHttpError(422, message, details),
  tooManyRequests: (message: string = 'Too many requests', details?: any) => createHttpError(429, message, details),
  internalServerError: (message: string = 'Internal server error', details?: any) => createHttpError(500, message, details),
  serviceUnavailable: (message: string = 'Service unavailable', details?: any) => createHttpError(503, message, details)
};

// Success response helper
export function createSuccessResponse<T>(data: T): Response {
  const response: ApiResponse<T> = {
    success: true,
    data
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// Rate limiting helper (basic implementation)
export function createRateLimitResponse(): Response {
  const response: ApiResponse = {
    success: false,
    error: 'Too many requests',
    errorCode: 'RATE_LIMIT_EXCEEDED'
  };

  return new Response(JSON.stringify(response), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': '60'
    }
  });
} 