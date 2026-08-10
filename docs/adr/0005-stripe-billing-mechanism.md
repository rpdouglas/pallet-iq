# ADR-0005: Stripe billing mechanism — Checkout, webhook, and subscription state

**Status:** Proposed
**Date:** 2026-08-10

## Context

Phase 0's spec (`docs/projects/PROJ-PALLETIQ.md`) calls for "Stripe billing
integration (Free/Pro tiers minimum; usage metering hooks)," with QA
verification: "a test Stripe subscription can be created, upgraded, and
canceled end-to-end." The spec doesn't define real price points or
feature-gating rules for Free vs. Pro — no Phase 1+ feature exists yet to
gate. Per the Planning-gate conversation for `PALLETIQ-003`, this ticket
scaffolds the billing _mechanism_ only: proving checkout → webhook →
subscription-state round-trips against Stripe's test mode with placeholder
pricing. Real tier economics (what Free/Pro actually include, at what price)
is deferred to whichever later ticket first needs to gate a real feature on
tier.

`firestore.rules` already has a `tenants/{tenantId}/subscriptions/{docId}`
block from `PALLETIQ-001` (`read: isOwner`, `write: false` — Cloud Functions/
webhook only) and `firestore.rules.test.ts` already asserts a
`subscriptions/current` doc shape (`{ plan: 'pro' }`) — so the single-doc-
per-tenant location and owner-only-read posture were effectively decided
before this ADR; this ADR covers how that doc gets written and what else is
needed around it.

Separately: the Stripe secret key and webhook signing secret are the first
real third-party credentials this codebase needs to store server-side.
`PALLETIQ-004` (Secret Manager wiring) is still Planned/not started — per the
Planning-gate conversation, this ticket pulls the minimal slice of that work
forward rather than storing a live payment-processor secret in a less secure
location (Firebase Functions config / plaintext env), since undoing that
later means rotating a credential that's already been deployed.

## Decision

**Tiers: implicit Free, explicit Stripe Pro.** A tenant with no
`subscriptions/current` doc (or `plan: 'free'`) is on Free — there's no
Stripe object representing it. "Upgrading" means creating a real Stripe
Subscription against one placeholder test-mode Price for Pro. This avoids
modeling a `$0` Stripe Price/Subscription for something that isn't actually
billed.

