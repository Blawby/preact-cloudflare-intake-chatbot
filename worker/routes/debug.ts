export async function handleDebug(request: Request, env: any): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace('/api/debug', '');

  try {
    if (request.method === 'GET') {
      if (path === '' || path === '/') {
        return await getDebugInfo(env, corsHeaders);
      } else if (path === '/teams') {
        return await getTeamsInfo(env, corsHeaders);
      }
    }

    return new Response('Endpoint not found', { 
      status: 404, 
      headers: corsHeaders 
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function getDebugInfo(env: any, corsHeaders: Record<string, string>): Promise<Response> {
  const info = {
    timestamp: new Date().toISOString(),
    environment: env.ENVIRONMENT || 'development',
    database: 'D1 (Cloudflare)',
    architecture: 'API-First Multi-Tenant',
    features: {
      teams: 'Pure API-based team management',
      chat: 'AI-powered conversations',
      fileUpload: 'Multi-file upload support',
      scheduling: 'Appointment booking',
      payments: 'Stripe integration',
      forms: 'Contact form handling'
    },
    endpoints: {
      teams: '/api/teams',
      chat: '/api/chat',
      agent: '/api/agent',
      files: '/api/files',
      scheduling: '/api/scheduling',
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
      ...corsHeaders
    }
  });
}

async function getTeamsInfo(env: any, corsHeaders: Record<string, string>): Promise<Response> {
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
        ...corsHeaders
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
        ...corsHeaders
      }
    });
  }
} 