import type { Env } from '../types';
import { HttpErrors, handleError, createSuccessResponse } from '../errorHandler';
import { parseJsonBody } from '../utils';
import { TeamSecretsService } from '../services/TeamSecretsService';

export async function handleTeamSecrets(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // POST /api/team-secrets/:teamId - Store team secret
  if (path.match(/^\/api\/team-secrets\/([^\/]+)$/) && request.method === 'POST') {
    try {
      const teamId = path.split('/')[3];
      const body = await parseJsonBody(request);

      if (!teamId) {
        throw HttpErrors.badRequest('Team ID is required');
      }

      if (!body.apiKey || !body.teamUlid) {
        throw HttpErrors.badRequest('API key and team ULID are required');
      }

      const teamSecretsService = new TeamSecretsService({ TEAM_SECRETS: env.TEAM_SECRETS });
      await teamSecretsService.storeTeamSecret(teamId, body.apiKey, body.teamUlid);

      return createSuccessResponse({
        success: true,
        message: 'Team secret stored successfully',
        teamId
      }, corsHeaders);

    } catch (error) {
      return handleError(error, corsHeaders);
    }
  }

  // GET /api/team-secrets/:teamId - Get team secret (metadata only)
  if (path.match(/^\/api\/team-secrets\/([^\/]+)$/) && request.method === 'GET') {
    try {
      const teamId = path.split('/')[3];
      
      if (!teamId) {
        throw HttpErrors.badRequest('Team ID is required');
      }

      const teamSecretsService = new TeamSecretsService({ TEAM_SECRETS: env.TEAM_SECRETS });
      const hasSecret = await teamSecretsService.hasTeamSecret(teamId);

      return createSuccessResponse({
        success: true,
        teamId,
        hasSecret,
        message: hasSecret ? 'Team has stored secret' : 'No secret found for team'
      }, corsHeaders);

    } catch (error) {
      return handleError(error, corsHeaders);
    }
  }

  // PUT /api/team-secrets/:teamId - Update team secret
  if (path.match(/^\/api\/team-secrets\/([^\/]+)$/) && request.method === 'PUT') {
    try {
      const teamId = path.split('/')[3];
      const body = await parseJsonBody(request);

      if (!teamId) {
        throw HttpErrors.badRequest('Team ID is required');
      }

      if (!body.apiKey || !body.teamUlid) {
        throw HttpErrors.badRequest('API key and team ULID are required');
      }

      const teamSecretsService = new TeamSecretsService({ TEAM_SECRETS: env.TEAM_SECRETS });
      await teamSecretsService.updateTeamSecret(teamId, body.apiKey, body.teamUlid);

      return createSuccessResponse({
        success: true,
        message: 'Team secret updated successfully',
        teamId
      }, corsHeaders);

    } catch (error) {
      return handleError(error, corsHeaders);
    }
  }

  // DELETE /api/team-secrets/:teamId - Delete team secret
  if (path.match(/^\/api\/team-secrets\/([^\/]+)$/) && request.method === 'DELETE') {
    try {
      const teamId = path.split('/')[3];
      
      if (!teamId) {
        throw HttpErrors.badRequest('Team ID is required');
      }

      const teamSecretsService = new TeamSecretsService({ TEAM_SECRETS: env.TEAM_SECRETS });
      await teamSecretsService.deleteTeamSecret(teamId);

      return createSuccessResponse({
        success: true,
        message: 'Team secret deleted successfully',
        teamId
      }, corsHeaders);

    } catch (error) {
      return handleError(error, corsHeaders);
    }
  }

  // GET /api/team-secrets - List all teams with secrets
  if (path === '/api/team-secrets' && request.method === 'GET') {
    try {
      const teamSecretsService = new TeamSecretsService({ TEAM_SECRETS: env.TEAM_SECRETS });
      const teams = await teamSecretsService.listTeamSecrets();

      return createSuccessResponse({
        success: true,
        teams,
        count: teams.length
      }, corsHeaders);

    } catch (error) {
      return handleError(error, corsHeaders);
    }
  }

  throw HttpErrors.notFound('Team secrets endpoint not found');
} 