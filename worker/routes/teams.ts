import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';

export async function handleTeams(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'GET') {
    throw HttpErrors.methodNotAllowed('Only GET method is allowed');
  }

  try {
    // Use prepared statement for better performance
    const stmt = env.DB.prepare('SELECT id, name, config FROM teams');
    const rows = await stmt.all();
    
    const teams = rows.results.map((row: any) => ({
      id: row.id,
      name: row.name,
      config: JSON.parse(row.config || '{}')
    }));

    return createSuccessResponse(teams, {
      ...corsHeaders,
      'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
    });
  } catch (error) {
    return handleError(error, corsHeaders);
  }
} 