**Checkout: Stripe Checkout Session (hosted), not Elements.** An
owner-only HTTPS Callable, `createCheckoutSession`, creates a Stripe
Checkout Session for the tenant's Pro price and returns its URL for the
client to redirect to. Stripe's hosted page owns card entry and PCI
compliance; the app never touches raw card data. This fits a codebase with
no billing UI or design-system billing pattern yet — building a compliant
custom Elements form now would be inventing UI ahead of any actual page
that hosts it (`PALLETIQ-006` onboarding hasn't started).

**Subscription state: a Stripe webhook Cloud Function
(`stripeWebhook`), not the client, writes `subscriptions/current`.** An
`onRequest` HTTPS function (not `onCall` — Stripe calls this directly, not
through the client SDK) verifies the `Stripe-Signature` header against the
raw request body using the webhook signing secret, then handles:

- `checkout.session.completed` — first-time subscribe: write
  `stripeCustomerId`, `stripeSubscriptionId`, `plan: 'pro'`,
  `status: 'active'`.
- `customer.subscription.updated` — plan/status changes (e.g. past_due,
  canceled-at-period-end): sync `status`.
- `customer.subscription.deleted` — subscription actually ends: revert to
  `plan: 'free'`.

`subscriptions/current` shape:

```
plan: string          // "free" | "pro"
status: string         // "active" | "past_due" | "canceled" | "free"
stripeCustomerId: string | null
stripeSubscriptionId: string | null
currentPeriodEnd: timestamp | null
usage: map              // usage-counter hooks, see below
updatedAt: timestamp
```

`createTenant` (`functions/src/auth/createTenant.ts`) additionally
initializes `subscriptions/current` with `plan: 'free'` at tenant creation,
so the doc always exists rather than "no doc" meaning Free by absence —
simpler for any future read path to depend on.

**Usage metering: hooks only, not wired to a real feature.** A single
internal helper, `incrementUsage(tenantId, key)` (`functions/src/billing/`),
does an atomic `FieldValue.increment(1)` on `subscriptions/current`'s `usage`
map. No caller exists yet — no Phase 1 feature (manifest import, etc.) is
built to call it. This exists so the counter shape and write path are
proven now and Phase 1+ tickets call an existing helper instead of designing
usage tracking from scratch under time pressure.

**Secrets: `firebase-functions/params`' `defineSecret`, backed by Secret
Manager**, not a manually-wired `@google-cloud/secret-manager` client. Two
secrets: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. `defineSecret`
binds a Secret Manager secret version to a function at deploy time (the
value is injected as an env var at invocation, IAM-scoped per function,
never in function source or Functions config) — this is the same
"Firebase's native integration does the plumbing" pattern `ADR-0004` found
for Cloud Tasks, and it's the minimal slice of `PALLETIQ-004`'s scope this
ticket actually needs. `PALLETIQ-004` stays open for any _other_ third-party
credential (there are none yet), narrowed accordingly when it's picked up.

## Alternatives considered

- **Stripe Elements embedded checkout form.** Rejected for now — no billing
  UI or design-system pattern exists to host it in yet; Checkout redirect
  reaches the same QA criterion ("a test subscription can be created,
  upgraded, canceled end-to-end") with far less surface area. Revisit once
  there's a real onboarding/billing page and a reason to keep the tenant
  in-app during payment.
- **Explicit `$0` Free-tier Stripe Price/Subscription**, so every tenant
  always has a Stripe Subscription object. Rejected — adds a Stripe API call
  and object to manage for a tier that isn't actually billed; "no doc /
  `plan: free`" is simpler and Stripe's own recommended pattern for freemium
  is exactly "no subscription until they pay."
- **Sync subscription state via client-side `redirect_status` query param
  after Checkout**, instead of a webhook. Rejected — trivially spoofable (a
  client could hit the return URL with a fake success param without ever
  paying); webhooks are the only source Stripe itself signs, and Stripe's
  own docs treat client-side redirect handling as UX-only, never as the
  system of record.
- **Manual `@google-cloud/secret-manager` client calls** instead of
  `defineSecret`. Rejected — more code to read/cache/rotate secrets
  correctly, for no benefit over the parameterized-config mechanism
  Firebase Functions v2 already ships for exactly this.
- **Defer this ticket until `PALLETIQ-004` closes**, so Secret Manager
  wiring isn't done piecemeal. Rejected per the Planning-gate conversation —
  blocking Phase 0's billing ticket on an unscoped, unstarted ticket just to
  preserve strict ordering costs more than pulling the minimal secret-wiring
  slice forward now.

## Consequences

- Requires a real Stripe account (test mode) and one test-mode Product/Price
  for Pro, created out-of-band (Stripe Dashboard or CLI) — manual setup
  similar to the Cloud Tasks queue (`ADR-0004`) and Storage bucket
  (`PALLETIQ-018`) before it.
- Requires provisioning two Secret Manager secrets in `mrt-pallet-iq`
  (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) and granting the Cloud
  Functions service account `secretmanager.secretAccessor` on both —
  manual, one-time infra step.
- `stripeWebhook` is a public, unauthenticated-by-Firebase-Auth HTTPS
  endpoint by necessity (Stripe calls it, not a signed-in tenant member) —
  its entire security boundary is the Stripe signature check on the raw
  body. This is a different trust model from every other function in the
  codebase so far (all currently `onCall`, gated by `request.auth`) and
  needs its own scrutiny in review, not the same checklist as an `onCall`.
- `PALLETIQ-004` is narrowed at close time (or when next picked up) to
  "remaining" third-party secrets, since Stripe's are handled here.
- Real Free/Pro feature differentiation (what Pro actually unlocks) is
  explicitly not decided by this ADR — whichever ticket first needs to gate
  a feature on `plan` reads `subscriptions/current.plan` client-side (already
  covered by `useAuth`-adjacent tenant state) and/or checks it in
  `firestore.rules`, but the gate logic itself doesn't exist yet.
- No live end-to-end verification path exists via the Firebase Emulator
  Suite for real Stripe webhook delivery (same class of gap as Cloud Tasks
  in `ADR-0004`) — Stripe's CLI (`stripe trigger`, `stripe listen`) can
  forward test events to a local/deployed endpoint, which is the intended
  verification path, not the emulator suite.
