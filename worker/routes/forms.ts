import type { Env } from '../types';
import { parseJsonBody } from '../utils';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';

export async function handleForms(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    throw HttpErrors.methodNotAllowed('Only POST method is allowed');
  }

  try {
    const body = await parseJsonBody(request);
    
    // Simplified form handling - just log for now since agent handles collection
    console.log('Form submission received:', body);

    return createSuccessResponse({
      message: 'Form received. The agent will handle your request.'
    }, corsHeaders);

  } catch (error) {
    return handleError(error, corsHeaders);
  }
} 