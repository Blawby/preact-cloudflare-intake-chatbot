import { createAuth } from "../../auth";
import type { Env } from "../../types";

export async function handleAuth(request: Request, env: Env, _ctx?: ExecutionContext): Promise<Response> {
  try {
    const auth = createAuth(env);
    
    // Use the Better Auth handler
    const response = await auth.handler(request);
    return response;
  } catch (error) {
    console.error("🔐 Auth handler error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Authentication error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}