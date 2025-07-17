import { Env } from './health';
import { parseJsonBody } from '../utils';

export async function handleSessions(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Get session data
  if (path.startsWith('/api/sessions/') && request.method === 'GET') {
    try {
      const sessionId = path.split('/').pop();
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Session ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const sessionData = await env.CHAT_SESSIONS.get(sessionId);
      if (!sessionData) {
        return new Response(JSON.stringify({ error: 'Session not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(sessionData, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Session retrieval error:', error);
      return new Response(JSON.stringify({ error: 'Session retrieval failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Save session data
  if (path === '/api/sessions' && request.method === 'POST') {
    try {
      const body = await parseJsonBody(request) as { sessionId: string; data: any };
      const { sessionId, data } = body;
      
      if (!sessionId || !data) {
        return new Response(JSON.stringify({ error: 'Session ID and data required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Store session data with TTL of 24 hours
      await env.CHAT_SESSIONS.put(sessionId, JSON.stringify(data), {
        expirationTtl: 24 * 60 * 60 // 24 hours in seconds
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Session save error:', error);
      return new Response(JSON.stringify({ error: 'Session save failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Delete session data
  if (path.startsWith('/api/sessions/') && request.method === 'DELETE') {
    try {
      const sessionId = path.split('/').pop();
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Session ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await env.CHAT_SESSIONS.delete(sessionId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Session deletion error:', error);
      return new Response(JSON.stringify({ error: 'Session deletion failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Invalid session endpoint' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
} 