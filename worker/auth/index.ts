import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { withCloudflare } from "better-auth-cloudflare";
import { drizzle } from "drizzle-orm/d1";
import type { Env } from "../types";

// Import the generated auth schema
import { users, sessions, accounts, verifications } from "../db/auth.schema";

export async function createAuth(env?: Env) {
  // Initialize Drizzle with D1 database
  const db = drizzle(env?.DB!, {
    schema: { users, sessions, accounts, verifications }
  });

  return betterAuth({
    // Better Auth configuration
    database: drizzleAdapter(db, {
      provider: "sqlite",
      usePlural: true,
      debugLogs: true,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Set to true in production
    },
    socialProviders: {
      google: {
        clientId: env?.GOOGLE_CLIENT_ID!,
        clientSecret: env?.GOOGLE_CLIENT_SECRET!,
        redirectURI: `${env?.BETTER_AUTH_URL || 'http://localhost:8787'}/api/auth/callback/google`,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    user: {
      additionalFields: {
        teamId: {
          type: "string",
          required: false,
        },
        role: {
          type: "string",
          required: false,
        },
        phone: {
          type: "string",
          required: false,
        },
      },
    },
    rateLimit: {
      enabled: true,
      window: 60, // 1 minute
      max: 10, // 10 requests per window
    },
    // Security settings
    trustedOrigins: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://blawby-ai-chatbot.paulchrisluke.workers.dev",
      "https://ai.blawby.com",
    ],
    // CORS settings
    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:5173", 
        "https://blawby-ai-chatbot.paulchrisluke.workers.dev",
        "https://ai.blawby.com",
      ],
      credentials: true,
    },
  });
}

// Export for CLI schema generation (without Cloudflare context)
export const auth = betterAuth({
  database: drizzleAdapter({} as any, {
    provider: "sqlite",
    usePlural: true,
    debugLogs: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      teamId: {
        type: "string",
        required: false,
      },
      role: {
        type: "string",
        required: false,
      },
      phone: {
        type: "string",
        required: false,
      },
    },
  },
});

// Export the createAuth function for runtime usage
export { createAuth as initAuth };