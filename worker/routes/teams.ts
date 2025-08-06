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

  try {
    const teamService = new TeamService(env);

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
        if (path.startsWith('/')) {
          const teamId = path.substring(1);
          return await deleteTeam(teamService, teamId, corsHeaders);
        }
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

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: team 
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