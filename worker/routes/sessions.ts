import { parseJsonBody } from '../utils.js';
import { HttpErrors } from '../errorHandler.js';
import type { Env } from '../types.js';
import { SessionService } from '../services/SessionService.js';
import { sessionRequestBodySchema } from '../schemas/validation.js';

function normalizeTeamId(teamId?: string | null): string {
  if (!teamId) {
    throw HttpErrors.badRequest('teamId is required');
  }
  const trimmed = teamId.trim();
  if (!trimmed) {
    throw HttpErrors.badRequest('teamId cannot be empty');
  }
  return trimmed;
}

function createJsonResponse(data: unknown, setCookie?: string[]): Response {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (setCookie) {
    for (const cookie of setCookie) {
      if (cookie) headers.append('Set-Cookie', cookie);
    }
  }
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers
  });
}

export async function handleSessions(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);

  if (segments[0] !== 'api' || segments[1] !== 'sessions') {
    throw HttpErrors.notFound('Session route not found');
  }

  // POST /api/sessions
  if (segments.length === 2 && request.method === 'POST') {
    const rawBody = await parseJsonBody(request);
    
    // Runtime validation of request body
    const validationResult = sessionRequestBodySchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      throw HttpErrors.badRequest(`Invalid request body: ${errorMessages}`);
    }
    
    const body = validationResult.data;
    const teamId = normalizeTeamId(body.teamId);

    const resolution = await SessionService.resolveSession(env, {
      request,
      sessionId: body.sessionId,
      sessionToken: body.sessionToken,
      teamId,
      retentionHorizonDays: body.retentionHorizonDays,
      createIfMissing: true
    });

    const maxAgeSeconds = SessionService.getCookieMaxAgeSeconds();
    const expiresAt = new Date(Date.now() + 1000 * maxAgeSeconds).toISOString();

    return createJsonResponse({
      sessionId: resolution.session.id,
      teamId: resolution.session.teamId,
      state: resolution.session.state,
      lastActive: resolution.session.lastActive,
      createdAt: resolution.session.createdAt,
      retentionHorizonDays: resolution.session.retentionHorizonDays,
      isHold: resolution.session.isHold,
      closedAt: resolution.session.closedAt,
      sessionToken: resolution.sessionToken,
      isNew: resolution.isNew,
      expiresAt,
      isEphemeral: resolution.isEphemeral ?? false
    }, resolution.cookie ? [resolution.cookie] : undefined);
  }

  // GET /api/sessions/:id
  if (segments.length === 3 && request.method === 'GET') {
    const sessionId = segments[2];
    if (!sessionId) {
      throw HttpErrors.badRequest('Session ID is required');
    }
    let session: Awaited<ReturnType<typeof SessionService.getSessionById>>;
    try {
      session = await SessionService.getSessionById(env, sessionId);
    } catch (error) {
      console.warn('[SessionsRoute] Failed to load session, falling back to ephemeral view', {
        sessionId,
        message: error instanceof Error ? error.message : String(error)
      });
      session = null;
    }

    if (!session) {
      const fallback = {
        sessionId,
        teamId: normalizeTeamId(url.searchParams.get('teamId') ?? 'public'),
        state: 'active' as const,
        statusReason: 'ephemeral_fallback',
        retentionHorizonDays: 180,
        isHold: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        closedAt: null
      };
      return createJsonResponse(fallback);
    }

    const teamIdParam = url.searchParams.get('teamId');
    if (teamIdParam) {
      const requestedTeam = normalizeTeamId(teamIdParam);
      if (requestedTeam !== session.teamId) {
        throw HttpErrors.notFound('Session not found for requested team');
      }
    }

    const data = {
      sessionId: session.id,
      teamId: session.teamId,
      state: session.state,
      statusReason: session.statusReason,
      retentionHorizonDays: session.retentionHorizonDays,
      isHold: session.isHold,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      lastActive: session.lastActive,
      closedAt: session.closedAt
    };

    return createJsonResponse(data);
  }

  throw HttpErrors.methodNotAllowed('Unsupported method for sessions endpoint');
}
