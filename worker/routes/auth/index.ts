import { initAuth } from "../../auth";
import type { Env } from "../../types";

export async function handleAuth(request: Request, env: Env): Promise<Response> {
  try {
    const auth = await initAuth(env);
    return auth.handler(request);
  } catch (error) {
    console.error("Auth handler error:", error);
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