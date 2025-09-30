import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { withCloudflare } from "better-auth-cloudflare";
import { drizzle } from "drizzle-orm/d1";
import type { Env } from "../types";

// Import the generated auth schema
import { users, sessions, accounts, passwords, verifications } from "../db/auth.schema";

// Single source of truth for trusted origins
export const trustedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://blawby-ai-chatbot.paulchrisluke.workers.dev",
  "https://ai.blawby.com",
];

export function createAuth(env: Env) {
  // Validate required environment variables
  if (!env.DB) {
    throw new Error("Database (env.DB) is required for authentication");
  }
  
  // Validate BETTER_AUTH_URL for non-development environments
  const isDevelopment = env.NODE_ENV === 'development' || env.NODE_ENV === 'dev';
  if (!isDevelopment && !env.BETTER_AUTH_URL) {
    throw new Error("BETTER_AUTH_URL is required for non-development environments. Set it to your production domain (e.g., 'https://ai.blawby.com')");
  }
  
  // Initialize Drizzle with D1 database
  const db = drizzle(env.DB, {
    schema: { users, sessions, accounts, passwords, verifications }
  });

  return betterAuth({
    // Better Auth configuration
    basePath: "/api/auth",
    database: drizzleAdapter(db, {
      provider: "sqlite",
      usePlural: true,
      debugLogs: env.NODE_ENV !== 'production',
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Set to true in production
    },
    socialProviders: {
      google: {
        clientId: (() => {
          if (!env.GOOGLE_CLIENT_ID) {
            throw new Error("GOOGLE_CLIENT_ID is required for Google OAuth");
          }
          return env.GOOGLE_CLIENT_ID;
        })(),
        clientSecret: (() => {
          if (!env.GOOGLE_CLIENT_SECRET) {
            throw new Error("GOOGLE_CLIENT_SECRET is required for Google OAuth");
          }
          return env.GOOGLE_CLIENT_SECRET;
        })(),
        redirectURI: `${env.BETTER_AUTH_URL || 'http://localhost:8787'}/api/auth/callback/google`,
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
    trustedOrigins,
    // CORS settings
    cors: {
      origin: [...trustedOrigins],
      credentials: true,
    },
  });
}

// Export for CLI schema generation (without Cloudflare context)
export const auth = betterAuth({
  basePath: "/api/auth",
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

// createAuth is already exported above