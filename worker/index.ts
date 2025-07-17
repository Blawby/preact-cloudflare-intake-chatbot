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

export interface Env {
  AI: any;
  DB: D1Database;
  CHAT_SESSIONS: KVNamespace;
  RESEND_API_KEY: string;
  FILES_BUCKET?: R2Bucket;
}

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

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Worker error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

export default { fetch: handleRequest }; 