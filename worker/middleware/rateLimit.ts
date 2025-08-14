import type { Env } from '../types';

export async function rateLimit(env: Env, key: string, limit = 60, windowSec = 60): Promise<boolean> {
  // Skip rate limiting if CHAT_SESSIONS is not available (e.g., in test environments)
  if (!env.CHAT_SESSIONS) {
    return true;
  }
  
  const bucketKey = `rl:${key}:${Math.floor(Date.now() / (windowSec * 1000))}`;
  const current = parseInt((await env.CHAT_SESSIONS.get(bucketKey)) || "0", 10);
  
  if (current >= limit) {
    return false;
  }
  
  await env.CHAT_SESSIONS.put(bucketKey, String(current + 1), { 
    expirationTtl: windowSec + 5 
  });
  
  return true;
}

// Helper to get client identifier for rate limiting
export function getClientId(request: Request): string {
  // Try Cloudflare IP first, then fallback to other headers
  return request.headers.get("cf-connecting-ip") || 
         request.headers.get("x-forwarded-for") || 
         request.headers.get("x-real-ip") || 
         "anonymous";
}
