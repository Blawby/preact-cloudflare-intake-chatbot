import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { withCloudflare } from "better-auth-cloudflare";
import { drizzle } from "drizzle-orm/d1";
import type { Env } from "../types";
import * as authSchema from "../db/auth.schema";
import { EmailService } from "../services/EmailService.js";

// Organization plugin will use default roles for now

// Create auth instance for CLI schema generation (without env)
export const auth = betterAuth({
  ...withCloudflare(
    {
      autoDetectIpAddress: false,
      geolocationTracking: false,
      cf: false,
      // No d1 config for CLI generation
    },
    {
      secret: "dummy-secret-for-cli",
      baseURL: "http://localhost:8787",
      trustedOrigins: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8787",
      ],
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
      },
      socialProviders: {
        google: {
          clientId: "dummy-client-id",
          clientSecret: "dummy-client-secret",
          redirectURI: "http://localhost:8787/api/auth/callback/google",
        },
      },
      plugins: [
        organization(),
      ],
    }
  ),
});

// Lazy initialization to handle async D1 access
let authInstance: ReturnType<typeof betterAuth> | null = null;

export async function getAuth(env: Env) {
  if (!authInstance) {
    console.log('🔧 Initializing Better Auth with D1 database...');
    const db = drizzle(env.DB, { schema: authSchema });
    console.log('✅ Drizzle database instance created');
    
    authInstance = betterAuth({
      ...withCloudflare(
        {
          autoDetectIpAddress: env.NODE_ENV === 'production',
          geolocationTracking: env.NODE_ENV === 'production',
          cf: env.NODE_ENV === 'production',
          d1: {
            db,
            options: {
              usePlural: true,
              debugLogs: true,
            },
          },
          // R2 for profile images only
          r2: {
            bucket: env.FILES_BUCKET as unknown as import("better-auth-cloudflare").R2Bucket, // Type assertion to resolve compatibility
            maxFileSize: 5 * 1024 * 1024, // 5MB
            allowedTypes: [".jpg", ".jpeg", ".png", ".webp"],
            additionalFields: {
              category: { type: "string", required: false },
              isPublic: { type: "boolean", required: false },
              description: { type: "string", required: false },
            },
          },
        },
        {
          secret: env.BETTER_AUTH_SECRET,
          baseURL: env.BETTER_AUTH_URL || env.CLOUDFLARE_PUBLIC_URL,
          trustedOrigins: [
            env.BETTER_AUTH_URL || "",
            env.CLOUDFLARE_PUBLIC_URL || "",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:8787",
          ].filter(Boolean),
          advanced: {
            defaultCookieAttributes: {
              sameSite: "lax",
              secure: false, // Set to false for localhost development
            },
            crossSubDomainCookies: {
              enabled: true,
            },
          },
          emailAndPassword: {
            enabled: true,
            requireEmailVerification: env.NODE_ENV === 'production', // Only require verification in production
            sendResetPassword: async ({ user, url }) => {
              try {
                const emailService = new EmailService(env.RESEND_API_KEY);
                await emailService.send({
                  from: 'noreply@blawby.com',
                  to: user.email,
                  subject: 'Reset Your Password - Blawby AI',
                  text: `Click here to reset your password: ${url}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this password reset, please ignore this email.`
                });
                console.log(`✅ Password reset email sent to ${user.email}`);
              } catch (error) {
                console.error(`❌ Failed to send password reset email to ${user.email}:`, error);
                // Don't throw - let the user continue even if email fails
              }
            },
          },
          emailVerification: {
            sendVerificationEmail: async ({ user, url }) => {
              try {
                const emailService = new EmailService(env.RESEND_API_KEY);
                await emailService.send({
                  from: 'noreply@blawby.com',
                  to: user.email,
                  subject: 'Verify Your Email - Blawby AI',
                  text: `Welcome to Blawby AI!\n\nPlease click here to verify your email address: ${url}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, please ignore this email.`
                });
                console.log(`✅ Email verification sent to ${user.email}`);
              } catch (error) {
                console.error(`❌ Failed to send email verification to ${user.email}:`, error);
                // Don't throw - let the user continue even if email fails
              }
            },
          },
          socialProviders: {
            google: {
              clientId: env.GOOGLE_CLIENT_ID || "",
              clientSecret: env.GOOGLE_CLIENT_SECRET || "",
              redirectURI: `${env.BETTER_AUTH_URL || env.CLOUDFLARE_PUBLIC_URL}/api/auth/callback/google`,
            },
          },
          plugins: [
            organization(),
          ]
        }
      )
    });
  }
  
  return authInstance;
}

