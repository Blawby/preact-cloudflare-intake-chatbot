import { Env } from "../types";
import { getAuth } from "../auth";

export async function handleAuth(request: Request, env: Env): Promise<Response> {
  const auth = await getAuth(env);
  
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
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Handle auth request
  const response = await auth.handler(request);
  
  // Clone response to modify headers
  const newResponse = new Response(response.body, response);
  
  // Add CORS headers to response
  if (allowedOrigins.includes(origin)) {
    newResponse.headers.set("Access-Control-Allow-Origin", origin);
    newResponse.headers.set("Access-Control-Allow-Credentials", "true");
  }
  
  return newResponse;
}

