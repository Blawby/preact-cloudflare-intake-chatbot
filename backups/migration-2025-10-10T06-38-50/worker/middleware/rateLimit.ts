import type { Env } from '../types';
import { parseEnvBool } from '../utils/safeStringUtils.js';

export async function rateLimit(env: Env, key: string, limit = 60, windowSec = 60): Promise<boolean> {
  // Guard clause: validate numeric parameters
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) {
    throw new RangeError(`Invalid limit parameter: expected a positive finite number, got ${limit}`);
  }
  
  if (typeof windowSec !== 'number' || !Number.isFinite(windowSec) || windowSec <= 0) {
    throw new RangeError(`Invalid windowSec parameter: expected a positive finite number, got ${windowSec}`);
  }

  // Check if we're in a test environment
  const isTestEnv = env.NODE_ENV === 'test' || parseEnvBool(env.ENV_TEST);

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
