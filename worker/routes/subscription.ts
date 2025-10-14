import type { Env } from "../types";
import { parseJsonBody } from "../utils";
import { HttpErrors, handleError, createSuccessResponse } from "../errorHandler";
import { requireAuth, requireOrgOwner } from "../middleware/auth.js";
import {
  clearStripeSubscriptionCache,
  refreshStripeSubscriptionById,
} from "../services/StripeSync.js";

interface SyncSubscriptionRequest {
  organizationId: string;
  /** Internal subscription ID - queries WHERE id = ? */
  subscriptionId?: string;
  /** Stripe subscription ID - queries WHERE stripe_subscription_id = ? */
  stripeSubscriptionId?: string;
}

function isStripeSubscriptionsEnabled(env: Env): boolean {
  return env.ENABLE_STRIPE_SUBSCRIPTIONS === "true" || env.ENABLE_STRIPE_SUBSCRIPTIONS === true;
}

export async function handleSubscription(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    if (!isStripeSubscriptionsEnabled(env)) {
      throw HttpErrors.notFound("Stripe subscription endpoints are disabled");
    }
    if (path === "/api/subscription/sync" && request.method === "POST") {
      const { organizationId, subscriptionId, stripeSubscriptionId } =
        (await parseJsonBody(request)) as SyncSubscriptionRequest;

      if (!organizationId) {
        throw HttpErrors.badRequest("organizationId is required");
      }

      await requireAuth(request, env);
      await requireOrgOwner(request, env, organizationId);

      let subscriptionRecord: { id: string; plan: string | null; referenceId: string; stripeSubscriptionId: string | null } | undefined;

      if (subscriptionId) {
        // Query by internal subscription ID
        subscriptionRecord = await env.DB.prepare(
          `SELECT id, plan, reference_id as referenceId, stripe_subscription_id as stripeSubscriptionId
             FROM subscriptions
            WHERE id = ?
            LIMIT 1`
        )
          .bind(subscriptionId)
          .first<{ id: string; plan: string | null; referenceId: string; stripeSubscriptionId: string | null }>();
      } else if (stripeSubscriptionId) {
        // Query by Stripe subscription ID
        subscriptionRecord = await env.DB.prepare(
          `SELECT id, plan, reference_id as referenceId, stripe_subscription_id as stripeSubscriptionId
             FROM subscriptions
            WHERE stripe_subscription_id = ?
            LIMIT 1`
        )
          .bind(stripeSubscriptionId)
          .first<{ id: string; plan: string | null; referenceId: string; stripeSubscriptionId: string | null }>();
      } else {
        // Fallback: query by organization ID (reference_id)
        subscriptionRecord = await env.DB.prepare(
          `SELECT id, plan, reference_id as referenceId, stripe_subscription_id as stripeSubscriptionId
             FROM subscriptions
            WHERE reference_id = ?
            ORDER BY updated_at DESC
            LIMIT 1`
        )
          .bind(organizationId)
          .first<{ id: string; plan: string | null; referenceId: string; stripeSubscriptionId: string | null }>();
      }

      const stripeId = stripeSubscriptionId ?? subscriptionRecord?.stripeSubscriptionId;

      if (!stripeId) {
        await clearStripeSubscriptionCache(env, organizationId);
        return createSuccessResponse({
          synced: false,
          message: "No active Stripe subscription found for organization",
        });
      }

      const cache = await refreshStripeSubscriptionById({
        env,
        organizationId,
        subscriptionId: stripeId,
        plan: subscriptionRecord?.plan ?? "free",
      });

      return createSuccessResponse({
        synced: true,
        subscription: cache,
      });
    }

    throw HttpErrors.notFound("Subscription endpoint not found");
  } catch (error) {
    return handleError(error);
  }
}
