import { ActivityService, type ActivityEvent } from '../services/ActivityService';
import { SessionService } from '../services/SessionService';
import { rateLimit, getClientId } from '../middleware/rateLimit';
import { HttpErrors } from '../errorHandler';
import { parseJsonBody } from '../utils';
import type { Env } from '../types';

interface CreateActivityRequest {
  type: 'matter_event' | 'session_event';
  eventType: string;
  title: string;
  description?: string;
  eventDate: string;
  matterId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key',
  'Access-Control-Max-Age': '86400'
};

export async function handleActivity(request: Request, env: Env): Promise<Response> {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS
    });
  }

  // Rate limiting
  const clientId = getClientId(request);
  if (!(await rateLimit(env, clientId, 50, 60))) { // 50 requests per minute
    return new Response(JSON.stringify({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      errorCode: 'RATE_LIMITED',
      retryAfter: 60
    }), {
      status: 429,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'Retry-After': '60',
        'X-RateLimit-Limit': '50',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60)
      }
    });
  }

  try {
    if (request.method === 'GET') {
      return await handleGetActivity(request, env);
    } else if (request.method === 'POST') {
      return await handleCreateActivity(request, env);
    } else {
      throw HttpErrors.methodNotAllowed('Only GET and POST methods are allowed');
    }
  } catch (error) {
    console.error('Activity API error:', error);
    
    if (error instanceof Error && error.message.includes('Invalid cursor')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid cursor',
        code: 'INVALID_CURSOR'
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
    
    if (error instanceof Error && error.message.includes('Session')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required',
        errorCode: 'UNAUTHORIZED'
      }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

async function handleGetActivity(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const teamId = url.searchParams.get('teamId');
  
  if (!teamId) {
    throw HttpErrors.badRequest('teamId parameter is required');
  }

  // Resolve session for authentication and tenant scoping
  let sessionResolution;
  try {
    sessionResolution = await SessionService.resolveSession(env, {
      request,
      teamId,
      createIfMissing: true // Allow creating session if missing
    });
  } catch (error) {
    console.error('Session resolution error:', error);
    throw HttpErrors.unauthorized('Authentication required');
  }

  const resolvedTeamId = sessionResolution.session.teamId;
  
  // Security check: ensure session belongs to the requested team
  if (resolvedTeamId !== teamId) {
    throw HttpErrors.forbidden('Session does not belong to the specified team');
  }

  // Parse query parameters
  const matterId = url.searchParams.get('matterId') || undefined;
  const sessionId = url.searchParams.get('sessionId') || undefined;
  const limit = parseInt(url.searchParams.get('limit') || '25', 10);
  const cursor = url.searchParams.get('cursor') || undefined;
  const since = url.searchParams.get('since') || undefined;
  const until = url.searchParams.get('until') || undefined;
  const type = url.searchParams.get('type')?.split(',').filter(Boolean) || undefined;
  const actorType = url.searchParams.get('actorType') as 'user' | 'lawyer' | 'system' || undefined;

  // Validate parameters
  if (!Number.isInteger(limit) || !Number.isFinite(limit) || limit < 1 || limit > 50) {
    throw HttpErrors.badRequest('Limit must be an integer between 1 and 50');
  }

  // Query activity
  const activityService = new ActivityService(env);
  let result;
  try {
    result = await activityService.queryActivity({
      teamId: resolvedTeamId,
      matterId,
      sessionId,
      limit,
      cursor,
      since,
      until,
      type,
      actorType
    });
  } catch (error) {
    console.error('Activity query error:', error);
    // Return empty result for now to avoid breaking the UI
    result = {
      items: [],
      hasMore: false,
      total: 0
    };
  }

  // Generate ETag for caching
  const etag = generateETag(result);
  
  // Check If-None-Match header for conditional requests
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ...CORS_HEADERS,
        'ETag': etag,
        'Cache-Control': 'private, max-age=60, must-revalidate',
        'Vary': 'Cookie'
      }
    });
  }

  // Set response headers
  const headers = {
    ...CORS_HEADERS,
    'Content-Type': 'application/json',
    'ETag': etag,
    'Cache-Control': 'private, max-age=60, must-revalidate',
    'Vary': 'Cookie'
  };

  // Add rate limit headers
  headers['X-RateLimit-Limit'] = '50';
  headers['X-RateLimit-Remaining'] = '49'; // Approximate
  headers['X-RateLimit-Reset'] = String(Math.floor(Date.now() / 1000) + 60);

  return new Response(JSON.stringify({
    success: true,
    data: result
  }), {
    status: 200,
    headers
  });
}

