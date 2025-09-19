import type { Env } from '../types';

export async function rateLimit(env: Env, key: string, limit = 60, windowSec = 60): Promise<boolean> {
  // Check if we're in a test environment using Worker-safe approach
  const nodeEnv = env.NODE_ENV ?? 
                 (typeof globalThis !== 'undefined' && globalThis.NODE_ENV) ?? 
                 'production';
  const isTestEnv = nodeEnv === 'test' || env.ENV_TEST === 'true';

  // Handle missing CHAT_SESSIONS
  if (!env.CHAT_SESSIONS) {
    if (isTestEnv) {
      // In test environment, silently bypass rate limiting
      return true;
    } else {
      // In non-test environment, log warning about misconfiguration
      console.warn('⚠️ Rate limiting is disabled: CHAT_SESSIONS binding is not available. This is a security risk in production!');
      // Still allow the request to proceed to maintain service availability
      return true;
    }
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
