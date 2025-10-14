import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { withCloudflare } from "better-auth-cloudflare";
import { drizzle } from "drizzle-orm/d1";
import type { Env } from "../types";
import * as authSchema from "../db/auth.schema";
import { EmailService } from "../services/EmailService.js";
import { handlePostSignup } from "./hooks.js";
import { stripe as stripePlugin } from "@better-auth/stripe";
import Stripe from "stripe";
import {
  applyStripeSubscriptionUpdate,
  clearStripeSubscriptionCache,
} from "../services/StripeSync.js";

// Organization plugin will use default roles for now

// Create auth instance for CLI schema generation (without env)
export const auth = betterAuth({
  ...withCloudflare(
    {
      // No d1 config for CLI generation
      // Disable geolocation and IP detection features for CLI generation
      autoDetectIpAddress: false,
      geolocationTracking: false,
    },
    {
      // Mock cf context for compatibility (features are disabled)
      cf: {
        country: 'US',
        city: 'Local',
        region: 'Local',
        timezone: 'UTC',
        latitude: '0',
        longitude: '0',
        asn: 0,
        asOrganization: 'Local Development'
      },
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

export async function getAuth(env: Env, request?: Request) {
  if (!authInstance) {
    // Fail-fast guard for production environment
    if (env.NODE_ENV === 'production' && !env.BETTER_AUTH_SECRET) {
      throw new Error('BETTER_AUTH_SECRET required in production');
    }
    
    const db = drizzle(env.DB, { schema: authSchema });
    
    // Ensure we always have a valid baseURL with a sane default for local development
    const baseUrl = env.BETTER_AUTH_URL || env.CLOUDFLARE_PUBLIC_URL || "http://localhost:8787";
    
    // Feature flags for geolocation and IP detection (default to disabled)
    const enableGeolocation = env.ENABLE_AUTH_GEOLOCATION === 'true';
    const enableIpDetection = env.ENABLE_AUTH_IP_DETECTION === 'true';

    // Determine if Stripe subscriptions should be enabled
    const enableStripeSubscriptions =
      env.ENABLE_STRIPE_SUBSCRIPTIONS === 'true' ||
      env.ENABLE_STRIPE_SUBSCRIPTIONS === true;

    const stripeSecretKey = env.STRIPE_SECRET_KEY;
    const stripeWebhookSecret = env.STRIPE_WEBHOOK_SECRET;
    const stripePriceId = env.STRIPE_PRICE_ID;
    const stripeAnnualPriceId = env.STRIPE_ANNUAL_PRICE_ID;

    let stripeIntegration: ReturnType<typeof stripePlugin> | null = null;

    if (enableStripeSubscriptions) {
      console.log("🔧 Stripe subscriptions enabled, checking environment variables...");
      console.log("STRIPE_SECRET_KEY:", stripeSecretKey ? "✅ Present" : "❌ Missing");
      console.log("STRIPE_WEBHOOK_SECRET:", stripeWebhookSecret ? "✅ Present" : "❌ Missing");
      console.log("STRIPE_PRICE_ID:", stripePriceId ? "✅ Present" : "❌ Missing");
      
      if (!stripeSecretKey || !stripeWebhookSecret || !stripePriceId) {
        console.warn(
          "⚠️ Stripe subscriptions enabled but required env vars are missing. " +
          "Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and STRIPE_PRICE_ID."
        );
      } else {
        console.log("✅ All Stripe environment variables present, initializing plugin...");
        // Stripe API version 2025-02-24 rejects legacy `trial_period_days`;
        // disable trial period until Better Auth updates to new trial_settings shape.
        const SUBSCRIPTION_TRIAL_DAYS = 0;

        const normalizePlanName = (value?: string | null) =>
          typeof value === "string" && value.length > 0 ? value.toLowerCase() : null;

        const syncSubscriptionState = async (params: {
          stripeSubscription: Stripe.Subscription;
          referenceId?: string | null;
          plan?: string | null;
        }) => {
          const { stripeSubscription, referenceId, plan } = params;
          if (!referenceId) {
            console.warn("Stripe subscription update missing referenceId");
            return;
          }
          try {
            await applyStripeSubscriptionUpdate({
              env,
              organizationId: referenceId,
              stripeSubscription,
              plan: normalizePlanName(plan) ?? "business",
            });
          } catch (error) {
            console.error("Failed to sync Stripe subscription state", {
              organizationId: referenceId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        };

        const authorizeReference = async ({
          user,
          referenceId,
        }: {
          user: { id: string };
          referenceId: string;
        }) => {
          console.log(`🔐 Authorizing subscription reference:`, {
            userId: user.id,
            userEmail: user.email,
            referenceId,
            userStripeCustomerId: user.stripeCustomerId
          });

          if (!referenceId || referenceId === user.id) {
            console.log(`✅ Authorized: referenceId is user ID or empty`);
            return true;
          }

          try {
            const membership = await env.DB.prepare(
              `SELECT role 
                 FROM member 
                WHERE organization_id = ? 
                  AND user_id = ?`
            )
              .bind(referenceId, user.id)
              .first<{ role: string }>();

            console.log(`👥 Membership check result:`, { membership, referenceId, userId: user.id });

            if (!membership) {
              console.log(`❌ No membership found for user ${user.id} in org ${referenceId}`);
              return false;
            }

            const isAuthorized = membership.role === "owner" || membership.role === "admin";
            console.log(`🔑 Authorization result:`, { isAuthorized, role: membership.role });
            
            // If authorized, clean up any existing incomplete subscriptions
            if (isAuthorized) {
              try {
                const existingIncomplete = await env.DB.prepare(
                  `SELECT id FROM subscription 
                   WHERE reference_id = ? AND status = 'incomplete'`
                ).bind(referenceId).first<{ id: string }>();
                
                if (existingIncomplete) {
                  console.log(`🧹 Cleaning up incomplete subscription ${existingIncomplete.id} for org ${referenceId}`);
                  await env.DB.prepare(
                    `DELETE FROM subscription WHERE id = ?`
                  ).bind(existingIncomplete.id).run();
                  console.log(`✅ Successfully cleaned up incomplete subscription`);
                } else {
                  console.log(`ℹ️ No incomplete subscriptions found for org ${referenceId}`);
                }
              } catch (error) {
                console.error('❌ Failed to clean up incomplete subscription:', error);
              }
            }

            return isAuthorized;
          } catch (error) {
            console.error("❌ Failed to authorize subscription reference", {
              referenceId,
              userId: user.id,
              error: error instanceof Error ? error.message : String(error),
            });
            return false;
          }
        };

        // Create Stripe client instance
        let stripeClient: Stripe;
        try {
          stripeClient = new Stripe(stripeSecretKey, {
            apiVersion: "2025-02-24.acacia",
          });
          console.log("✅ Stripe client created successfully");
        } catch (error) {
          console.error("❌ Failed to create Stripe client:", error);
          throw error;
        }

        try {
          console.log(`🔧 Initializing Stripe plugin with configuration:`, {
            hasStripeClient: !!stripeClient,
            hasWebhookSecret: !!stripeWebhookSecret,
            createCustomerOnSignUp: true,
            priceId: stripePriceId,
            annualPriceId: stripeAnnualPriceId,
            trialDays: SUBSCRIPTION_TRIAL_DAYS
          });

          stripeIntegration = stripePlugin({
            stripeClient,
            stripeWebhookSecret,
            createCustomerOnSignUp: true,
            subscription: {
              enabled: true,
              organization: { enabled: true },
              authorizeReference: async ({ user, referenceId }) => {
                console.log(`🔐 Stripe plugin calling authorizeReference:`, { userId: user.id, referenceId });
                const result = await authorizeReference({ user, referenceId });
                console.log(`🔐 Stripe plugin authorizeReference result:`, result);
                return result;
              },
              plans: [
                {
                  name: "business",
                  priceId: stripePriceId,
                  annualDiscountPriceId: stripeAnnualPriceId,
                  ...(SUBSCRIPTION_TRIAL_DAYS > 0
                    ? { freeTrial: { days: SUBSCRIPTION_TRIAL_DAYS } }
                    : {}),
                },
                {
                  name: "business-annual",
                  priceId: stripeAnnualPriceId,
                  freeTrial: { days: SUBSCRIPTION_TRIAL_DAYS },
                },
              ],
              onSubscriptionComplete: async ({ stripeSubscription, subscription, plan }) => {
                console.log(`🎉 Subscription completed:`, {
                  subscriptionId: subscription.id,
                  stripeSubscriptionId: stripeSubscription.id,
                  referenceId: subscription.referenceId,
                  plan: plan?.name ?? subscription.plan,
                  status: stripeSubscription.status
                });
                await syncSubscriptionState({
                  stripeSubscription,
                  referenceId: subscription.referenceId,
                  plan: plan?.name ?? subscription.plan,
                });
              },
              onSubscriptionUpdate: async ({ event, subscription }) => {
                const stripeSubscription = event.data.object as Stripe.Subscription;
                await syncSubscriptionState({
                  stripeSubscription,
                  referenceId: subscription.referenceId,
                  plan: subscription.plan,
                });
              },
              onSubscriptionCancel: async ({ stripeSubscription, subscription }) => {
                await syncSubscriptionState({
                  stripeSubscription,
                  referenceId: subscription.referenceId,
                  plan: subscription.plan,
                });
              },
              onSubscriptionDeleted: async ({ subscription }) => {
                if (subscription.referenceId) {
                  await clearStripeSubscriptionCache(env, subscription.referenceId);
                }
              },
              getCheckoutSessionParams: async (params) => {
                // Extract seats and annual from the subscription object since they're not passed directly
                const seats = params.subscription?.seats || 1;
                const annual = params.plan?.name === 'business-annual';
                
                console.log(`🛒 Creating checkout session with full params:`, {
                  allParams: params,
                  userId: params.user?.id,
                  userEmail: params.user?.email,
                  plan: params.plan?.name,
                  seats: params.seats,
                  annual: params.annual,
                  subscriptionSeats: params.subscription?.seats,
                  isAnnualPlan: annual,
                  stripeCustomerId: params.user?.stripeCustomerId
                });
                
                return {
                  params: {
                    allow_promotion_codes: true,
                    tax_id_collection: { enabled: true },
                    locale: 'en', // Explicitly set locale to prevent language module loading issues
                  },
                };
              },
            },
          });
          
          console.log("✅ Stripe plugin initialized successfully");
        } catch (error) {
          console.error("❌ Failed to initialize Stripe plugin:", error);
          throw error;
        }
      }
    }
    
    // Determine CF context based on environment and feature flags
    let cfContext: {
      country?: string;
      city?: string;
      region?: string;
      timezone?: string;
      latitude?: string;
      longitude?: string;
      asn?: number;
      asOrganization?: string;
    } | undefined = undefined;
    
    // Check if we're in CLI mode (no request context available)
    const isCliMode = !request;
    
    if (isCliMode) {
      // CLI mode: always use mock for compatibility
      cfContext = {
        country: 'US',
        city: 'Local',
        region: 'Local',
        timezone: 'UTC',
        latitude: '0',
        longitude: '0',
        asn: 0,
        asOrganization: 'Local Development'
      };
    } else if (enableGeolocation || enableIpDetection) {
      // Runtime with feature flags enabled: use real CF context from request
      // Extract CF data from request.cf, fall back to mock if not available
      if (request.cf) {
        cfContext = {
          country: request.cf.country as string,
          city: request.cf.city as string,
          region: request.cf.region as string,
          timezone: request.cf.timezone as string,
          latitude: request.cf.latitude as string,
          longitude: request.cf.longitude as string,
          asn: request.cf.asn as number,
          asOrganization: request.cf.asOrganization as string
        };
      } else {
        // Fall back to mock if request.cf is not available
        cfContext = {
          country: 'US',
          city: 'Local',
          region: 'Local',
          timezone: 'UTC',
          latitude: '0',
          longitude: '0',
          asn: 0,
          asOrganization: 'Local Development'
        };
      }
    } else {
      // Runtime with feature flags disabled: use mock as fallback
      cfContext = {
        country: 'US',
        city: 'Local',
        region: 'Local',
        timezone: 'UTC',
        latitude: '0',
        longitude: '0',
        asn: 0,
        asOrganization: 'Local Development'
      };
    }
    
    authInstance = betterAuth({
      ...withCloudflare(
        {
          d1: {
            db,
            options: {
              usePlural: true,
              debugLogs: true,
            },
          },
          // R2 for profile images only (only if FILES_BUCKET is available)
          ...(env.FILES_BUCKET ? {
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
          } : {}),
          // Feature flags for geolocation and IP detection
          autoDetectIpAddress: enableIpDetection,
          geolocationTracking: enableGeolocation,
        },
        {
          // Conditional CF context based on environment and feature flags
          ...(cfContext ? { cf: cfContext } : {}),
          secret: env.BETTER_AUTH_SECRET,
          baseURL: baseUrl,
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
              secure: env.NODE_ENV === 'production', // Secure in production
            },
            crossSubDomainCookies: {
              enabled: true,
            },
            errorHandler: (error, request) => {
              console.error(`🚨 Better Auth Error:`, {
                error: error.message,
                stack: error.stack,
                url: request?.url,
                method: request?.method,
                headers: request?.headers ? Object.fromEntries(request.headers.entries()) : undefined
              });
              throw error; // Re-throw to maintain original behavior
            }
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
              redirectURI: `${baseUrl}/api/auth/callback/google`,
            },
          },
          plugins: [
            organization(),
            ...(stripeIntegration ? [stripeIntegration] : []),
          ],
          databaseHooks: {
            user: {
              create: {
                after: async (user) => {
                  const fallbackName = user.email?.split("@")?.[0] || "New User";
                  const displayName = typeof user.name === "string" && user.name.trim().length > 0
                    ? user.name
                    : fallbackName;

                  try {
                    await handlePostSignup(user.id, displayName, env);
                  } catch (error) {
                    console.error("❌ Failed to run post-signup provisioning hook:", {
                      error: error instanceof Error ? error.message : String(error),
                      userId: user.id,
                    });
                  }
                },
              },
            },
          }
        }
      )
    });
  }
  
  return authInstance;
}
