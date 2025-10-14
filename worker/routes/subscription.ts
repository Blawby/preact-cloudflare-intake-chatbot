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
  subscriptionId?: string;
  stripeSubscriptionId?: string;
}

function isStripeSubscriptionsEnabled(env: Env): boolean {
  return env.ENABLE_STRIPE_SUBSCRIPTIONS === "true" || env.ENABLE_STRIPE_SUBSCRIPTIONS === true;
}

export async function handleSubscription(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (!isStripeSubscriptionsEnabled(env)) {
    throw HttpErrors.notFound("Stripe subscription endpoints are disabled");
  }

  try {
    if (path === "/api/subscription/sync" && request.method === "POST") {
      const { organizationId, subscriptionId, stripeSubscriptionId } =
        (await parseJsonBody(request)) as SyncSubscriptionRequest;

      if (!organizationId) {
        throw HttpErrors.badRequest("organizationId is required");
      }

      await requireAuth(request, env);
      await requireOrgOwner(request, env, organizationId);

      const subscriptionRecord = subscriptionId
        ? await env.DB.prepare(
            `SELECT id, plan, reference_id as referenceId, stripe_subscription_id as stripeSubscriptionId
               FROM subscription
              WHERE id = ? OR stripe_subscription_id = ?
              LIMIT 1`
          )
            .bind(subscriptionId, subscriptionId)
            .first<{ id: string; plan: string | null; referenceId: string; stripeSubscriptionId: string | null }>()
        : await env.DB.prepare(
            `SELECT id, plan, reference_id as referenceId, stripe_subscription_id as stripeSubscriptionId
               FROM subscription
              WHERE reference_id = ?
              ORDER BY updated_at DESC
              LIMIT 1`
          )
            .bind(organizationId)
            .first<{ id: string; plan: string | null; referenceId: string; stripeSubscriptionId: string | null }>();

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
        plan: subscriptionRecord?.plan ?? "business",
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
