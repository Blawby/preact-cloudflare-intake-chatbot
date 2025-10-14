# Stripe Better Auth Integration Plan

## Overview

Replace existing Blawby payment system with Better Auth Stripe plugin for subscription management. Enable Free → Business tier upgrades at $40/month per seat with trial periods and promotional codes. Follow Theo's KV-first architecture and Better Auth defaults.

## Current Implementation Status (2025-10-11)

- [x] Added Better Auth Stripe plugin configuration toggled via `ENABLE_STRIPE_SUBSCRIPTIONS`
- [x] Introduced `StripeSync` service for KV-first cache and seat metadata
- [x] Added subscription guard middleware for premium feature gating
- [x] Prepared Drizzle + SQL schema updates for Stripe subscriptions (manual D1 migration script)
- [x] Wired Better Auth subscription callbacks + webhook handlers into KV sync & org metadata
- [x] Added `/api/subscription/sync` endpoint and settings billing UI w/ Stripe checkout
- [x] Feature-flagged legacy invoice-based payments (Stripe Connect only moving forward)
- [ ] Migrate D1 schema with Better Auth Stripe tables (`npx @better-auth/cli migrate`)
- [ ] Replace legacy `/api/payment/*` upgrade flow with Better Auth checkout APIs
- [ ] Wire Stripe webhooks to call `syncStripeDataToKV` and organization updates
- [ ] Update frontend upgrade UX to use Better Auth client helpers and subscription cache
- [ ] Add integration tests for subscription gating, webhook sync, and checkout flows

## Phase 1: Environment & Dependencies

### Install Dependencies

- Add `@better-auth/stripe` and `stripe@^18.0.0` to `package.json`
- Run migrations to add Stripe schema tables via Better Auth CLI

### Environment Variables Setup ✅ COMPLETED

**Secrets (via wrangler secret put):** ✅ DONE

- `STRIPE_SECRET_KEY` - Stripe secret key for API calls ✅ SET
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification ✅ SET
- `STRIPE_CONNECT_WEBHOOK_SECRET` - Connect webhook secret ✅ SET

**Public Variables (wrangler.toml):** ✅ DONE

- `STRIPE_PRICE_ID` - Price ID for $40/month Business plan (`price_1SHfgbDJLzJ14cfPBGuTvcG3`) ✅ SET
- `STRIPE_ANNUAL_PRICE_ID` - Annual pricing with discount (`price_1SHfhCDJLzJ14cfPGFGQ77vQ`) ✅ SET
- `ENABLE_STRIPE_SUBSCRIPTIONS` - Feature flag (true) ✅ SET

### Storage Strategy (Theo's Recommendation)

- **KV (CHAT_SESSIONS):** Store subscription status cache using `syncStripeDataToKV` pattern
  - Key: `stripe:org:{organizationId}` → subscription status, limits, seats
  - Key: `stripe:user:{userId}` → Stripe customerId mapping
- **D1 Database:** Better Auth tables for audit trail, full subscription history
- Single source of truth: `syncStripeDataToKV()` function called on all subscription changes

## Phase 2: Backend Integration

### Update Auth Configuration (worker/auth/index.ts)

- Import `stripe` plugin from `@better-auth/stripe`
- Initialize Stripe client with `STRIPE_SECRET_KEY`
- Configure plugin options:
  - `createCustomerOnSignUp: true` - auto-create Stripe customers
  - `stripeWebhookSecret` for signature verification
  - Define subscription plans with `price_id` matching your Stripe product
  - Set trial period (14 days recommended by Stripe)
  - Enable promotional codes via `getCheckoutSessionParams`

### Subscription Plans Configuration

Reference Better Auth docs plan structure:

```typescript
subscription: {
  enabled: true,
  plans: [
    {
      name: "business",
      priceId: env.STRIPE_PRICE_ID,
      annualDiscountPriceId: env.STRIPE_ANNUAL_PRICE_ID,
      limits: {
        seats: 1, // Base plan includes 1 seat
        aiQueries: 1000,
        documentAnalysis: true,
        customBranding: true
      },
      freeTrial: { days: 14 }
    }
  ]
}
```

### Webhook Handler

Better Auth creates `/api/auth/stripe/webhook` automatically. Configure in Stripe dashboard:

- URL: `https://ai.blawby.com/api/auth/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*` (18 events from docs)
- Uses `stripeWebhookSecret` for signature verification

### Sync Function (worker/services/StripeSync.ts)

Following Theo's pattern, create `syncStripeDataToKV()`:

- Fetch subscription from Stripe API
- Extract: subscriptionId, status, priceId, currentPeriodEnd, cancelAtPeriodEnd, seats
- Store in KV at `stripe:org:{organizationId}`
- Called on: webhook events, /success page, subscription changes
- Prevents split-brain state between Stripe and app

### Type Definitions (worker/types.ts) ✅ COMPLETED

Add Stripe-specific types: ✅ DONE

```typescript
interface StripeSubscriptionCache {
  subscriptionId: string;
  status: "active" | "trialing" | "canceled" | "past_due" | "none";
  priceId: string;
  seats: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  limits: {
    aiQueries: number;
    documentAnalysis: boolean;
    customBranding: boolean;
  };
}
```

