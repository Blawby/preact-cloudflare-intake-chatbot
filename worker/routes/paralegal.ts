import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';
import { rateLimit, getClientId } from '../middleware/rateLimit';

export async function handleParalegal(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  
  // Expected format: /api/paralegal/:teamId/:matterId/:action
  if (pathParts.length < 6) {
    throw HttpErrors.badRequest('Invalid paralegal endpoint format. Expected: /api/paralegal/:teamId/:matterId/:action');
  }

  const [, , , teamId, matterId, action] = pathParts;

  if (!teamId || !matterId || !action) {
    throw HttpErrors.badRequest('Missing required parameters: teamId, matterId, and action');
  }

  try {
    // Rate limiting for paralegal endpoints (more restrictive than general agent)
    const clientId = getClientId(request);
    if (!(await rateLimit(env, `paralegal:${clientId}`, 20, 60))) { // 20 requests per minute
      return new Response(JSON.stringify({
        success: false,
        error: 'Rate limit exceeded for paralegal endpoints. Please try again later.',
        errorCode: 'PARALEGAL_RATE_LIMITED'
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify team exists in database for security
    const teamCheck = await env.DB.prepare('SELECT id FROM teams WHERE id = ? OR slug = ?')
      .bind(teamId, teamId)
      .first();
    
    if (!teamCheck) {
      throw HttpErrors.unauthorized(`Team '${teamId}' not found or access denied`);
    }

    // Get Durable Object instance
    const doId = env.PARALEGAL_AGENT.idFromName(`${teamId}:${matterId}`);
    const paralegalAgent = env.PARALEGAL_AGENT.get(doId);

    // Route to appropriate DO endpoint
    let doResponse: Response;
    
    switch (action.toLowerCase()) {
      case 'advance':
        if (request.method !== 'POST') {
          throw HttpErrors.methodNotAllowed('POST method required for advance endpoint');
        }
        
        const body = await request.json().catch(() => ({}));
        doResponse = await paralegalAgent.fetch(
          new Request(`https://do.local/paralegal/${teamId}/${matterId}/advance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...body,
              teamId,
              matterId,
              timestamp: Date.now()
            })
          })
        );
        break;

      case 'status':
        if (request.method !== 'GET') {
          throw HttpErrors.methodNotAllowed('GET method required for status endpoint');
        }
        
        doResponse = await paralegalAgent.fetch(
          new Request(`https://do.local/paralegal/${teamId}/${matterId}/status`, {
            method: 'GET'
          })
        );
        break;

      case 'checklist':
        if (request.method !== 'GET') {
          throw HttpErrors.methodNotAllowed('GET method required for checklist endpoint');
        }
        
        doResponse = await paralegalAgent.fetch(
          new Request(`https://do.local/paralegal/${teamId}/${matterId}/checklist`, {
            method: 'GET'
          })
        );
        break;

      default:
        throw HttpErrors.notFound(`Unknown paralegal action: ${action}. Supported actions: advance, status, checklist`);
    }

    // Forward the DO response
    if (!doResponse.ok) {
      const errorData = await doResponse.json().catch(() => ({ error: 'Unknown error' }));
      throw HttpErrors.internalServerError(`Paralegal agent error: ${errorData.error || 'Unknown error'}`);
    }

    const responseData = await doResponse.json();
    
    // Log successful paralegal operations for observability
    console.log('Paralegal operation completed:', {
      teamId,
      matterId,
      action,
      stage: responseData.stage,
      timestamp: new Date().toISOString()
    });

    return createSuccessResponse({
      ...responseData,
      teamId,
      matterId,
      action,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Paralegal route error:', {
      teamId,
      matterId,
      action,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    
    return handleError(error);
  }
}
