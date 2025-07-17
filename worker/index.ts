/// <reference types="@cloudflare/workers-types" />

import {
  handleHealth,
  handleRoot,
  handleChat,
  handleMatterCreation,
  handleForms,
  handleTeams,
  handleScheduling,
  handleSessions,
  handleFiles,
  handleFeedback,
  handleExport,
  handleWebhooks
} from './routes';
import { CORS_HEADERS } from './utils';
import { Env } from './types';
import { handleError, HttpErrors } from './errorHandler';

export async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    if (path.startsWith('/api/chat')) return handleChat(request, env, CORS_HEADERS);
    if (path.startsWith('/api/teams')) return handleTeams(request, env, CORS_HEADERS);
    if (path.startsWith('/api/forms')) return handleForms(request, env, CORS_HEADERS);
    if (path.startsWith('/api/matter-creation')) return handleMatterCreation(request, env, CORS_HEADERS);
    if (path.startsWith('/api/scheduling')) return handleScheduling(request, env, CORS_HEADERS);
    if (path.startsWith('/api/files')) return handleFiles(request, env, CORS_HEADERS);
    if (path.startsWith('/api/sessions')) return handleSessions(request, env, CORS_HEADERS);
    if (path.startsWith('/api/feedback')) return handleFeedback(request, env, CORS_HEADERS);
    if (path.startsWith('/api/export')) return handleExport(request, env, CORS_HEADERS);
    if (path.startsWith('/api/webhooks')) return handleWebhooks(request, env, CORS_HEADERS);
    if (path === '/api/health') return handleHealth(request, env, CORS_HEADERS);
    if (path === '/') return handleRoot(request, env);

    throw HttpErrors.notFound('Endpoint not found');

  } catch (error) {
    return handleError(error, CORS_HEADERS);
  }
}

export default { fetch: handleRequest };