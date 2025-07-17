import type { Env } from '../types';
import { parseJsonBody } from '../utils';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';

export async function handleSessions(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Get session data
  if (path.startsWith('/api/sessions/') && request.method === 'GET') {
    try {
      const sessionId = path.split('/').pop();
      if (!sessionId) {
        throw HttpErrors.badRequest('Session ID required');
      }

      const sessionData = await env.CHAT_SESSIONS.get(sessionId);
      if (!sessionData) {
        throw HttpErrors.notFound('Session not found');
      }

      return new Response(sessionData, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return handleError(error, corsHeaders);
    }
  }

  // Save session data
  if (path === '/api/sessions' && request.method === 'POST') {
    try {
      const body = await parseJsonBody(request) as { sessionId: string; data: any };
      const { sessionId, data } = body;
      
      if (!sessionId || !data) {
        throw HttpErrors.badRequest('Session ID and data required');
      }

      // Store session data with TTL of 24 hours
      await env.CHAT_SESSIONS.put(sessionId, JSON.stringify(data), {
        expirationTtl: 24 * 60 * 60 // 24 hours in seconds
      });

      return createSuccessResponse({ success: true }, corsHeaders);

    } catch (error) {
      return handleError(error, corsHeaders);
    }
  }

  // Delete session data
  if (path.startsWith('/api/sessions/') && request.method === 'DELETE') {
    try {
      const sessionId = path.split('/').pop();
      if (!sessionId) {
        throw HttpErrors.badRequest('Session ID required');
      }

      await env.CHAT_SESSIONS.delete(sessionId);

      return createSuccessResponse({ success: true }, corsHeaders);

    } catch (error) {
      return handleError(error, corsHeaders);
    }
  }

  throw HttpErrors.notFound('Invalid session endpoint');
} 