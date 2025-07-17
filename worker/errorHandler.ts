import { HttpError, ApiResponse } from './types';
import { ZodError } from 'zod';

// Centralized error handler
export function handleError(error: unknown, corsHeaders: Record<string, string>): Response {
  console.error('Worker error:', error);

  let status = 500;
  let message = 'Internal server error';
  let details: any = undefined;

  if (error instanceof HttpError) {
    status = error.status;
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    status = 400;
    message = 'Validation error';
    details = error.errors;
  } else if (error instanceof Error) {
    message = error.message;
  }

  const response: ApiResponse = {
    success: false,
    error: message,
    ...(details && { details })
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
  conflict: (message: string, details?: any) => createHttpError(409, message, details),
  unprocessableEntity: (message: string, details?: any) => createHttpError(422, message, details),
  tooManyRequests: (message: string = 'Too many requests', details?: any) => createHttpError(429, message, details),
  internalServerError: (message: string = 'Internal server error', details?: any) => createHttpError(500, message, details),
  serviceUnavailable: (message: string = 'Service unavailable', details?: any) => createHttpError(503, message, details)
};

// Success response helper
export function createSuccessResponse<T>(data: T, corsHeaders: Record<string, string>): Response {
  const response: ApiResponse<T> = {
    success: true,
    data
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
} 