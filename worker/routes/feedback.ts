import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';
import { parseJsonBody } from '../utils';

export async function handleFeedback(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await parseJsonBody(request) as {
      sessionId: string;
      teamId?: string;
      rating?: number;
      thumbsUp?: boolean;
      comments?: string;
      intent?: string;
    };
    
    if (!body.sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate rating if provided
    if (body.rating !== undefined && (body.rating < 1 || body.rating > 5)) {
      return new Response(JSON.stringify({ error: 'Rating must be between 1 and 5' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const feedbackId = crypto.randomUUID();
    
    await env.DB.prepare(`
      INSERT INTO ai_feedback (id, session_id, team_id, rating, thumbs_up, comments, intent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      feedbackId,
      body.sessionId,
      body.teamId || null,
      body.rating || null,
      body.thumbsUp || null,
      body.comments || null,
      body.intent || null
    ).run();

    return new Response(JSON.stringify({
      success: true,
      feedbackId,
      message: 'Feedback submitted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Feedback error:', error);
    return new Response(JSON.stringify({ error: 'Feedback submission failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
} 