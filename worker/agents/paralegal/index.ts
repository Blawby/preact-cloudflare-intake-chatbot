import type { DurableObjectState } from '@cloudflare/workers-types';
import type { Env } from '../../types';
import { ParalegalHandlers } from './handlers.js';
import { runParalegalAgentStream } from './streamingAgent.js';

export class ParalegalAgent {
  private handlers: ParalegalHandlers;

  constructor(private state: DurableObjectState, private env: Env) {
    this.handlers = new ParalegalHandlers(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      // Route to different endpoints
      if (pathname.endsWith('/advance') && request.method === 'POST') {
        return await this.handlers.handleAdvance(request);
      }
      
      if (pathname.endsWith('/status') && request.method === 'GET') {
        return await this.handlers.handleStatus(request);
      }
      
      if (pathname.endsWith('/checklist') && request.method === 'GET') {
        return await this.handlers.handleChecklist(request);
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('ParalegalAgent error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}

// Re-export the streaming function
export { runParalegalAgentStream };