**Environment types added to Env interface:**
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID`, `ENABLE_STRIPE_SUBSCRIPTIONS`

## Phase 3: Database Schema

### Better Auth Stripe Tables (via migration)

Manual migration path when CLI is unavailable (Cloudflare Workers):

1. Run `npm run db:init` to apply the updated `worker/schema.sql`
2. Confirm new columns on `organizations` and `users`, plus new `subscription` table
3. Regenerate drizzle types if needed (`worker/db/auth.schema.ts` now aligned)

### Indexes

Better Auth handles indexing automatically via migration:

- `subscription.userId` for user lookup
- `subscription.stripeSubscriptionId` for webhook processing
- `stripeCustomer.userId` unique constraint

## Phase 4: Frontend Integration

### Auth Client Plugin (src/lib/authClient.ts)

Add `stripeClient` plugin:

```typescript
import { stripeClient } from "@better-auth/stripe/client";

plugins: [
  organizationClient(),
  cloudflareClient(),
  stripeClient({ subscription: true })
]
```

### Subscription Hook (src/hooks/usePaymentUpgrade.ts)

Centralize the Better Auth client calls:

- `submitUpgrade({ plan, seats, annual, successUrl, cancelUrl })` – creates the Checkout session
- `openBillingPortal({ referenceId })` – optional link to Stripe’s hosted portal
- `syncSubscription(organizationId)` – manual recovery endpoint that rehydrates KV from Stripe

### Upgrade Flow (PricingModal → Cart → Stripe)

- Pricing modal remains the entry point; selecting Business persists seat count and redirects to `/cart`
- `CartPage.tsx` surfaces seat selector, monthly/annual toggle, and invokes `submitUpgrade`
- Annual pricing uses the new Stripe price (`price_1SHfhCDJLzJ14cfPGFGQ77vQ`), monthly uses `price_1SHfgbDJLzJ14cfPBGuTvcG3`
- Account and modal CTAs both route to the cart so the experience matches the original flow
- Success/cancel URLs return users to `/settings/account` where they can confirm plan status (webhook or `/api/subscription/sync` will handle state)

### Replace Existing Payment Components

- Deprecate legacy invoice upgrade endpoints; CTA now funnels into the cart upgrade flow
- Ensure Account page surfaces "Manage billing" by calling `openBillingPortal`
- Gate business-only features via the subscription middleware

## Phase 5: Organization & Access Control

### Organization Model Updates (worker/db/auth.schema.ts)

Add subscription fields to organizations table:

```typescript
stripeCustomerId: text("stripe_customer_id"),
subscriptionTier: text("subscription_tier").default("free"),
seats: integer("seats").default(1)
```

### Middleware (worker/middleware/subscription.ts)

Create subscription check middleware:

- Read from KV cache (`stripe:org:{organizationId}`)
- Validate subscription status is active/trialing
- Check feature limits (seats, AI queries)
- Attach to request context
- Used by premium feature routes

### Quota Tracking (worker/services/QuotaService.ts)

Implement usage tracking:

- Free tier: 10 AI queries/month, no document analysis
- Business tier: 1000 queries/month per seat, full features
- Store usage in KV: `quota:org:{organizationId}:{month}`
- Reset monthly, enforce limits in AI routes

## Phase 6: Promotional Codes & Trials

### Checkout Customization (worker/auth/index.ts)

Use `getCheckoutSessionParams` hook as documented:

```typescript
getCheckoutSessionParams: async ({ user, plan }) => ({
  params: {
    allow_promotion_codes: true,
    trial_period_days: 14,
    tax_id_collection: { enabled: true }
  }
})
```

### Trial Abuse Prevention

Better Auth automatically tracks trials via `trialStart`/`trialEnd` fields:

- Users get ONE trial total across all plans
- Subsequent subscriptions charge immediately
- No configuration needed (built-in)

## Phase 7: Migration & Deprecation

### Phase Out Blawby Invoice System

- Keep `PaymentService.ts` for future Connect integration
- Remove Stripe-related code from existing payment flows
- Update organization config to remove `requiresPayment` for platform access
- Maintain invoice system ONLY for lawyer → client billing (future Connect)

### Data Migration Script

- Query users with organizations
- Create Stripe customers for existing users (idempotent)
- Set default tier to "free" for all existing orgs
- Log migration status to D1

## Phase 8: Testing & Validation

### Test Checklist

- Stripe CLI webhook forwarding: `stripe listen --forward-to localhost:8787/api/auth/stripe/webhook`
- Test checkout flow with test card (4242 4242 4242 4242)
- Verify trial period activation
- Test promotional code redemption
- Confirm subscription cancellation/reactivation
- Validate usage quota enforcement
- Test annual billing discount calculation

### Monitoring

- Log all webhook events to console
- Track `syncStripeDataToKV` execution time
- Alert on webhook signature failures
- Monitor KV cache hit rates

## Implementation References

- Better Auth Stripe Docs: Customer creation, subscription management, webhook handling
- Theo's Guide: KV-first sync pattern, avoid split-brain, single `syncStripeDataToKV()` function
- IndieСEO Example: Organization-scoped subscriptions, seat management
- Stripe Docs: Promotional codes, trial periods, tax collection

## Security & Secrets Checklist ✅ COMPLETED

**What You Need to Provide:** ✅ ALL PROVIDED

1. Stripe Secret Key (from Stripe Dashboard → Developers → API Keys) ✅ SET
2. Stripe Publishable Key (same location) ✅ SET
3. Webhook Signing Secret (from Webhook configuration page after setup) ✅ SET
4. Price IDs for Business plan (monthly + annual from Stripe Products) ✅ SET

**Storage:** ✅ CONFIGURED

- Secrets: Use `wrangler secret put` (encrypted, not in git) ✅ DONE
- Price IDs: Safe in `wrangler.toml` (public identifiers) ✅ DONE
- Never log or expose secret keys in responses/errors ✅ CONFIGURED