async function handleCreateActivity(request: Request, env: Env): Promise<Response> {
  // Parse request body
  const body = await parseJsonBody(request) as CreateActivityRequest;
  
  // Validate required fields
  if (!body.type || !body.eventType || !body.title || !body.eventDate) {
    throw HttpErrors.badRequest('Missing required fields: type, eventType, title, eventDate');
  }

  // Extract team ID from request (could be in body or query params)
  const url = new URL(request.url);
  const teamId = (body.metadata?.teamId as string) || url.searchParams.get('teamId');
  
  if (!teamId) {
    throw HttpErrors.badRequest('teamId is required');
  }

  // Resolve session for authentication and tenant scoping
  let sessionResolution;
  try {
    sessionResolution = await SessionService.resolveSession(env, {
      request,
      teamId,
      createIfMissing: true // Allow creating session if missing
    });
  } catch (error) {
    console.error('Session resolution error:', error);
    throw HttpErrors.unauthorized('Authentication required');
  }

  const resolvedTeamId = sessionResolution.session.teamId;
  
  // Security check: ensure session belongs to the requested team
  if (resolvedTeamId !== teamId) {
    throw HttpErrors.forbidden('Session does not belong to the specified team');
  }

  // Check for idempotency
  const idempotencyKey = request.headers.get('Idempotency-Key') || body.idempotencyKey;
  if (idempotencyKey) {
    const existingEvent = await checkIdempotency(env, idempotencyKey, resolvedTeamId);
    if (existingEvent) {
      return new Response(JSON.stringify({
        success: true,
        data: existingEvent
      }), {
        status: 200, // Return existing event
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
  }

  // Create the event
  const activityService = new ActivityService(env);
  const eventId = await activityService.createEvent({
    type: body.type,
    eventType: body.eventType,
    title: body.title,
    description: body.description || '',
    eventDate: body.eventDate,
    actorType: (body.metadata?.actorType as 'user' | 'lawyer' | 'system') || 'system',
    actorId: (body.metadata?.actorId as string) || sessionResolution.session.id,
    metadata: {
      ...body.metadata,
      teamId: resolvedTeamId,
      matterId: body.matterId,
      sessionId: body.sessionId
    }
  }, resolvedTeamId);

  // Store idempotency key if provided
  if (idempotencyKey) {
    await storeIdempotencyKey(env, idempotencyKey, resolvedTeamId, eventId);
  }

  // Fetch the created event to return
  const createdEvent = await getEventById(env, eventId, body.type);

  return new Response(JSON.stringify({
    success: true,
    data: createdEvent
  }), {
    status: 201,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

// Helper functions
function generateETag(data: unknown): string {
  const content = JSON.stringify(data);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);
  const binaryString = String.fromCharCode(...bytes);
  const base64 = btoa(binaryString);
  return `"${base64.slice(0, 16)}"`;
}

async function checkIdempotency(env: Env, key: string, teamId: string): Promise<ActivityEvent | null> {
  if (!env.CHAT_SESSIONS) return null;
  
  const idempotencyKey = `idempotency:${teamId}:${key}`;
  const existing = await env.CHAT_SESSIONS.get(idempotencyKey);
  
  if (existing) {
    const eventId = existing;
    // Try to fetch the event (simplified - in real implementation you'd need to know the type)
    return await getEventById(env, eventId, 'matter_event') || 
           await getEventById(env, eventId, 'session_event');
  }
  
  return null;
}

async function storeIdempotencyKey(env: Env, key: string, teamId: string, eventId: string): Promise<void> {
  if (!env.CHAT_SESSIONS) return;
  
  const idempotencyKey = `idempotency:${teamId}:${key}`;
  await env.CHAT_SESSIONS.put(idempotencyKey, eventId, { expirationTtl: 86400 }); // 24 hours
}

async function getEventById(env: Env, eventId: string, type: 'matter_event' | 'session_event'): Promise<ActivityEvent | null> {
  try {
    if (type === 'matter_event') {
      const stmt = env.DB.prepare(`
        SELECT 
          id, event_type, title, description, event_date,
          created_by_lawyer_id, metadata, created_at
        FROM matter_events WHERE id = ?
      `);
      const row = await stmt.bind(eventId).first() as {
        id: string;
        event_type: string;
        title: string;
        description: string | null;
        event_date: string;
        created_by_lawyer_id: string | null;
        metadata: string | null;
        created_at: string;
      } | undefined;
      
      if (row) {
        return {
          id: row.id,
          uid: `matter_evt_${row.id}_${row.event_date.replace(/[-:TZ]/g, '')}`,
          type: 'matter_event',
          eventType: row.event_type,
          title: row.title,
          description: row.description || '',
          eventDate: row.event_date,
          actorType: row.created_by_lawyer_id ? 'lawyer' : 'system',
          actorId: row.created_by_lawyer_id,
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
          createdAt: row.created_at
        };
      }
    } else {
      const stmt = env.DB.prepare(`
        SELECT 
          id, event_type, actor_type, actor_id, payload, created_at
        FROM session_audit_events WHERE id = ?
      `);
      const row = await stmt.bind(eventId).first() as {
        id: string;
        event_type: string;
        actor_type: string;
        actor_id: string | null;
        payload: string | null;
        created_at: string;
      } | undefined;
      
      if (row) {
        return {
          id: row.id,
          uid: `session_evt_${row.id}_${row.created_at.replace(/[-:TZ]/g, '')}`,
          type: 'session_event',
          eventType: row.event_type,
          title: row.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: row.payload || '',
          eventDate: row.created_at,
          actorType: row.actor_type as 'user' | 'lawyer' | 'system',
          actorId: row.actor_id,
          metadata: { payload: row.payload },
          createdAt: row.created_at
        };
      }
    }
  } catch (error) {
    console.warn('Failed to fetch event by ID:', error);
  }
  
  return null;
}
