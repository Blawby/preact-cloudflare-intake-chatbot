import { Env } from "../types";
import { getAuth } from "../auth/index";

export async function handleAuth(request: Request, env: Env): Promise<Response> {
  try {
    console.log('🔍 Auth route handler called for:', request.url);
    const auth = await getAuth(env, request);
    console.log('✅ Auth instance created successfully');
  
  // Get origin from request
  const origin = request.headers.get("origin") || "";
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:8787",
    env.BETTER_AUTH_URL,
    env.CLOUDFLARE_PUBLIC_URL,
  ].filter(Boolean);

  // Handle OPTIONS preflight
  if (request.method === "OPTIONS") {
    // Only allow CORS for recognized origins - no fallback to allowedOrigins[0]
    if (allowedOrigins.includes(origin)) {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin",
        },
      });
    } else {
      // Reject unrecognized origins with 403 - no CORS headers to prevent API capability leakage
      return new Response(null, {
        status: 403,
        headers: {
          "Vary": "Origin",
        },
      });
    }
  }

    // Handle auth request
    console.log('🔄 Calling auth.handler for:', request.url);
    const response = await auth.handler(request);
    console.log('✅ Auth handler response status:', response.status);
    
    // Clone response to modify headers
    const newResponse = new Response(response.body, response);
    
    // Fix cookie attributes for production
    if (env.NODE_ENV === 'production') {
      const setCookieHeaders = response.headers.getSetCookie();
      if (setCookieHeaders.length > 0) {
        console.log('🍪 Fixing cookie attributes for production...');
        console.log('🍪 Original cookies:', setCookieHeaders);
        // Remove old Set-Cookie headers
        newResponse.headers.delete('Set-Cookie');
        
        // Add corrected Set-Cookie headers
        setCookieHeaders.forEach(cookie => {
          // Replace SameSite=Lax with SameSite=None
          const fixedCookie = cookie.replace(/SameSite=Lax/gi, 'SameSite=None');
          console.log('🍪 Fixed cookie:', fixedCookie);
          newResponse.headers.append('Set-Cookie', fixedCookie);
        });
      } else {
        console.log('🍪 No Set-Cookie headers found in response');
      }
    }
    
    // Add CORS headers to response
    if (allowedOrigins.includes(origin)) {
      newResponse.headers.set("Access-Control-Allow-Origin", origin);
      newResponse.headers.set("Access-Control-Allow-Credentials", "true");
      
      // Add Vary: Origin header, merging with existing Vary values if present
      const existingVary = newResponse.headers.get("Vary");
      if (existingVary) {
        const varyValues = existingVary.split(",").map(v => v.trim());
        if (!varyValues.includes("Origin")) {
          newResponse.headers.set("Vary", `${existingVary}, Origin`);
        }
      } else {
        newResponse.headers.set("Vary", "Origin");
      }
    }
    
    return newResponse;
  } catch (error) {
    console.error('❌ Auth route handler error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Authentication service error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

