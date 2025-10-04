# Onboarding Flows Improvement Plan

## Vision
- Deliver resilient, accessible, and localized pricing & checkout flows that accelerate onboarding and match the experience outlined in `ONBOARDING_FLOWS_PLAN.md`.
- Preserve design-system fidelity by leaning on the existing atomic component library and only introducing new surface area when a genuine gap exists.

## Guardrails & Standards
- **Atomic layering first**: reuse atoms/molecules under `src/components/ui` (e.g. `ui/input/NumberInput.tsx`, `ui/cards/PlanCard.tsx`, `ui/layout/LoadingSpinner.tsx`) before promoting new components.
- **Extend before create**: enhance `PricingCart.tsx`, `PricingCheckout.tsx`, `PricingConfirmation.tsx`, `PricingModal.tsx`, and `PlanCard.tsx` ahead of net-new UI; additions must integrate cleanly with the existing exports in `src/components/ui`.
- **Localization-first**: all copy routes through `useTranslation` and `translationKeys.ts`; price and number formatting come from a locale-aware helper instead of hard-coded `en-US` values.
- **Accessibility as default**: follow patterns in `src/components/ui/accessibility` for focus management, live regions, and keyboard navigation.
- **Single data seam**: encapsulate cart/checkout side effects in dedicated hooks/services so mocks can be swapped for real APIs without touching UI layers.
- **Quality gates**: expand unit, component, and E2E coverage; include Storybook (or equivalent) entries for any refactored molecules/organisms.

## Gap Snapshot
- **Reliability**: cart + checkout rely on optimistic mocks, lack retry/backoff, and do not surface session expiry or offline states.
- **UX**: minimal loading/skeleton support, no confirmation or undo flows, and no guided navigation between steps.
- **Accessibility & intl**: focus restoration and ARIA feedback are missing; price formatting is fixed to `en-US`; translation keys are incomplete.
- **Observability & documentation**: limited analytics/toast patterns for failures; onboarding documentation and translations are out of sync.

## Roadmap Overview
| Phase | Focus | Priority | Key Outcomes |
| --- | --- | --- | --- |
| 0 | Discovery & alignment | 🔴 | Confirm scope, audit component inventory, capture baseline metrics |
| 1 | Reliability & data integrity | 🔴 | Resilient cart + checkout requests, consistent error handling, session safety |
| 2 | Guided UX & conversion | 🔴 | Predictable loading/transition states, confirmation patterns, contextual navigation |
| 3 | Accessibility & global readiness | 🟡 | Keyboard + screen reader parity, locale-aware formatting, translation coverage |
| 4 | Observability & enablement | 🟢 | Analytics/logging hooks, documentation, rollout plan |

---

## Phase 0 – Discovery & Alignment (🔴)
- [ ] Review `ONBOARDING_FLOWS_PLAN.md`, `PricingCart.tsx`, `PricingCheckout.tsx`, `PricingConfirmation.tsx`, and `PricingModal.tsx` to build a single annotated user journey.
- [ ] Inventory existing atoms/molecules related to forms (`ui/input`, `ui/form`, `ui/layout`) and capture reuse opportunities before proposing new UI.
- [ ] Audit current translation keys in `src/components/ui/i18n/translationKeys.ts`; list missing keys for cart/checkout copy.
- [ ] Capture baseline telemetry (current errors, analytics, support pain points) to measure improvement impact.
- **Exit criteria**: shared journey diagram, component reuse checklist, confirmed translation backlog.

## Phase 1 – Reliability & Data Integrity (🔴)
- [ ] Extract cart session logic into `hooks/useCartSession.ts` that wraps `mockPaymentDataService` today and a real API tomorrow; expose loading, retry, and error states.
- [ ] Add retry with exponential backoff and timeout control inside the hook using a new utility in `src/utils/network/retry.ts` (shared by future network calls).
- [ ] Extend `PricingCart.tsx` to drive session creation/update entirely through `useCartSession`, surfacing inline errors with `ui/form/FormMessage` and `Toast` notifications.
- [ ] Reuse `ui/layout/LoadingSpinner.tsx` and `useToast` for background fetch states; surface offline + timeout states with localized copy.
- [ ] Implement session expiration handling in the hook (localStorage cleanup, refresh prompts via `PricingModal.tsx`).
- [ ] Harden optimistic concurrency using the existing `requestIdRef` pattern; expose helpers from the hook instead of duplicating logic in components.
- **Exit criteria**: simulated network failures recover gracefully, QA sign-off on refresh/session edge cases, unit tests cover hook state transitions.

