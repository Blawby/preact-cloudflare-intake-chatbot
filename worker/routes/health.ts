import type { Env } from '../types';
import { createSuccessResponse } from '../errorHandler';

export async function handleHealth(request: Request, env: Env): Promise<Response> {
  return createSuccessResponse({ status: 'ok' });
} 