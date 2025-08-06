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
    } else if (request.method === 'POST') {
      if (path === '/seed-teams') {
        return await seedTeams(env, corsHeaders);
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
  const envInfo = {
    BLAWBY_API_URL: env.BLAWBY_API_URL,
    BLAWBY_TEAM_ULID: env.BLAWBY_TEAM_ULID,
    BLAWBY_API_TOKEN: env.BLAWBY_API_TOKEN ? 'SET' : 'NOT SET',
    timestamp: new Date().toISOString()
  };
  
  return new Response(JSON.stringify(envInfo, null, 2), {
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

async function seedTeams(env: any, corsHeaders: Record<string, string>): Promise<Response> {
  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Use sync-teams.js script instead',
    instructions: [
      'For local development: node sync-teams.js',
      'For production: node sync-teams.js --remote',
      'This script will sync teams from teams.json to the database'
    ]
  }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
} 