## Phase 2 – Guided UX & Conversion (🔴)
- [ ] Replace custom user count controls with `ui/input/NumberInput.tsx` inside `ui/form/FormField` to inherit validation and accessibility.
- [ ] Extract a reusable `PricingSummary` molecule that composes `PlanCard` rather than building a new card; share between cart and checkout.
- [ ] Extend `PricingCheckout.tsx` with real form fields using existing `ui/form` primitives and validation helpers under `src/components/ui/validation`.
- [ ] Add loading + transition states using `ui/layout/LoadingSpinner.tsx`, skeleton placeholders, and animated transitions from the layout primitives.
- [ ] Introduce confirmation and undo flows by composing `Modal.tsx` with current form components; destructive actions require explicit confirmation.
- [ ] Provide breadcrumb/progress context by enhancing `ui/layout/SectionDivider.tsx` into a breadcrumb molecule (only if current layout cannot be adapted).
- **Exit criteria**: end-to-end happy paths with skeleton/loading states, design review signed off, no bespoke atoms introduced without approval.

## Phase 3 – Accessibility & Global Readiness (🟡)
- [ ] Wire focus management using utilities in `src/components/ui/accessibility` (focus trap, skip links) across cart → checkout → confirmation.
- [ ] Add ARIA live regions for price, error, and success updates; route every string through `useTranslation` and extend `translationKeys.ts` accordingly.
- [ ] Replace hard-coded currency formatting with a shared `formatCurrency` helper that respects the active locale from `useTranslation`.
- [ ] Enable keyboard navigation for plan selection by expanding `ui/cards/PlanCard.tsx` props (`onFocus`, `onKeyDown`, `aria-pressed`) instead of duplicating components.
- [ ] Validate high-contrast and reduced-motion preferences; integrate with existing settings infrastructure where available.
- **Exit criteria**: axe-core/lighthouse passes, localization smoke tests for at least two locales, price formatting respects locale.

## Phase 4 – Observability & Enablement (🟢)
- [ ] Instrument key actions (plan select, cart change, checkout submit, error states) using the existing analytics pattern alongside `useToast` feedback.
- [ ] Document flows and component responsibilities in `docs/onboarding/README.md`, highlighting atomic layering and reuse contracts.
- [ ] Provide Storybook (or equivalent) stories for refactored molecules/organisms to support design review.
- [ ] Define rollout + monitoring checklist (feature flags, alerting, support readiness) before shipping.
- **Exit criteria**: dashboards/alerts ready, documentation merged, design/dev handoff assets signed off.

---

## Component & Hook Actions

**Enhance Existing**
- `src/components/PricingCart.tsx`: refactor to use `NumberInput`, surface hook-driven loading/error states, and ensure all strings are localized.
- `src/components/PricingCheckout.tsx`: integrate shared form molecules, add confirmation flows, and localize copy.
- `src/components/PricingConfirmation.tsx`: reuse shared summary components and extend localization coverage.
- `src/components/ui/cards/PlanCard.tsx`: add keyboard + screen reader support and expose new props for reuse.
- `src/components/PricingModal.tsx`: orchestrate confirmation dialogs and expired session prompts using existing modal primitives.
- `src/components/ErrorBoundary.tsx`: wrap pricing route components for graceful failure handling.

**New (Only Where Gaps Exist)**
- `src/hooks/useCartSession.ts`: centralized session management with retry/timeout/offline awareness.
- `src/utils/network/retry.ts`: shared retry/backoff helper for fetch-based workflows.
- `src/components/ui/layout/Breadcrumb.tsx` (optional): build only if `SectionDivider` cannot express breadcrumb requirements; follow the atom → molecule path.

---

## Testing & Quality Gates
- Unit tests for `useCartSession` covering success, retry, timeout, and expiration paths.
- Component tests for `PricingCart` and `PricingCheckout` validating translations, validation states, and navigation.
- E2E smoke tests for cart → checkout → confirmation, including offline and expired-session scenarios.
- Accessibility regression checks (axe-core) and locale snapshot tests.
- Manual QA scripts stored in `docs/testing/onboarding.md` for support teams.

---

## Milestones & Exit Criteria
- **Reliability Ready**: critical failure scenarios handled gracefully, automated tests green, manual QA sign-off complete.
- **Conversion Ready**: UX acceptance from design/product, conversion analytics configured, no regressions in existing metrics.
- **Global Ready**: localization available for priority locales, currency/number formatting dynamic, accessibility audits passed.
- **Enablement Complete**: documentation merged, stories published, rollout checklist approved by stakeholders.
