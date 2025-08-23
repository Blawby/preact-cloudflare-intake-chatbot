import { TeamService, Team, TeamConfig } from '../services/TeamService.js';
import { ValidatedRequest } from '../types.js';
import { HttpError } from '../types.js';
import { CORS_HEADERS } from '../errorHandler.js';

export async function handleTeams(request: Request, env: any): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace('/api/teams', '');
  


  try {
    const teamService = new TeamService(env);

    // Handle API token management routes
    if (path.includes('/tokens')) {
      const pathParts = path.split('/').filter(part => part.length > 0);
      if (pathParts.length >= 2 && pathParts[1] === 'tokens') {
        const teamId = pathParts[0];
        
        // Validate that the team exists
        const team = await teamService.getTeam(teamId);
        if (!team) {
                      return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Team not found' 
              }), 
              { 
                status: 404, 
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
              }
            );
        }
        
        if (pathParts.length === 2) {
          // /{teamId}/tokens
          switch (request.method) {
            case 'GET':
              return await listTeamTokens(teamService, teamId);
            case 'POST':
              return await createTeamToken(teamService, teamId, request);
          }
        } else if (pathParts.length === 3) {
          // /{teamId}/tokens/{tokenId}
          const tokenId = pathParts[2];
          switch (request.method) {
            case 'DELETE':
              return await revokeTeamToken(teamService, teamId, tokenId);
          }
        }
      }
    }

    // Helper function to extract teamId from path and validate method
    const extractTeamIdForRoute = (path: string, suffix: string, method: string): string | null => {
      const pathParts = path.split('/').filter(part => part.length > 0);
      if (pathParts.length >= 2 && pathParts[1] === suffix && method === 'POST') {
        return pathParts[0];
      }
      return null;
    };

    // Handle API key validation routes
    const validateTokenTeamId = extractTeamIdForRoute(path, 'validate-token', request.method);
    if (validateTokenTeamId) {
      return await validateTeamToken(teamService, validateTokenTeamId, request);
    }

    // Handle API key validation routes
    const validateApiKeyTeamId = extractTeamIdForRoute(path, 'validate-api-key', request.method);
    if (validateApiKeyTeamId) {
      return await validateApiKey(teamService, validateApiKeyTeamId, request);
    }

    // Handle API key hash generation routes
    const generateHashTeamId = extractTeamIdForRoute(path, 'generate-hash', request.method);
    if (generateHashTeamId) {
      return await generateApiKeyHash(teamService, generateHashTeamId);
    }

    switch (request.method) {
      case 'GET':
        if (path === '' || path === '/') {
          return await listTeams(teamService);
        } else {
          const teamId = path.substring(1);
          return await getTeam(teamService, teamId);
        }
      
      case 'POST':
        if (path === '' || path === '/') {
          return await createTeam(teamService, request);
        }
        break;
      
      case 'PUT':
        if (path.startsWith('/')) {
          const teamId = path.substring(1);
          return await updateTeam(teamService, teamId, request);
        }
        break;
      
      case 'DELETE':
        console.log('DELETE case matched, path:', path);
        if (path.startsWith('/')) {
          const teamId = path.substring(1);
          console.log('DELETE teamId:', teamId);
          return await deleteTeam(teamService, teamId);
        }
        console.log('DELETE path does not start with /');
        break;
    }

    return new Response('Method not allowed', { 
      status: 405, 
      headers: CORS_HEADERS 
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
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function listTeams(teamService: TeamService): Promise<Response> {
  const teams = await teamService.listTeams();
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      data: teams 
    }), 
    { 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    }
  );
}

async function getTeam(teamService: TeamService, teamId: string): Promise<Response> {
  const team = await teamService.getTeam(teamId);
  
  if (!team) {
          return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Team not found' 
        }), 
        { 
          status: 404, 
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
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
        apiUrl: team.config.blawbyApi.apiUrl
        // Note: apiKey, apiKeyHash, and teamUlid are intentionally excluded for security
      } : undefined
    }
  };

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: sanitizedTeam 
    }), 
    { 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    }
  );
}

