import { handleRequest } from '../index.js';

export async function handleChat(request: Request, env: any, ctx: any): Promise<Response> {
  return handleRequest(request, env, ctx);
} 