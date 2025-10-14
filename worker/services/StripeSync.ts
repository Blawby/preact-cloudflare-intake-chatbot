import Stripe from "stripe";
import type { Env, StripeSubscriptionCache } from "../types.js";

const DEFAULT_STRIPE_API_VERSION: Stripe.StripeConfig["apiVersion"] = "2025-08-27.basil";

function getOrCreateStripeClient(env: Env, apiVersion = DEFAULT_STRIPE_API_VERSION): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is required to initialize the Stripe client");
  }

  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion,
    httpClient: Stripe.createFetchHttpClient(),
  });
}

function getOrganizationCacheKey(organizationId: string): string {
  return `stripe:org:${organizationId}`;
}

function getUserCacheKey(userId: string): string {
  return `stripe:user:${userId}`;
}

function normalizeSubscriptionStatus(
  status: Stripe.Subscription.Status | null | undefined
): StripeSubscriptionCache["status"] {
  switch (status) {
    case "active":
    case "trialing":
      return status;
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "past_due":
    case "unpaid":
      return "past_due";
    default:
      return "none";
  }
}

function extractStripeCustomerId(subscription: Stripe.Subscription): string | null {
  const customer = subscription.customer;
  if (!customer) {
    return null;
  }
  return typeof customer === "string" ? customer : customer.id;
}

async function updateOrganizationSubscriptionMetadata(args: {
  env: Env;
  organizationId: string;
  stripeCustomerId: string | null;
  plan?: string | null;
  seats?: number | null;
  status: StripeSubscriptionCache["status"];
}): Promise<void> {
  const { env, organizationId, stripeCustomerId, plan, seats, status } = args;
  const normalizedSeats = typeof seats === "number" && seats > 0 ? seats : 1;

  const normalizedTier =
    status === "active" || status === "trialing"
      ? (plan ?? "business")
      : "free";

  await env.DB.prepare(
    `UPDATE organizations 
       SET stripe_customer_id = ?, 
           subscription_tier = ?, 
           seats = ?, 
           updated_at = ?
     WHERE id = ?`
  )
    .bind(
      stripeCustomerId,
      normalizedTier,
      normalizedSeats,
      Math.floor(Date.now() / 1000),
      organizationId
    )
    .run();
}

export async function getStripeSubscriptionCache(
  env: Env,
  organizationId: string
): Promise<StripeSubscriptionCache | null> {
  const cacheKey = getOrganizationCacheKey(organizationId);
  const cached = await env.CHAT_SESSIONS.get(cacheKey, { type: "json" });
  if (!cached) {
    return null;
  }

  return cached as StripeSubscriptionCache;
}

export async function syncStripeDataToKV(args: {
  env: Env;
  organizationId: string;
  subscription: Stripe.Subscription;
  overwriteExisting?: boolean;
}): Promise<StripeSubscriptionCache> {
  const { env, organizationId, subscription, overwriteExisting = true } = args;

  const primaryItem = subscription.items?.data?.[0];
  const price = primaryItem?.price;

  const limits: StripeSubscriptionCache["limits"] = {
    aiQueries: 1000,
    documentAnalysis: true,
    customBranding: true,
  };

  const cachePayload: StripeSubscriptionCache = {
    subscriptionId: subscription.id,
    status: normalizeSubscriptionStatus(subscription.status),
    priceId: price?.id ?? "unknown",
    seats: primaryItem?.quantity ?? 1,
    currentPeriodEnd: primaryItem?.current_period_end ?? 0,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    limits,
  };

  const cacheKey = getOrganizationCacheKey(organizationId);

  if (!overwriteExisting) {
    const existing = await getStripeSubscriptionCache(env, organizationId);
    if (existing) {
      return existing;
    }
  }

  await env.CHAT_SESSIONS.put(cacheKey, JSON.stringify(cachePayload));

  return cachePayload;
}

export async function applyStripeSubscriptionUpdate(args: {
  env: Env;
  organizationId: string;
  stripeSubscription: Stripe.Subscription;
  plan?: string | null;
  overwriteExisting?: boolean;
}): Promise<StripeSubscriptionCache> {
  const { env, organizationId, stripeSubscription, plan, overwriteExisting } = args;

  const cache = await syncStripeDataToKV({
    env,
    organizationId,
    subscription: stripeSubscription,
    overwriteExisting,
  });

  await updateOrganizationSubscriptionMetadata({
    env,
    organizationId,
    stripeCustomerId: extractStripeCustomerId(stripeSubscription),
    plan,
    seats: cache.seats,
    status: cache.status,
  });

  return cache;
}

export async function clearStripeSubscriptionCache(env: Env, organizationId: string): Promise<void> {
  await env.CHAT_SESSIONS.delete(getOrganizationCacheKey(organizationId));
  await updateOrganizationSubscriptionMetadata({
    env,
    organizationId,
    stripeCustomerId: null,
    plan: "free",
    seats: 1,
    status: "canceled",
  });
}

export async function mapUserToStripeCustomer(env: Env, userId: string, customerId: string): Promise<void> {
  const cacheKey = getUserCacheKey(userId);
  await env.CHAT_SESSIONS.put(cacheKey, JSON.stringify({ customerId }), {
    metadata: { updatedAt: Date.now() },
  });
}

export async function getMappedStripeCustomer(env: Env, userId: string): Promise<string | null> {
  const cacheKey = getUserCacheKey(userId);
  const data = (await env.CHAT_SESSIONS.get(cacheKey, { type: "json" })) as { customerId?: string } | null;
  return data?.customerId ?? null;
}

export async function refreshStripeSubscriptionById(args: {
  env: Env;
  organizationId: string;
  subscriptionId: string;
  plan?: string | null;
  stripeClient?: Stripe;
}): Promise<StripeSubscriptionCache> {
  const { env, organizationId, subscriptionId, plan } = args;
  const client = args.stripeClient ?? getOrCreateStripeClient(env);
  const subscription = await client.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });

  return applyStripeSubscriptionUpdate({
    env,
    organizationId,
    stripeSubscription: subscription,
    plan,
  });
}