async function createTeam(teamService: TeamService, request: Request): Promise<Response> {
  let body;
  try {
    body = await request.json() as {
      slug: string;
      name: string;
      config: TeamConfig;
    };
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
  
  // Validate required fields
  if (!body.slug || !body.name || !body.config) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Missing required fields: slug, name, config' 
      }), 
      { 
        status: 400, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
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
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
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
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    }
  );
}

async function updateTeam(teamService: TeamService, teamId: string, request: Request): Promise<Response> {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
  
  const updatedTeam = await teamService.updateTeam(teamId, body);
  
  if (!updatedTeam) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Team not found' 
      }), 
      { 
        status: 404, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: updatedTeam 
    }), 
    { 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    }
  );
}

async function deleteTeam(teamService: TeamService, teamId: string): Promise<Response> {
  const deleted = await teamService.deleteTeam(teamId);
  
  if (!deleted) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Team not found' 
      }), 
      { 
        status: 404, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Team deleted successfully' 
    }), 
    { 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    }
  );
}

async function listTeamTokens(teamService: TeamService, teamId: string): Promise<Response> {
  const tokens = await teamService.listApiTokens(teamId);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      data: tokens 
    }), 
    { 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    }
  );
}

async function createTeamToken(teamService: TeamService, teamId: string, request: Request): Promise<Response> {
  let body;
  try {
    body = await request.json() as {
      tokenName: string;
      permissions?: string[];
      createdBy?: string;
    };
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
  
  // Validate required fields
  if (!body.tokenName || typeof body.tokenName !== 'string') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Missing or invalid required field: tokenName' 
      }), 
      { 
        status: 400, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Validate permissions array if provided
  if (body.permissions !== undefined && (!Array.isArray(body.permissions) || !body.permissions.every(p => typeof p === 'string'))) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Invalid permissions: must be an array of strings' 
      }), 
      { 
        status: 400, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Validate createdBy if provided
  if (body.createdBy !== undefined && typeof body.createdBy !== 'string') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Invalid createdBy: must be a string' 
      }), 
      { 
        status: 400, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
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
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    }
  );
}

async function revokeTeamToken(
  teamService: TeamService,
  teamId: string,
  tokenId: string
): Promise<Response> {
  // First verify the token belongs to this team
  const tokens = await teamService.listApiTokens(teamId);
  const tokenBelongsToTeam = tokens.some(token => token.id === tokenId);

  if (!tokenBelongsToTeam) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Token not found'
      }),
      {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      }
    );
  }

  const result = await teamService.revokeApiToken(tokenId);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Token not found'
      }),
      {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      }
    );
  }

  const message = result.alreadyRevoked
    ? 'Token was already revoked'
    : 'Token revoked successfully';

  return new Response(
    JSON.stringify({
      success: true,
      data: { success: true, message }
    }),
    {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    }
  );
}

async function validateTeamToken(
  teamService: TeamService,
  teamId: string,
  request: Request
): Promise<Response> {
  let body;
  try {
    body = await request.json() as {
      token: string;
    };
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
  
  if (!body.token || typeof body.token !== 'string') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Missing or invalid required field: token' 
      }), 
      { 
        status: 400, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      }
    );
  }

  const isValid = await teamService.validateTeamAccess(teamId, body.token);

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { valid: isValid } 
    }), 
    { 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    }
  );
}

async function validateApiKey(
  teamService: TeamService,
  teamId: string,
  request: Request
): Promise<Response> {
  let body;
  try {
    body = await request.json() as {
      apiKey: string;
    };
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
  
  if (!body.apiKey || typeof body.apiKey !== 'string') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Missing or invalid required field: apiKey' 
      }), 
      { 
        status: 400, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      }
    );
  }

  const isValid = await teamService.validateApiKey(teamId, body.apiKey);

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { valid: isValid } 
    }), 
    { 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    }
  );
}

async function generateApiKeyHash(
  teamService: TeamService,
  teamId: string
): Promise<Response> {
  const success = await teamService.generateApiKeyHash(teamId);

  if (!success) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to generate API key hash' 
      }), 
      { 
        status: 400, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { success: true } 
    }), 
    { 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    }
  );
}