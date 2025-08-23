import { TeamService, Team, TeamConfig } from '../services/TeamService.js';
import { ValidatedRequest } from '../types.js';
import { HttpError } from '../types.js';

export async function handleTeams(request: Request, env: any): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace('/api/teams', '');
  
  console.log('Teams route debug:', {
    method: request.method,
    pathname: url.pathname,
    path: path,
    startsWithSlash: path.startsWith('/')
  });

  try {
    const teamService = new TeamService(env);

    // Handle API token management routes
    if (path.includes('/tokens')) {
      const pathParts = path.split('/').filter(part => part.length > 0);
      if (pathParts.length >= 2 && pathParts[1] === 'tokens') {
        const teamId = pathParts[0];
        
        if (pathParts.length === 2) {
          // /{teamId}/tokens
          switch (request.method) {
            case 'GET':
              return await listTeamTokens(teamService, teamId, corsHeaders);
            case 'POST':
              return await createTeamToken(teamService, teamId, request, corsHeaders);
          }
        } else if (pathParts.length === 3) {
          // /{teamId}/tokens/{tokenId}
          const tokenId = pathParts[2];
          switch (request.method) {
            case 'DELETE':
              return await revokeTeamToken(teamService, teamId, tokenId, corsHeaders);
          }
        }
      }
    }

    switch (request.method) {
      case 'GET':
        if (path === '' || path === '/') {
          return await listTeams(teamService, corsHeaders);
        } else {
          const teamId = path.substring(1);
          return await getTeam(teamService, teamId, corsHeaders);
        }
      
      case 'POST':
        if (path === '' || path === '/') {
          return await createTeam(teamService, request, corsHeaders);
        }
        break;
      
      case 'PUT':
        if (path.startsWith('/')) {
          const teamId = path.substring(1);
          return await updateTeam(teamService, teamId, request, corsHeaders);
        }
        break;
      
      case 'DELETE':
        console.log('DELETE case matched, path:', path);
        if (path.startsWith('/')) {
          const teamId = path.substring(1);
          console.log('DELETE teamId:', teamId);
          return await deleteTeam(teamService, teamId, corsHeaders);
        }
        console.log('DELETE path does not start with /');
        break;
    }

    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Team API error:', error);
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

async function listTeams(teamService: TeamService, corsHeaders: Record<string, string>): Promise<Response> {
  const teams = await teamService.listTeams();
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      data: teams 
    }), 
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function getTeam(teamService: TeamService, teamId: string, corsHeaders: Record<string, string>): Promise<Response> {
  const team = await teamService.getTeam(teamId);
  
  if (!team) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Team not found' 
      }), 
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Redact sensitive data from the response
  const sanitizedTeam = {
    ...team,
    config: {
      ...team.config,
      blawbyApi: team.config?.blawbyApi ? {
        enabled: team.config.blawbyApi.enabled,
        apiKeyHash: team.config.blawbyApi.apiKeyHash,
        apiUrl: team.config.blawbyApi.apiUrl
        // Note: apiKey and teamUlid are intentionally excluded for security
      } : undefined
    }
  };

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: sanitizedTeam 
    }), 
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function createTeam(teamService: TeamService, request: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const body = await request.json();
  
  // Validate required fields
  if (!body.slug || !body.name || !body.config) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Missing required fields: slug, name, config' 
      }), 
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Check if team with slug already exists
  const existingTeam = await teamService.getTeam(body.slug);
  if (existingTeam) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Team with this slug already exists' 
      }), 
      { 
        status: 409, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  const team = await teamService.createTeam({
    slug: body.slug,
    name: body.name,
    config: body.config
  });

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: team 
    }), 
    { 
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function updateTeam(teamService: TeamService, teamId: string, request: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const body = await request.json();
  
  const updatedTeam = await teamService.updateTeam(teamId, body);
  
  if (!updatedTeam) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Team not found' 
      }), 
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: updatedTeam 
    }), 
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function deleteTeam(teamService: TeamService, teamId: string, corsHeaders: Record<string, string>): Promise<Response> {
  const deleted = await teamService.deleteTeam(teamId);
  
  if (!deleted) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Team not found' 
      }), 
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Team deleted successfully' 
    }), 
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
} 

async function listTeamTokens(teamService: TeamService, teamId: string, corsHeaders: Record<string, string>): Promise<Response> {
  const tokens = await teamService.listApiTokens(teamId);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      data: tokens 
    }), 
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function createTeamToken(teamService: TeamService, teamId: string, request: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const body = await request.json();
  
  // Validate required fields
  if (!body.tokenName) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Missing required field: tokenName' 
      }), 
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  const permissions = body.permissions || [];
  const createdBy = body.createdBy || 'api';

  const result = await teamService.createApiToken(teamId, body.tokenName, permissions, createdBy);

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: {
        tokenId: result.tokenId,
        token: result.token, // Only returned once - should be stored securely by client
        tokenName: body.tokenName,
        permissions: permissions,
        message: 'Store this token securely - it will not be shown again'
      }
    }), 
    { 
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function revokeTeamToken(teamService: TeamService, teamId: string, tokenId: string, corsHeaders: Record<string, string>): Promise<Response> {
  const result = await teamService.revokeApiToken(tokenId);
  
  if (!result.success) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Token not found' 
      }), 
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  const message = result.alreadyRevoked 
    ? 'Token was already revoked' 
    : 'Token revoked successfully';

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: message
    }), 
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
} 