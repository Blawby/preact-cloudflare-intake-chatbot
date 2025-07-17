import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';

export async function handleTeams(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'GET') {
    throw HttpErrors.methodNotAllowed('Only GET method is allowed');
  }

  try {
    const url = new URL(request.url);
    const path = url.pathname;
    // Check if requesting a specific team by ID
    const teamIdMatch = path.match(/^\/api\/teams\/(.+)$/);
    if (teamIdMatch) {
      const teamId = teamIdMatch[1];
      const stmt = env.DB.prepare('SELECT id, name, config FROM teams WHERE id = ?').bind(teamId);
      const row = await stmt.first();
      if (!row) {
        throw HttpErrors.notFound('Team not found');
      }
      const team = {
        id: row.id,
        name: row.name,
        config: JSON.parse(row.config || '{}')
      };
      return createSuccessResponse(team, {
        ...corsHeaders,
        'Cache-Control': 'public, max-age=300'
      });
    }
    // Otherwise, return all teams
    const stmt = env.DB.prepare('SELECT id, name, config FROM teams');
    const rows = await stmt.all();
    const teams = rows.results.map((row: any) => ({
      id: row.id,
      name: row.name,
      config: JSON.parse(row.config || '{}')
    }));
    return createSuccessResponse(teams, {
      ...corsHeaders,
      'Cache-Control': 'public, max-age=300'
    });
  } catch (error) {
    return handleError(error, corsHeaders);
  }
} 