# Pricing & Checkout Onboarding

This document captures the structure and ownership of the pricing → checkout → confirmation flows after the Q1 refresh.

## Component Map
- **Organisms**
  - `src/components/PricingCart.tsx` — orchestrates plan selection, seat management, and cart session lifecycle.
  - `src/components/PricingCheckout.tsx` — captures billing/contact/payment data and drives payment processing.
  - `src/components/PricingConfirmation.tsx` — final success screen showing purchased plan summary.
- **Molecules**
  - `src/components/ui/cards/PricingSummary.tsx` — shared summary card across all steps.
  - `src/components/ui/layout/Breadcrumb.tsx` — lightweight breadcrumb/progress indicator for onboarding flows.
- **Hooks & Utilities**
  - `src/hooks/useCartSession.ts` + `src/utils/network/retry.ts` — resilient cart session handling with backoff and offline awareness.
  - `src/hooks/useAnalytics.ts` — dispatches analytics events via `window` for later ingestion.

## Interaction Guidelines
- Always reuse atoms/molecules in `src/components/ui` before introducing new UI surface area.
- Cart/session mutations should flow through `useCartSession` to guarantee consistent retry/backoff semantics.
- Currency and numeric output must use `formatCurrency`/`formatNumber` so locale changes cascade automatically.
- Any user-facing copy must be registered in `src/locales/*/common.json` under the `pricing` namespace.

## Analytics Events
| Event | Fired From | Payload |
| --- | --- | --- |
| `pricing_cart_plan_type_selected` | `PricingCart` | `{ planType }` |
| `pricing_cart_user_count_changed` | `PricingCart` | `{ userCount }` |
| `pricing_cart_checkout_clicked` | `PricingCart` | `{ cartId, planType, userCount }` |
| `pricing_checkout_review_submitted` | `PricingCheckout` | `{ cartId, planType, userCount }` |
| `pricing_checkout_payment_confirmed` | `PricingCheckout` | `{ cartId, planType, userCount }` |
| `pricing_checkout_payment_failed` | `PricingCheckout` | `{ cartId?, error }` |
| `pricing_confirmation_viewed` | `PricingConfirmation` | `{ hasSummary }` |
| `pricing_confirmation_error` | `PricingConfirmation` | `{ message }` |

Consumers can subscribe to analytics via `import { addAnalyticsListener } from 'src/hooks/useAnalytics';`.

## Testing Checklist
- `retryWithBackoff` has unit coverage under `src/utils/network/__tests__/retry.test.ts`.
- Add component tests for `PricingCart` and `PricingCheckout` when we introduce the new Playwright smoke suite.
- Manual smoke: offline cart update, expired cart refresh, payment failure fallback.
