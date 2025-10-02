import type { Env } from '../types.js';

export async function handleDebug(request: Request, env: Env): Promise<Response> {

  const url = new URL(request.url);
  const path = url.pathname.replace('/api/debug', '');

  try {
    if (request.method === 'GET') {
      if (path === '' || path === '/') {
        return await getDebugInfo(env);
      } else if (path === '/teams') {
        return await getTeamsInfo(env);
      }
    }

    return new Response('Endpoint not found', { 
      status: 404 
    });

  } catch (error) {
    console.error('Debug API error:', error);
          return new Response(
        JSON.stringify({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Internal server error' 
        }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
  }
}

async function getDebugInfo(env: Env): Promise<Response> {
  const info = {
    timestamp: new Date().toISOString(),
    environment: 'Cloudflare Workers',
    database: 'D1 (Cloudflare)',
    architecture: 'API-First Multi-Tenant',
    features: {
      teams: 'Pure API-based team management',
      chat: 'AI-powered conversations',
      fileUpload: 'Multi-file upload support',

      payments: 'Stripe integration',
      forms: 'Contact form handling'
    },
    endpoints: {
      teams: '/api/teams',
      chat: '/api/chat',
      agent: '/api/agent',
      files: '/api/files',

      payment: '/api/payment',
      forms: '/api/forms',
      debug: '/api/debug'
    },
    teamManagement: {
      create: 'POST /api/teams',
      list: 'GET /api/teams',
              get: 'GET /api/teams/{slugOrId}',
        update: 'PUT /api/teams/{slugOrId}',
        delete: 'DELETE /api/teams/{slugOrId}'
    },
    cloudflarePatterns: {
      environmentResolution: '${ENV_VAR} pattern supported',
      caching: '5-minute TTL cache',
      security: 'No hardcoded secrets',
      scaling: 'API-first architecture'
    }
  };

  return new Response(JSON.stringify(info, null, 2), {
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

async function getTeamsInfo(env: Env): Promise<Response> {
  try {
    const { TeamService } = await import('../services/TeamService.js');
    const teamService = new TeamService(env);
    const teams = await teamService.listTeams();
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: teams 
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }, null, 2), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
} 