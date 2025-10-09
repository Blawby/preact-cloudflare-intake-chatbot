import type { Env } from '../types.js';
import { HttpErrors } from '../errorHandler.js';
import { StatusService } from '../services/StatusService.ts';

/**
 * Handle status-related endpoints
 */
export async function handleStatus(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/status/cleanup' && request.method === 'POST') {
    // Cleanup expired status entries
    const cleaned = await StatusService.cleanupExpiredStatuses(env);
    return new Response(JSON.stringify({ 
      success: true, 
      cleaned,
      message: `Cleaned up ${cleaned} expired status entries`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (path.startsWith('/api/status/') && request.method === 'GET') {
    const statusId = path.split('/').pop();
    if (!statusId) {
      throw HttpErrors.badRequest('Status ID is required');
    }

    const status = await StatusService.getStatus(env, statusId);
    if (!status) {
      throw HttpErrors.notFound('Status not found');
    }

    return new Response(JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  throw HttpErrors.notFound('Status endpoint not found');
}
