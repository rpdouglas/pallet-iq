# Backlog

Ticket IDs are `PALLETIQ-NNN`, allocated sequentially, never reused. Status
follows the 3-phase gate model in [`docs/GOVERNANCE.md`](./GOVERNANCE.md):
Planned → In Progress → Done. Priority is P0 (blocking) / P1 / P2.

| ID           | Title                                                                               | Persona       | Phase | Status      | Priority |
| ------------ | ----------------------------------------------------------------------------------- | ------------- | ----- | ----------- | -------- |
| PALLETIQ-001 | Multi-tenant Firestore schema + security rules (with automated rules tests)         | Owner/Admin   | 0     | Done        | P0       |
| PALLETIQ-002 | Auth custom claims (`tenantId`, `role`) + RBAC scaffolding                          | Owner/Admin   | 0     | Done        | P0       |
| PALLETIQ-003 | Stripe billing integration (Free/Pro tiers, usage metering hooks)                   | Owner/Admin   | 0     | In Progress | P2       |
| PALLETIQ-004 | Secret Manager wiring for third-party credentials                                   | Owner/Admin   | 0     | Done        | P1       |
| PALLETIQ-005 | Async AI task pipeline scaffolding (Cloud Tasks/Pub-Sub)                            | Buyer         | 0     | Done        | P0       |
| PALLETIQ-006 | Authentication + tenant onboarding flow (incl. empty-state UX)                      | Owner/Admin   | 1     | Done        | P0       |
| PALLETIQ-007 | Vendor management for 2–3 vendors, 1–2 manifest formats (CSV + XLSX)                | Buyer         | 1     | Done        | P0       |
| PALLETIQ-008 | Manifest import → data normalization → common product schema                        | Buyer         | 1     | Done        | P0       |
| PALLETIQ-009 | Landed cost calculator (purchase price + freight/fees)                              | Buyer         | 1     | Done        | P1       |
| PALLETIQ-010 | Basic dashboard (today's opportunities, recent imports, inventory totals)           | Buyer         | 1     | Done        | P1       |
| PALLETIQ-011 | Basic inventory lifecycle tracking (Purchased → Received → Listed → Sold)           | Warehouse     | 1     | Done        | P1       |
| PALLETIQ-012 | Manifest upload security hardening (size limits, sandboxed parsing, no macros)      | Buyer         | 1     | Done        | P0       |
| PALLETIQ-013 | Provision Firebase project + wire real project ID into repo config                  | Owner/Admin   | 0     | Done        | P0       |
| PALLETIQ-014 | Cloud Functions package scaffold (functions/, deploy target, CI job)                | Owner/Admin   | 0     | Done        | P1       |
| PALLETIQ-015 | CI/CD deploy workflow for Firebase Hosting on merge to main                         | Owner/Admin   | 0     | Done        | P1       |
| PALLETIQ-016 | Wire design system into Tailwind v4 tokens, fonts, and icon library                 | Owner/Admin   | 0     | Done        | P1       |
| PALLETIQ-017 | Replace favicon/icon assets with brand-correct marks (Check IV gap)                 | Owner/Admin   | 0     | Done        | P2       |
| PALLETIQ-018 | Provision Cloud Storage bucket + wire storage.rules into repo config                | Owner/Admin   | 0     | Done        | P1       |
| PALLETIQ-019 | Replace 3-element auth-card brand mark with flattened logo lockup image             | Owner/Admin   | 1     | Done        | P2       |
| PALLETIQ-020 | Scheduled restock.ca lot scraper (Track A, SPEC-SOURCING-INTEL-002)                 | Buyer         | 4     | Done        | P1       |
| PALLETIQ-021 | Manual sourcing watchlist for B-Stock / Direct Liquidation (Track B)                | Buyer         | 4     | Done        | P2       |
| PALLETIQ-022 | Allocate lot purchase price across line items with no per-item cost                 | Buyer         | 1     | Done        | P1       |
| PALLETIQ-023 | Fix `totalPurchasePrice = 0` mishandled as "no price given" in lot-price allocation | Buyer         | 1     | Done        | P1       |
| PALLETIQ-024 | Fix negative manifest unit cost silently replaced by flat lot-price rate            | Buyer         | 1     | Done        | P1       |
| PALLETIQ-025 | Treasure Hunter: item capture + Gemini vision/grounding identification pipeline     | Buyer         | 2     | Done        | P1       |
| PALLETIQ-026 | Treasure Hunter: pricing waterfall v1 (cache/UPC/grounding/eBay) + confidence UI    | Buyer         | 2     | Done        | P1       |
| PALLETIQ-027 | Treasure Hunter: category-specialist pricing + saleability score                    | Buyer         | 2     | Done        | P2       |
| PALLETIQ-028 | Treasure Hunter: outcome-data flywheel into `product_intelligence`                  | Buyer         | 4     | Planned     | P2       |
| PALLETIQ-029 | Treasure Hunter: fashion/sneaker category via compliant paid vendor                 | Buyer         | 4     | Planned     | P2       |
| PALLETIQ-030 | Treasure Hunter: listing title/description generation from scan record              | Store Manager | 4     | Done        | P2       |
| PALLETIQ-031 | Fix restock.ca scraper dropping lots with prefixed lot numbers (e.g. `105-XXXXXX`)  | Buyer         | 4     | Done        | P1       |
| PALLETIQ-032 | Fix restock.ca scraper OOM-crashing on every run past the first                     | Buyer         | 4     | Done        | P1       |
| PALLETIQ-033 | Treasure Hunter: dedicated saleability-only retry (not a full pricing re-run)       | Buyer         | 2     | Done        | P2       |
| PALLETIQ-034 | Fix item-scan capture: second photo silently fails; add "choose from device"        | Buyer         | 2     | Done        | P1       |
| PALLETIQ-035 | Treasure Hunter: replace pricing waterfall with SOP-modeled LLM research (CAD)      | Buyer         | 2     | Done        | P1       |
| PALLETIQ-036 | Fix item-scan capture friction: photo compression + loading indicators              | Buyer         | 2     | Done        | P1       |
| PALLETIQ-037 | Verify pricing comps (Kijiji/eBay) actually resolve before trusting them            | Buyer         | 2     | Done        | P2       |
| PALLETIQ-038 | Speed up pricing research: split the single Gemini call into parallel legs          | Buyer         | 2     | Done        | P1       |
| PALLETIQ-039 | Browse discovered lots UI (restock.ca scraper results)                              | Buyer         | 4     | Done        | P2       |
| PALLETIQ-040 | Fix restock.ca scraper category field sometimes containing item title, not category | Buyer         | 4     | Done        | P2       |
| PALLETIQ-041 | Import discovered restock.ca lot's manifest into tenant inventory (`ADR-0015`)      | Buyer         | 4     | Done        | P2       |
| PALLETIQ-042 | Score imported lot for profitability via text-based pricing research (`ADR-0015`)   | Buyer         | 4     | Planned     | P2       |
| PALLETIQ-043 | Dismiss a discovered restock.ca lot from the tenant's Discovered Lots list          | Buyer         | 4     | Done        | P2       |
| PALLETIQ-044 | Fix fetchManifestLink.ts extracting a false-positive nav link, not a real manifest  | Buyer         | 4     | Planned     | P1       |
| PALLETIQ-045 | Log Gemini usage per call site and fix pricing retry-amplification bug              | Buyer         | 2     | Planned     | P1       |

## Adding a ticket

New tickets go through the Planning gate first (see `docs/GOVERNANCE.md`)
before landing here with a Phase and Priority assigned.

_Note on `PALLETIQ-001` (2026-08-08, closed): the schema/rules scaffold itself
had already shipped (`firestore.rules` has all 23 tenant/role-scoped collection
blocks defined). What "In Progress" tracked was the rules-test-coverage gap —
now closed. `firestore.rules.test.ts` went from 13 tests covering 5 of 23
collections to 81 tests covering all 23 (`assertSucceeds`/`assertFails` pairs,
`describe.each`-parameterized for collections sharing an RBAC shape). The
parallel `storage.rules` gap (zero automated tests) closed too — new
`storage.rules.test.ts`, 5 tests proving tenant isolation. See
`docs/ACTIVE_CYCLE.md`'s drift notes for what diverged from this plan._

_Scope note on `PALLETIQ-002` (2026-08-08) — Planning gate only, not started:_

_In scope:_ a trusted server-side mechanism (Cloud Function, Admin SDK — custom
claims can never be set client-side) that sets Firebase Auth custom claims
(`tenantId`, `role`) on a user, covering two paths: **(a) tenant bootstrap** —
the first user of a new tenant becomes `role: "owner"` automatically, and
**(b) invite** — an existing Owner assigns `tenantId` + a role to a new/
existing user (`docs/personas/owner-admin.md`: "Only role permitted to remove
or demote other tenant members"). Also: the `users/{userId}` Firestore doc
mirroring those claims (already has rules in `firestore.rules`, this ticket is
what starts writing to it), and client-side RBAC scaffolding — a hook/context
exposing the current user's `tenantId`/`role` (per `src/types/auth.ts`'s
existing `TenantClaims`/`Role` types) plus a route-guard/permission-check
utility for gating UI.

_Out of scope, deferred:_ tenant onboarding/signup UI and empty-state UX
(`PALLETIQ-006`, Phase 1); invite-teammate UI itself; per-page/per-component
RBAC enforcement in real product UI (happens per-feature as pages get built —
governance Check III applies then, not here); Cloud Functions CI/deploy
pipeline (`PALLETIQ-015`); MFA/additional sign-in providers (noted as a live-
infra follow-up in `docs/ACTIVE_CYCLE.md`, unrelated to this ticket's scope).

_Firestore/RBAC impact:_ `users/{userId}` collection; all four roles affected
(`owner`/`manager`/`warehouse`/`buyer`) since this is the foundational
mechanism every role's claims flow through. Must produce claims compatible
with `firestore.rules`'s `hasRole`/`isOwnerOrManager`/`isOwner` helpers and
`docs/personas/*.md`'s permission tables — per `CLAUDE.md`, these three stay
in sync.

_Dependency flag:_ needs at least a minimal Cloud Functions package to exist
(`PALLETIQ-014` is `Planned`, not started) — either scope a thin Functions
package as part of this ticket or sequence `014` first. Decide during the
implementation planning pass.

_ADR:_ written — see
[`docs/adr/0003-auth-custom-claims-rbac-mechanism.md`](../adr/0003-auth-custom-claims-rbac-mechanism.md)
(2026-08-08). Decision: 4 HTTPS Callables (`createTenant`, `inviteMember`,
`acceptInvite`, `updateMemberRole`), not a Firestore trigger or Auth blocking
function. Also found and scoped in: `firestore.rules`'s `users/{userId}`
block currently lets a client self-set its own `tenantId`/`role` fields on
create/update — needs tightening to Admin-SDK-only for those two fields as
part of this ticket's implementation, not deferred.

_Note on `PALLETIQ-006` (2026-08-08, superseded 2026-08-10): when this ticket
starts (first real multi-page auth/onboarding flow), that's the trigger to
reconsider Playwright — deferred until now because there was nothing
E2E-worthy to test. See the testing/security review in this cycle's drift
notes for the full reasoning. **Superseded:** the owner asked to keep and
use Playwright now, during `PALLETIQ-016`, rather than wait for `PALLETIQ-006`
— see that ticket's drift note in `ACTIVE_CYCLE.md`. `@playwright/test` is now
a permanent devDependency, not a one-off tool._

_Scope note on `PALLETIQ-015` (2026-08-08):_

_In scope:_ a new CI job that builds the app and deploys to Firebase Hosting
(`mrt-pallet-iq.web.app`), gated on the existing `Lint, typecheck, unit tests`
and `Firestore rules tests` jobs passing first, triggered only on push to
`main` (not on PRs — no preview-channel deploys in this pass). Uses
`FirebaseExtended/action-hosting-deploy@v0` authenticated via a dedicated
service account (`palletiq-ci-hosting-deploy`) scoped to the `Firebase
Hosting Admin` IAM role only on `mrt-pallet-iq` — not a broader role, and not
reused from any other project. The key is stored as a GitHub Actions secret,
never committed.

_Out of scope, deferred:_ preview-channel deploys on PRs; Cloud Functions
deploy (separate concern, `PALLETIQ-014`); any deploy target beyond Hosting.

_ADR:_ not written — this is standard, well-established CI/CD wiring using
Google's own official GitHub Action, not a novel architectural decision with
real alternatives to weigh.

_Scope note on `PALLETIQ-014` (2026-08-08):_

_In scope:_ a self-contained `functions/` npm package (own `package.json`,
`node_modules`, `tsconfig.json` — deliberately not part of the root package's
dependency graph, so the deployed bundle doesn't drag in frontend deps like
React/Vite) with one minimal placeholder HTTPS function proving the pipeline
works end-to-end. `firebase.json`'s `functions` deploy target (source +
predeploy build hook) and `functions` emulator port, matching the existing
auth/firestore/storage/hosting emulator entries. A new CI job that installs,
lints, typechecks, and builds `functions/` — mirroring the root's job, scoped
to the subdirectory. Root `eslint.config.js` updated so `functions/**/*.ts`
lints with Node globals, not browser globals.

_Out of scope, deferred:_ the actual RBAC/claims-setting function logic
(`PALLETIQ-002`); **auto-deploying functions on merge to main** — unlike
Hosting (`PALLETIQ-015`), functions can have real side effects, so
auto-deploy-on-merge is a deliberate non-default here, not an oversight;
deploys stay manual (`firebase deploy --only functions`) until a ticket
actually needs one live and makes that call explicitly.

_ADR:_ not written — this is package/tooling scaffolding, not an
architectural decision (no logic to have alternatives about yet).

_Scope note on `PALLETIQ-005` (2026-08-08) — Planning gate only, not started:_

_In scope:_ the async task queue mechanism itself, proven end-to-end with one
dummy task type — not real Gemini/Vertex integration (that's Phase 2's "async
batched Gemini product analysis," `docs/ROADMAP.md`). Concretely: an HTTPS
Callable (`enqueueDummyTask`) that creates a `tenants/{tenantId}/ai_tasks/{taskId}`
doc and enqueues a Cloud Tasks task; an HTTP-triggered worker function
(`processDummyTask`), authenticated via Cloud Tasks' OIDC mechanism, that
processes it and writes the result back; the `ai_tasks` collection's
`firestore.rules` block + `firestore.rules.test.ts` coverage (Check I);
provisioning the actual Cloud Tasks queue and its invoker service account in
`mrt-pallet-iq`.

_Out of scope, deferred:_ any real Gemini/Vertex SDK call or product-analysis
logic (Phase 2); Secret Manager wiring for the eventual Gemini API key
(`PALLETIQ-004`, separate ticket — the dummy task needs no credentials); any
UI surfacing task status to a user (no async-AI-consuming UI exists yet);
rate-limit/concurrency tuning specific to Gemini's real quotas (can't tune
against limits that don't apply to a dummy call).

_Firestore/RBAC impact:_ new collection `tenants/{tenantId}/ai_tasks/{taskId}`.
`read: isTenantMember` (any authenticated tenant member can poll task
status — matches other operational collections); `write: if false`
(Cloud Functions only, mirroring `analytics_rollups`/`audit_logs`).

_Known verification gap, flagged up front:_ the Firebase Emulator Suite has no
Cloud Tasks emulator. The enqueue/worker logic gets unit-tested in isolation
(mocked Cloud Tasks client + Admin SDK, same pattern as `PALLETIQ-002`'s
callables); the real end-to-end queue round-trip is verified live against the
GCP project, not via CI or the emulator suite.

_ADR:_ written — see
[`docs/adr/0004-async-ai-task-pipeline-cloud-tasks.md`](../adr/0004-async-ai-task-pipeline-cloud-tasks.md)
(2026-08-08). Decision: Cloud Tasks (not Pub/Sub) for the queue mechanism, plus
a new `ai_tasks` collection for task-status tracking/polling, built now so
Phase 2's real pipeline reuses this shape instead of designing it from scratch.

_Scope note on `PALLETIQ-003` (2026-08-10) — Planning gate only, not started:_

_In scope:_ the billing _mechanism_, proven end-to-end in Stripe test mode —
not real Free/Pro pricing or feature-gating (no Phase 1+ feature exists yet to
gate). Concretely: an owner-only HTTPS Callable (`createCheckoutSession`) that
creates a Stripe Checkout Session for a single placeholder test-mode Pro
price and returns its redirect URL; an unauthenticated-by-Firebase `onRequest`
webhook (`stripeWebhook`) that verifies Stripe's signature and syncs
`tenants/{tenantId}/subscriptions/current` on `checkout.session.completed`/
`customer.subscription.updated`/`customer.subscription.deleted`;
`createTenant` initializing that doc with `plan: 'free'` at tenant creation;
an internal `incrementUsage(tenantId, key)` helper (usage-counter hook, no
caller yet); the two Secret Manager secrets (`STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`) this needs, via `firebase-functions/params`'
`defineSecret` — pulled forward from `PALLETIQ-004` per the Planning-gate
conversation, since a live payment-processor credential shouldn't sit in a
less secure spot in the meantime.

_Out of scope, deferred:_ real Free/Pro price points and feature
differentiation (whichever ticket first needs to gate a feature on `plan`
decides that then); any billing/upgrade UI (no page exists to host a
Checkout-redirect button yet — this ticket is only the Callable + webhook);
Stripe Elements/embedded checkout (deferred until there's a real billing page
and a reason to keep the tenant in-app during payment, see ADR-0005); usage
_enforcement_ (the `incrementUsage` hook exists, nothing calls it or checks
limits yet — no Phase 1 feature exists to meter); any other third-party
secret (`PALLETIQ-004` stays open, narrowed to "remaining" secrets since
Stripe's are handled here).

_Firestore/RBAC impact:_ `tenants/{tenantId}/subscriptions/current` —
schema now defined (previously rules-only, no shape). No `firestore.rules`
change expected (`PALLETIQ-001` already scaffolded `read: isOwner`,
`write: false`, and `firestore.rules.test.ts` already asserts the
`subscriptions/current` path) — confirm during implementation rather than
assume, and flag `firestore-rules-auditor` if the doc shape needs a rule
adjustment.

_Known verification gap, flagged up front:_ no Stripe webhook emulator
exists in the Firebase Emulator Suite (same class of gap as Cloud Tasks in
`ADR-0004`). Verification path is Stripe CLI (`stripe trigger`,
`stripe listen`) forwarding real test-mode events to a local/deployed
endpoint, not CI or the emulator suite.

_ADR:_ written — see
[`docs/adr/0005-stripe-billing-mechanism.md`](../adr/0005-stripe-billing-mechanism.md)
(2026-08-10). Decisions: implicit Free / explicit Stripe Pro (no `$0` Stripe
object for Free); Stripe Checkout redirect, not Elements; webhook (not
client-side redirect handling) is the only source of truth for subscription
state; `defineSecret`, not a manual Secret Manager client, for the two Stripe
secrets.

_Shipped, shelved (2026-08-10):_ the mechanism above is implemented,
unit-tested, and merged — live verification against real Stripe test-mode
credentials is on indefinite hold at the owner's choice, not planned again
soon. Priority dropped `P0` → `P2` accordingly; ticket stays `In Progress`.
See `docs/ACTIVE_CYCLE.md`'s "Shelved, not a near-term blocker" section for
the resume checklist.

_Scope note on `PALLETIQ-016` (2026-08-10) — Planning gate only, not started:_

_In scope:_ turning `docs/design/Pallet-IQ-Design-System.md` into enforceable
code, per `ADR-0002`'s Consequences ("`PALLETIQ-016` is the follow-up ticket
that turns this doc into enforceable code"). Concretely: a Tailwind v4
`@theme` block in `src/index.css` defining every palette color as a named CSS
token (`--color-navy`, `--color-brand-blue`, `--color-cyan-accent`,
`--color-cloud-gray`, `--color-slate-gray`, `--color-ink-navy`,
`--color-success`, `--color-danger` — deliberately not reusing Tailwind's
built-in `blue`/`slate`/`cyan` scale names, so a brand token vs. a leftover
default is visually obvious in a diff/audit) and the five named type-scale
tokens (H1/H2/Body/Label/Metric, picking the upper bound of each doc-specified
px range as the single concrete value); self-hosted font loading for Inter
(UI/product font, becomes the default `font-sans`) and Poppins ExtraBold
(wordmark/display font, opt-in `font-display` utility) via `@fontsource/*`
packages, not a Google Fonts CDN link (avoids a third-party runtime request);
installing `lucide-react` as the icon library dependency; updating the
existing `src/App.tsx` scaffold to use the new tokens instead of default
Tailwind slate colors, closing the specific gap `CLAUDE.md`/`ADR-0002`
already call out by name.

_Out of scope, deferred:_ actual reusable UI components (Button, Card, data
table, form input, etc.) — `docs/design/components.md` itself says it "should
grow incrementally as real components get built," and the natural place to
build them is against real UI needs starting with `PALLETIQ-006`, not
speculatively here; the brand-mark/logo artwork and favicon
(`PALLETIQ-017`, separate ticket, already scoped as the Check IV asset gap);
responsive breakpoints (`docs/design/mobile-responsive.md` explicitly says
"Standard Tailwind scale — don't invent custom breakpoints," so there's
nothing to wire); dark mode (explicitly out of scope in the base doc itself).

_Design-doc gap found and closed during scoping:_ the palette table defined
6 colors, but the base doc's own delta convention plus two addenda
(`components.md` form errors, `explainable-scoring.md` contribution
indicators) all reference green/red without ever giving hex values. Resolved
with the owner: `#15803D` (Success) / `#B91C1C` (Danger), both ≥ 4.5:1 on
white per this doc's existing WCAG bar — added to the palette table itself
(not just code) so it stays canonical. Also picked Poppins ExtraBold over
Baloo 2 for the display font (doc allowed either; only one gets installed).

_Firestore/RBAC impact:_ none — this is a frontend styling/tooling ticket,
touches no Firestore collection, rule, or RBAC boundary.

_Scope note on `PALLETIQ-006` (2026-08-10) — Planning gate only, not started:_

_In scope:_ the auth + tenant-onboarding UI that `PALLETIQ-002`'s scope note
explicitly deferred here. Concretely: a **sign-up** page (email/password via
Firebase Auth, plus a tenant-name field) that, on success, calls the existing
`createTenant` callable to bootstrap a new tenant with the signing-up user as
`owner`; a **sign-in** page (email/password); an **accept-invite** page (route
carrying `tenantId`/`inviteId`/`token`, per `acceptInvite`'s existing
signature) for a user landing on an invite link, prompting sign-in/sign-up
first if needed, then calling the existing `acceptInvite` callable; a
**sign-out** action; and route-level gating built on the already-existing
`RequireRole`/`useAuth` (`PALLETIQ-002`): unauthenticated → redirect to
sign-in; authenticated with no `tenantId`/`role` claim → onboarding (create-
tenant, unless arriving via an invite link); authenticated with a tenant →
a minimal authenticated landing route. Forms use React Hook Form + Zod per
`docs/design/components.md`'s form-input pattern; route gating reuses
`docs/design/rbac-ui-patterns.md`'s "entire route unreachable" pattern rather
than a visible-but-disabled nav item. All new UI uses `PALLETIQ-016`'s design
tokens.

_Empty-state UX, scoped narrowly:_ Phase 1's QA verification
(`docs/projects/PROJ-PALLETIQ.md`) requires empty-state UX for tenant
onboarding, and `docs/design/components.md`'s Empty States pattern calls for
"one primary action button... don't show an empty state with no path forward
when a clear next action exists." Since no other Phase 1 feature UI exists yet
(vendor management is `PALLETIQ-007`, dashboard is `PALLETIQ-010`), there is
no real next-action route to link to today. The post-onboarding landing state
here is a confirmation placeholder (tenant created, centered icon + message,
per the pattern's visual treatment) without a CTA to a page that doesn't exist
yet — revisit with a real primary action once `PALLETIQ-007`'s vendor page
ships, rather than fabricate a dead link now.

_Out of scope, deferred:_ the full sidebar app shell / dashboard
(`PALLETIQ-010`); invite-**teammate** UI (the owner-side "send an invite"
form) — `PALLETIQ-002`'s scope note deferred this without assigning it a
ticket number, and it stays unassigned here too, since it's a team-management/
settings concern, not part of the signup/onboarding critical path; per-page/
per-component RBAC enforcement beyond "is there a tenant/role at all"
route gating (happens per-feature as real data pages get built — Check III
applies then, not here, same carve-out `PALLETIQ-002` used); password-reset/
forgot-password flow (a real gap for a P0 auth ticket, but not required by
Phase 1's QA criteria — flagging so it isn't forgotten, not silently dropped);
MFA/additional sign-in providers (Email/Password only, per the existing
`docs/ACTIVE_CYCLE.md` note); settings/billing/audit-log pages (all
Owner-only per `docs/personas/owner-admin.md`, none built yet, each is its own
ticket).

_UI pattern notes:_ `docs/design/mobile-responsive.md` scopes Owner/Admin as
desktop-first with the sidebar nav pattern — but these are pre-tenant/
pre-dashboard pages with no sidebar to show yet, so they're simple centered-
card layouts that are responsive by default, not an instance of that pattern.
The sidebar/app-shell pattern starts with `PALLETIQ-010`.

_Firestore/RBAC impact:_ none — no new collection or rule. All tenant/role
mutations go through the existing `createTenant`/`acceptInvite` Cloud
Functions (Admin SDK, already covered by `firestore.rules` +
`firestore.rules.test.ts` from `PALLETIQ-001`/`002`). If this ticket's
implementation ends up needing a direct client read (e.g. displaying the
tenant name), that reads `tenants/{tenantId}`, already covered by existing
rules — run `firestore-rules-auditor` before close regardless, as a parity
check, not because a new rule is expected.

_ADR:_ not written. The architectural decisions here (custom-claims mechanism,
the 4-callable shape) were already made in `ADR-0003`; this ticket only
consumes those callables from new UI and adds client-side routing — no new
data-model shape or tradeoff with real alternatives to record.

_ADR:_ not written — implementing an already-decided spec (`ADR-0002` already
made the governance decision; `Pallet-IQ-Design-System.md` already specifies
the actual values) via Tailwind v4's standard CSS-first `@theme` mechanism
isn't a novel architectural decision with real alternatives to weigh, same
reasoning as `PALLETIQ-015`'s "standard, well-established... not a novel
architectural decision."

_Scope note on `PALLETIQ-007` (2026-08-10) — Planning gate only, not started:_

_In scope:_ CRUD UI for the `vendors` collection — list, add, edit, delete —
scoped to what a real vendor record needs before manifest import
(`PALLETIQ-008`) can reference it: `name`, `manifestFormat` (`'csv' |
'xlsx'` — the ticket title's "1–2 manifest formats" is this field, not a
parser; PALLETIQ-008 reads it to pick an importer), `contactEmail`,
`contactPhone`, and `terms` (free text — the "pricing/terms" field
`docs/design/rbac-ui-patterns.md` and `docs/personas/warehouse.md` both
reference). A `SelectField` component (matches `TextField`'s visual
treatment) for the format picker, since none exists yet and this is the
first field that needs one. Wires a real `/vendors` route into `App.tsx`
(reachable by any tenant member, no role restriction — see RBAC below) and
updates `LandingPage.tsx`'s empty-state placeholder with an actual "Go to
vendors" action, closing the gap its own code comment flagged when
`PALLETIQ-006` shipped it (`docs/design/components.md`: "don't show an empty
state with no path forward when a clear next action exists" — there wasn't
one until now).

_Out of scope, deferred:_ manifest file upload/parsing/normalization
(`PALLETIQ-008` — `manifestFormat` here is metadata only, no parser is
built); vendor scorecards/reliability scoring (`docs/projects/PROJ-PALLETIQ.md`
Phase 2: "Vendor reliability scoring... a data product with value beyond the
core tool" — explicitly a later phase); vendor claims/disputes (the separate
`claims` collection, Phase 3, Warehouse-driven); sidebar/app-shell navigation
(`PALLETIQ-010` — `/vendors` is a standalone page like every page `PALLETIQ-006`
shipped, no persistent nav chrome yet).

_Firestore/RBAC impact, found while scoping — a real tightening, not just a
parity check:_ `firestore.rules`' `vendors` block currently reads `allow
write: if isOwnerOrManager(tenantId)`, but that's explicitly the file's own
documented placeholder ("Tighten per-collection as each area is implemented
— this is a safe-by-default starting point, not a final policy"). Cross-
referencing the actual persona docs for the real policy:
`docs/personas/owner-admin.md` lists `vendors` under Owner's explicit
read/write; `docs/personas/store-manager.md`'s **Read** list includes
`vendors` but its **Write** list does not; `docs/projects/PROJ-PALLETIQ.md`'s
top-level role table assigns "manages... vendors" to Owner/Admin specifically.
Tightening write to `isOwner(tenantId)` only. Read stays `isTenantMember`
(unchanged) — `docs/design/rbac-ui-patterns.md`'s own worked example lists
"Vendor pricing/terms fields (Warehouse has no access to vendor pricing)" as
a field-omission case (parallel to its Cost-column example), separate from
its own next bullet naming `settings`/`subscriptions`/`api_keys`/`audit_logs`
as the route-level "entire pages unreachable" case — so Warehouse reads the
`vendors` collection like everyone else, but the UI omits the `terms` field
for that role specifically, the first real instance of that specific pattern
(distinct from `PALLETIQ-006`'s route-level omission). `firestore.rules.test.ts`
gets `vendors` pulled out of the shared `describe.each` placeholder-policy
block into its own dedicated block (member read succeeds, cross-tenant read
denied, owner write succeeds, **manager write now denied** — a real behavior
change from today, not just added coverage — buyer write denied).

_UI pattern notes:_ `docs/design/components.md`'s Data table pattern (first
real instance in the app — zebra striping, Slate Gray sticky header, numeric
columns unused here since nothing's numeric yet); Form inputs pattern
(second instance after `PALLETIQ-006`, reusing `TextField` plus the new
`SelectField`); Empty States pattern (second instance, this time with a real
primary action for Owner — "Add your first vendor" — while non-Owner roles
correctly get no CTA per the pattern's own "don't fake a path forward" rule,
since they can't add one). `docs/design/rbac-ui-patterns.md`'s field-omission
pattern, as detailed above.

_ADR:_ not written. This is CRUD against an already-scoped Firestore
collection using the existing rules mechanism (`hasRole`/`isOwner` helpers
from `ADR-0003`); the write-permission tightening resolves an already-
documented placeholder against already-written persona docs, not a new
policy decision with real alternatives to weigh.

_Scope note on `PALLETIQ-008` (2026-08-10) — Planning gate only, not started:_

_In scope:_ turning an uploaded vendor manifest (CSV or XLSX, per the
vendor's `manifestFormat` from `PALLETIQ-007`) into normalized `lineItems`
docs under a common product schema (`sku?`, `upc?`, `description`,
`quantity`, `unitCost`, `condition?`, `category?`), with job-level status
tracking (`imports`) and per-row error tracking (`imports_errors`) for
partial failures. Concretely: client uploads the raw file to Cloud Storage,
calls a new `enqueueManifestImport` callable, a `processManifestImport`
Cloud Tasks worker parses and normalizes server-side (`papaparse` for CSV,
`exceljs` for XLSX) and writes the results. Full architecture, library
choices, and the alternatives weighed are in `ADR-0006`. A `/manifests`
route: list of past imports (vendor, format, status, row/error counts) +
an "Import manifest" form (pick vendor, upload file); clicking an import
shows its line items and any errors. Basic sane upload limits (file size
cap, extension/mimetype matches the vendor's `manifestFormat`) - not the
full `PALLETIQ-012` hardening scope, just baseline hygiene so this ticket
isn't shipping something egregiously unsafe in the meantime.

_Out of scope, deferred:_ deep upload security hardening - magic-byte
validation beyond mimetype, malware scanning, sandboxed execution beyond
"runs server-side in a Cloud Function," rate limiting (`PALLETIQ-012`,
separate ticket, already scoped for exactly this); landed cost calculation
(`PALLETIQ-009` - `unitCost` is captured here but purchase price + freight/
fees rollup is that ticket's job); creating `pallets`/`inventory` records
from imported line items (implied by "Basic inventory lifecycle tracking,"
`PALLETIQ-011`, not this ticket's literal scope of "import → normalize →
common schema"); AI enrichment/scoring of imported products (Phase 2);
manifest comparison across vendors (a Buyer need named in
`docs/personas/buyer.md`, but a query/analysis feature building on this
ticket's data, not part of ingesting it).

_RBAC, resolved with the owner during scoping - see `ADR-0006` for full
reasoning:_ `manifests`/`imports`/`lineItems` write goes to **Owner and
Buyer**, not Owner-only (the more literal reading of the current persona
docs, and what `PALLETIQ-007`'s vendors precedent would suggest) - Buyer's
role description names manifest sourcing as their core job, so import
can't depend on Owner being available for every file. Manager and
Warehouse stay read-only. `docs/personas/buyer.md`'s Write list is
corrected in this same PR to name `imports`/`manifests` explicitly, since
it previously only listed read access - a real documentation gap, not the
intended policy. `lineItems`' `unitCost` field is omitted from the UI for
Warehouse (matching `docs/design/rbac-ui-patterns.md`'s field-omission
pattern, same shape as `PALLETIQ-007`'s vendor terms/pricing), and
`storage.rules` gets a real, non-placeholder rule for the raw uploaded
file - Owner/Manager/Buyer read, Owner/Buyer write - since the raw file has
`unitCost` as a plain column and would otherwise bypass the `lineItems`
field-level omission entirely for Warehouse.

_Firestore/RBAC impact:_ `firestore.rules`' `imports`, `manifests`, and
`manifests/{id}/lineItems` blocks tighten from the placeholder
`isOwnerOrManager` to a new `isOwnerOrBuyer`-shaped check (write); read
stays `isTenantMember`. `imports_errors` write moves to Cloud-Functions-only
(Admin SDK), matching `analytics_rollups`' existing "system-populated"
pattern, since only the task worker ever creates error records - no client
write path exists for it at all. New `storage.rules` block for
`tenants/{tenantId}/manifests/{importId}/...` (see above). All of this
needs `firestore-rules-auditor` and dedicated rules-test coverage
(Firestore and Storage) before close, same as `PALLETIQ-007`.

_UI pattern notes:_ `docs/design/components.md`'s Data table pattern (third
instance, same table conventions as `PALLETIQ-007`'s vendor list) for both
the imports list and the line-items view; Form inputs pattern for the
import form (vendor picker via `SelectField`, native file input - no
documented file-upload pattern exists yet in `components.md`, flagging
that gap rather than silently inventing one); Empty States pattern for "no
imports yet" (real primary action: "Import a manifest", since this ticket
makes that a real next step); `docs/design/rbac-ui-patterns.md`'s
field-omission pattern for the `unitCost` column, as detailed above. Async
job status (`queued`/`processing`/`completed`/`failed`) has no documented
loading-state precedent beyond `components.md`'s generic skeleton-blocks
guidance - using that, not inventing a new pattern.

_ADR:_ written - see
[`docs/adr/0006-manifest-import-parsing-architecture.md`](../adr/0006-manifest-import-parsing-architecture.md).
Decision: server-side parsing reusing `PALLETIQ-005`'s Cloud Tasks
pipeline (`enqueueManifestImport` callable + `processManifestImport` task
worker), `papaparse`/`exceljs` as the parsing libraries, and the
Owner+Buyer write RBAC resolved above.

_Scope note on `PALLETIQ-009` (2026-08-10) — Planning gate only, not started:_

_In scope:_ turning each line item's `unitCost` (purchase price,
`PALLETIQ-008`) into a landed cost per unit by allocating a manifest's
shared freight/fees across its line items. Freight/fees are entered once
per `imports/{importId}` (one shipment = one manifest, matches how a buyer
actually pays for shipping) via two new optional numeric fields,
`freightCost` and `otherFees` (default 0), editable only by Owner/Buyer
(same role boundary as import write generally - no `firestore.rules`
change needed, the existing `isOwnerOrBuyer` write rule from `PALLETIQ-008`
already covers this doc). Allocation method, resolved with the owner during
scoping: **value-weighted**, proportional to each line item's share of the
import's total purchase value (`unitCost × quantity`). This is standard
landed-cost accounting (higher-value items absorb proportionally more of
shared shipping/handling) and simplifies algebraically to one clean,
explainable formula applied uniformly to every line item in the import:
`landedCost = unitCost × (1 + (freightCost + otherFees) / totalPurchaseValue)`

- i.e. every item in the same import gets the same % markup, computed
  once from the import's totals. `totalPurchaseValue = 0` (no line items, or
  all zero-cost) short-circuits to a 1× multiplier rather than dividing by
  zero. Computed client-side as a pure function, on read, wherever line
  items are displayed - not persisted as a stored field on `lineItems` docs.
  `ManifestDetailPage.tsx` gains a small "Shipping & fees" form (Owner/Buyer
  only, same visibility boundary as the existing Import action) and a new
  "Landed cost" column alongside the existing "Unit cost" column (both shown
  together, not one replacing the other - transparency about the markup
  matters for an "explainable" product, per
  `docs/projects/PROJ-PALLETIQ.md`'s design principles).

_Not persisting landed cost, and why that's not just a shortcut:_ freight/
fees can be edited after import (a corrected invoice, a discovered fee),
and a persisted-and-recompute approach would need either a Cloud Function
triggered on every edit or a client-side batch rewrite of every `lineItems`
doc in that manifest - real complexity with no current consumer that needs
landed cost to be queryable/sortable/aggregatable in Firestore itself
(nothing in Phase 1 needs "sort inventory by landed cost" - that's a
plausible Phase 2/3 need, not a real one yet). Computing on read keeps
freight/fee edits instantly reflected everywhere with no staleness window
and no extra write path. Revisit if a future ticket genuinely needs
landed cost as a queryable Firestore field - don't build that speculatively
here.

_Out of scope, deferred:_ per-line-item manual freight/fee override (the
"manual entry" allocation alternative considered and not chosen); a
dashboard-level "total landed cost across inventory" rollup
(`PALLETIQ-010`, needs a real dashboard to live in); showing landed cost
anywhere in `ManifestsPage.tsx`'s import list (that page shows job-level
status, not unit-level economics - landed cost only matters where line
items are actually visible, `ManifestDetailPage.tsx`); ROI/ bid-guidance
calculations that consume landed cost (Phase 1's "Basic dashboard" /
Phase 2's scoring engine, separate tickets - this ticket only produces the
number, not what's built on top of it).

_Firestore/RBAC impact:_ none beyond what `PALLETIQ-008` already
established. `freightCost`/`otherFees` live on the existing
`imports/{importId}` doc, already `isOwnerOrBuyer`-gated for write and
`isTenantMember`-gated for read; landed cost itself is never written to
Firestore at all (computed client-side, see above), so there's no new
field-level exposure to reason about beyond the existing `unitCost`
omission for Warehouse (`canSeeCost = role !== 'warehouse'`, already
implemented in `PALLETIQ-008`, reused as-is for the new Landed Cost
column and the freight/fees form's visibility).

_UI pattern notes:_ `docs/design/components.md`'s Form inputs pattern for
the freight/fees form (`TextField` with `type="number"` - the first
numeric input field in the app; existing text/email/tel inputs don't
establish a numeric-formatting convention, so this ticket sets one: plain
numbers, no currency-symbol input masking, formatted with a `$` prefix
only at display time via the same `.toFixed(2)` convention `PALLETIQ-008`
already used for `unitCost`); Data tables pattern (extending
`ManifestDetailPage.tsx`'s existing line-items table with one more
right-aligned numeric column, same zebra-striping/header treatment already
in place); `docs/design/rbac-ui-patterns.md`'s field-omission pattern,
reused unchanged (no new instance, same `canSeeCost` flag now gates two
cost-adjacent things instead of one).

_ADR:_ not written. The allocation _formula_ (value-weighted, simplifying
to a uniform per-import markup) is a real decision with alternatives
(quantity-weighted, manual entry) that future ROI/scoring work will build
on, but it's a business-logic/calculation choice, not an architectural or
infrastructure one - no new collection, no new Cloud Function, no new
trust boundary, nothing future code depends on beyond "call this pure
function." Resolved directly with the owner during scoping (see above)
and documented here in full, matching how this repo's existing ADRs are
all architecture/infrastructure decisions (multi-tenant shape, design
governance, auth mechanism, async pipeline, billing mechanism, manifest
parsing architecture) rather than calculation formulas.

_Scope note on `PALLETIQ-010` (2026-08-10) — Planning gate only, not started:_

_Resolved with the owner during scoping - a real gap in the ticket's own
title:_ "today's opportunities" has no data source yet (needs Phase 2's
scoring engine) and "inventory totals" has no data source yet
(`PALLETIQ-011`, not started). Rather than fake either with placeholder/
mock data or reorder the backlog to build `PALLETIQ-011` first, this
ticket ships the shell now with only real data - those two cards are
omitted entirely, not stubbed, and get added in follow-on tickets once
their real data exists.

_In scope:_

- **`AppShell`** - the sidebar nav layout this repo's own docs have been
  pointing at since `PALLETIQ-006` (`docs/design/mobile-responsive.md`:
  "sidebar nav collapses below `md`"; multiple earlier scope notes:
  "The sidebar/app-shell pattern starts with `PALLETIQ-010`"). Desktop
  (`md`+): fixed sidebar, Deep Navy → Ink Navy gradient, Brand Blue pill
  active state, per `Pallet-IQ-Design-System.md` §4's Navigation spec.
  Below `md`: collapses to a top app bar with a hamburger/drawer, per
  `mobile-responsive.md` - implementing the documented behavior for real,
  not skipping the mobile case. Nav items: **Dashboard, Vendors,
  Manifests only** - the three pages that actually exist. No dead links to
  Pallets/Inventory/Analytics/Settings, which don't exist yet.
- A react-router layout route (`<AppShell /><Outlet /></AppShell>`,
  wrapped in the existing `RequireRole`) so `/`, `/vendors`, `/manifests`,
  and `/manifests/:importId` all render inside the shell instead of each
  page carrying its own ad-hoc "← Back" links and full-page wrapper.
  `VendorsPage.tsx`, `ManifestsPage.tsx`, and `ManifestDetailPage.tsx` all
  get retrofitted to drop that now-redundant chrome (the sidebar replaces
  it) - this is a required consequence of building the shell, not scope
  creep.
- **A new `DashboardPage`** replacing the old placeholder at `/` (the
  `LandingPage.tsx` empty-state `PALLETIQ-006` shipped, explicitly
  "temporary until PALLETIQ-010"). Real content only: four stat cards
  (vendor count, manifests imported count, total line items imported,
  total import errors - all computed from fields already on the
  `imports`/`vendors` docs, no extra subcollection reads) plus a "Recent
  imports" list (last 5, vendor name resolved, status, date, links to
  `ManifestDetailPage`). None of this is cost data, so no new Check III
  field-omission concern - every role can already read `vendors`/`imports`
  today.
- `docs/design/mobile-responsive.md`'s stat-card grid breakpoints (4-up
  `xl`, 2-up `md`-`lg`, 1-up below `md`) - the first real usage of that
  spec in the app.

_Out of scope, deferred:_ "today's opportunities" card (Phase 2 scoring);
"inventory totals" card (`PALLETIQ-011`); the base design doc's "profit
trend chart" (no meaningful time-series data exists yet with only a
handful of test imports - a chart with one data point isn't worth
building; revisit once there's real import history); Warehouse's
documented mobile-first **bottom tab bar** nav (`mobile-responsive.md`
specifies this explicitly for Warehouse, but there are no real mobile
scanning screens yet for it to attach to - `PALLETIQ-011`'s job. Until
then, Warehouse also sees the standard sidebar as a pragmatic default,
which is "out of spec" for that persona but not worth a second nav
paradigm before there's a real surface for the real one).

_Firestore/RBAC impact:_ none. The dashboard aggregates fields already on
`vendors`/`imports` docs that every tenant member can already read - no
new collection, no new field-level exposure, no rules change.

_UI pattern notes:_ `Pallet-IQ-Design-System.md` §4's Navigation spec
(sidebar) and Cards/Stat-tiles spec, both implemented for the first time
in this ticket; `mobile-responsive.md`'s breakpoint table, first real
usage; `docs/design/components.md`'s Data table pattern reused for
"Recent imports" (same conventions as the vendors/imports tables already
in the app).

_ADR:_ not written. The sidebar/app-shell pattern is already fully
specified in `Pallet-IQ-Design-System.md` §4 and `mobile-responsive.md` -
implementing an already-decided design spec via standard React Router
layout routes isn't a new architectural decision, same reasoning
`PALLETIQ-016` used for wiring already-decided design tokens.

_Scope note on `PALLETIQ-011` (2026-08-11) — Planning gate only, not started:_

_Correcting a mistaken assumption in `PALLETIQ-010`'s own scope note above:_
that note deferred Warehouse's mobile-first bottom-tab-bar nav to "this
ticket's job... once there are real mobile scanning screens." Re-reading
`docs/projects/PROJ-PALLETIQ.md`'s Phase 1 vs. Phase 3 sections closely
shows that's wrong - barcode scanning and the mobile receiving flow are
explicitly **Phase 3** bullets, not Phase 1's "basic inventory lifecycle
tracking." This ticket is Phase 1 scope, so it does **not** build that nav;
it stays inside the existing desktop `AppShell` (`PALLETIQ-010`). The
bottom-tab-bar nav is deferred again, correctly this time, to whichever
future ticket actually builds Phase 3's mobile receiving/scanning screens.

_In scope:_

- **Auto-created `inventory` docs.** `processManifestImport`
  (`functions/src/manifests/processManifestImport.ts`, `PALLETIQ-008`)
  writes one `inventory` doc per successful line item in the same batch as
  the `lineItems` write, `status: 'purchased'`, referencing `lineItemId`/
  `manifestId`/`vendorId`/`unitCost` (no landed cost persisted - see
  `docs/adr/0007-inventory-lifecycle-and-auto-creation.md`). No manual
  "convert to inventory" UI action.
- **Status transitions**: Purchased → Received → Listed → Sold, one-way,
  via a simple "advance" action in the UI - no reconciliation, no
  quantity-partial receiving, no Returned status (that's Phase 3's "full
  inventory workflow").
- **New `InventoryPage`** at `/inventory`, inside the existing `AppShell`
  nav (joins Dashboard/Vendors/Manifests), desktop table pattern matching
  `VendorsPage`/`ManifestsPage` - not a new mobile-first surface (see
  correction above).
- `firestore.rules`' `inventory` block moves off the Phase-0 placeholder
  (`isOwnerOrManager` write) onto a real policy: read `isTenantMember`,
  write a new `isOwnerOrManagerOrWarehouse` helper. Buyer stays read-only,
  matching `docs/personas/buyer.md`.
- Cost-field hiding from Warehouse on the inventory table (`unitCost`
  column omitted from the DOM, not CSS-hidden), reusing the `canSeeCost`
  pattern from `PALLETIQ-008`/`009` - the one piece of Check III relevant
  here that's cheap and already established, unlike full per-transition
  RBAC (see below).

_Out of scope, deferred:_ per-transition-per-role RBAC (e.g. only Warehouse
can do Purchased→Received) - `docs/projects/PROJ-PALLETIQ.md`'s own Phase 3
QA criterion is where "RBAC enforcement in UI" is scoped; all three writer
roles (Owner/Manager/Warehouse) get the same "advance" action for now, see
ADR-0007. Also deferred: `pallets` collection (Phase 2 scoring engine, this
ticket doesn't touch it); bin/multi-location support; barcode scanning;
mobile receiving flow; manifest-vs-received reconciliation; Warehouse's
mobile-first bottom-tab-bar nav (all Phase 3, per the correction above);
wiring the dashboard's still-missing "inventory totals" card
(`PALLETIQ-010`'s deferred item) - a natural follow-on once this ticket's
`inventory` collection exists, but not this ticket's own literal scope.

_Firestore/RBAC impact:_ new `isOwnerOrManagerOrWarehouse` helper in
`firestore.rules`; `inventory` collection's write policy tightens from the
Phase-0 placeholder to that helper (read stays `isTenantMember`). Needs its
own dedicated block in `firestore.rules.test.ts` (pulled out of the shared
placeholder-policy `describe.each`), proving owner/manager/warehouse write
succeeds and buyer write is denied, per Check I.

_UI pattern notes:_ `docs/design/components.md`'s Data table pattern
(same as `VendorsPage`/`ManifestsPage`); Check III cost-field-omission
pattern (`canSeeCost`, already used in `ManifestDetailPage`). No new
pattern introduced.

_ADR:_ `docs/adr/0007-inventory-lifecycle-and-auto-creation.md` - covers
auto-creation vs. manual conversion, the collection-level vs.
per-transition RBAC tradeoff, and why landed cost isn't duplicated onto
inventory docs.

_Scope note on `PALLETIQ-012` (2026-08-11) — Planning gate only, not started:_

_Resolved with the owner during scoping:_ the ticket title ("size limits,
sandboxed parsing, no macros") and Phase 1's QA criterion
(`PROJ-PALLETIQ.md`: "malformed/corrupt files are rejected safely... size
limits, sandboxed parsing, no macro execution") don't name malware/AV
scanning - a prior code comment (`processManifestImport.ts`'s
`MAX_FILE_SIZE_BYTES` comment) speculatively attributed "malware scanning"
to this ticket, but that was never actually in the canonical scope docs.
Confirmed: stays scoped to what's named, no real AV/malware-scanning
integration this ticket (new paid vendor dependency, real latency cost -
revisit as its own ticket if a real threat model needs it later).

_In scope:_

- **`storage.rules` gains a real size limit** on the manifests write rule
  (`request.resource.size < 10 * 1024 * 1024`, matching
  `MAX_FILE_SIZE_BYTES`) - today there is _zero_ size enforcement before a
  file lands in Storage; the only existing check
  (`processManifestImport.ts`'s `buffer.length` check) fires only _after_
  download, too late to stop the upload/storage cost. Kept as a second
  defense-in-depth layer, not removed.
- **New `functions/src/manifests/validateFile.ts`**, called right after
  download and before `parseFile`: XLSX gets a real magic-byte/structural
  check (`JSZip.loadAsync` - cheap, central-directory-only, doesn't
  decompress entries) rejecting non-ZIP files outright, plus a
  `xl/vbaProject.bin` entry check rejecting macro-enabled files (`.xlsm`,
  or a macro-enabled workbook renamed to `.xlsx` - extension alone can't
  catch this). CSV gets a cheap sanity check (reject a ZIP-signature
  buffer or one containing a NUL byte in the first 8 KB - real CSVs never
  do).
- **Explicit `memory`/`timeoutSeconds` on `processManifestImport`'s task
  options** (`512MiB`/`120s`) - pins the resource sandbox boundary
  intentionally instead of leaving it on an unstated platform default.
- **A row-count circuit breaker** (reject if a parsed file has >50,000
  rows) - cheap protection against a degenerate/adversarial file without
  needing byte-level decompression-ratio tracking.
- **`ImportForm.tsx` gets a matching client-side 10 MB check** - UX only
  (fail fast before upload starts), explicitly not the security boundary;
  the boundary is `storage.rules` + server-side `validateFile.ts`, both of
  which hold even if this is bypassed.
- `jszip` added as an explicit `functions/package.json` dependency
  (already present transitively via `exceljs`, now imported directly).

_Out of scope, deferred:_ real malware/AV scanning (see above - a
separate future ticket if ever needed); full ZIP decompression-bomb
protection tracking per-entry decompression ratios (the row-count +
explicit memory/timeout bounds are judged sufficient for now - a crashed/
OOM'd single task invocation is contained, not a shared-resource or
cross-tenant impact); content-type allowlisting in `storage.rules`
(rejected in `ADR-0008` - browsers are inconsistent about CSV MIME types,
and client-declared content-type is spoofable anyway, so it wouldn't add
real security over the byte-level check).

_Firestore/RBAC impact:_ none - no new collection, no role change.
`imports/{importId}.error` gains new possible free-text values (already
an unstructured string field, not an enum).

_UI pattern notes:_ `ImportForm.tsx`'s client-side size check reuses the
same form-error display already used for its existing extension-mismatch
check - no new UI pattern.

_ADR:_ `docs/adr/0008-manifest-upload-security-hardening.md` - covers the
size-limit/magic-byte/macro-rejection/resource-bound decisions and why
malware scanning and content-type allowlisting were both rejected for
this ticket.

_Scope note on `PALLETIQ-017` (2026-08-11) — Planning gate only, not started:_

_Resolved with the owner during scoping:_ the owner supplied the real
brand mark - a single flattened PNG (`docs/design/assets/
palletiq-logo-lockup-source.png`, kept as source-of-truth reference, not
shipped to `public/`) showing the horizontal lockup:
`docs/design/Pallet-IQ-Design-System.md` §1's primary mark (isometric
pallet + magnifying-glass-with-bar-chart) at left, "Pallet IQ" wordmark
and the tagline ("Smarter Buys. Higher Profits.") at right, all in the
doc's documented "all-white on brand-blue background" color variant. No
separate full-color (navy+blue) light-background variant or vector source
was provided - this ticket works from the one flattened asset.

_In scope:_

- **Icon extraction.** The icon is chroma-keyed out of its source
  background (ImageMagick, ~8% fuzz tolerance against the sampled
  `srgb(0,60,227)` backdrop) and trimmed to a tight bounding box, producing
  a transparent-background white icon (`src/assets/palletiq-icon.png`).
  Inspecting the extraction closely: the icon's internal detail (pallet
  face dividers, the magnifying-glass lens interior) is genuine negative
  space in the source art, not solid white - meaning this asset is only
  designed to be viewed against a colored/dark backdrop, never directly on
  white (the lens would read as a blank gap). This is consistent with the
  design doc's own "all-white on dark or brand-blue backgrounds" framing
  for this color variant, not a defect in the extraction.
- **`BrandMark.tsx` updated to render the real icon**, replacing the
  `lucide-react` `PackageSearch` stand-in every prior ticket's comments
  flagged as temporary ("not the literal split-color logo asset - that's
  PALLETIQ-017's scope," `PALLETIQ-010`). Given the icon-needs-a-backdrop
  constraint above: the dark variant (used today only in `AppShell`'s navy
  sidebar) renders the icon directly, matching the source exactly; the
  light variant (used in `AuthCard`, a white surface) wraps the icon in a
  small Brand Blue rounded-square badge rather than inventing an
  unverified two-tone navy+blue recoloring the doc describes but no source
  art exists for - a real, deliberate deviation from the doc's literal
  "full color on light backgrounds" line, logged here rather than silently
  worked around. Revisit with real vector/two-tone source art if the badge
  treatment doesn't hold up.
- **Tagline support added to `BrandMark`** (new optional `tagline` prop),
  used on `AuthCard` (sign-in/sign-up/onboarding/accept-invite) - the
  doc's "Stacked" lockup is documented for exactly this kind of
  splash-like entry-point context. Not added to `AppShell`'s sidebar
  (`docs/design/Pallet-IQ-Design-System.md` §1's "Horizontal" lockup is
  icon+wordmark only, no tagline, and the sidebar has no room for it
  anyway).
- **Favicon/app-icon set replaces the two unrelated placeholder files**
  `public/favicon.svg` (a purple abstract Vite-template leftover, wrong
  colors entirely) and `public/icons.svg` (a `<symbol>` sprite of unrelated
  social-media icons, e.g. Bluesky - never referenced anywhere in `src/`,
  confirmed via grep before deleting) - the literal Check IV gap this
  ticket's title names. New: `favicon.ico` (16/32/48 multi-res),
  `favicon-16.png`, `favicon-32.png` (tighter-cropped than the app icons
  below - full padding made the mark an illegible blur at 16px; a closer
  crop is still soft but meaningfully more recognizable, a normal
  real-world tradeoff for a detailed mark at extreme small sizes),
  `apple-touch-icon.png` (180px), `icon-192.png`/`icon-512.png` (standard
  PWA/Android sizes, shipped for future-proofing even though no
  `manifest.json` exists yet to reference them - that's a separate,
  not-yet-scoped concern). All square, icon centered on a Brand Blue
  (`#2563EB`) fill - the canonical token, not the slightly-different blue
  sampled from the source PNG (`#003CE3`), so nothing new and unapproved
  enters the palette. `index.html`'s `<head>` links updated accordingly,
  plus a `theme-color` meta tag (`#2563EB`) added alongside them, per
  `design-system-auditor`'s observation that the new Brand Blue icon set
  now implies a Brand Blue mobile-chrome context.

_Out of scope, deferred:_ a true vector (SVG) version of the icon - no
vector source was provided, and auto-tracing a raster mark risks
introducing artifacts; all assets here are PNG/ICO raster, sized for their
actual use rather than infinitely scalable. A navy+blue full-color variant
for light backgrounds (see the Brand Blue badge workaround above) - revisit
if/when real two-tone source art exists. A `manifest.json`/PWA
installability pass to actually reference `icon-192`/`icon-512` -
separate, unscoped concern; those two sizes are shipped now since they
were cheap to generate alongside everything else, not because a manifest
is planned imminently. A public marketing/landing page to host the
"Marketing: horizontal white-on-blue logo lockup for headers, gradient CTA
bars" use case the design doc names in §4 - no such page exists in the app
today (the pre-`PALLETIQ-006` landing placeholder was deleted in
`PALLETIQ-010`), so there's nowhere for that specific usage to go yet.

_Found by `design-system-auditor`, acknowledged rather than fixed here:_
`BrandMark.tsx`'s wordmark renders as one solid color (`text-ink-navy`
light / `text-white` dark) - `Pallet-IQ-Design-System.md` §1 describes the
light variant as "'Pallet' in dark navy, 'IQ' in brand blue," split-colored.
This predates `PALLETIQ-017` (this ticket only touched the icon element
and added `tagline`, not `wordmarkClassName`) and the auditor confirmed
it's not a new regression, but flagged that it wasn't mentioned anywhere
despite this ticket's own scope note extensively discussing §1 compliance
for the icon - logged here so it reads as a known gap, not a silent one.
Small enough to fix whenever `BrandMark.tsx` is next touched.

_Firestore/RBAC impact:_ none - static assets and a presentational
component change only.

_UI pattern notes:_ extends `BrandMark.tsx` (existing component, gains a
`tagline` prop and swaps its icon), used in its two existing call sites
(`AppShell.tsx`, `AuthCard.tsx`) - no new component, no new pattern beyond
the badge treatment described above.

_ADR:_ not written - implementing brand assets the design doc has already
fully specified (§1) isn't a new architectural decision, same reasoning
`PALLETIQ-016` used for wiring already-decided design tokens. The
light-background badge treatment is a real, visible deviation from the
doc's literal wording, but it's a presentational fallback forced by what
source art exists, not a decision with real architectural alternatives -
recorded in this scope note instead.

_Scope note on `PALLETIQ-019` (2026-08-11) — Planning gate only, not started:_

_Resolved with the owner during scoping:_ the owner supplied the full
flattened lockup image again (`public/logo_name_tagline.png`, confirmed
byte-identical via md5 to the already-archived
`docs/design/assets/palletiq-logo-lockup-source.png` from `PALLETIQ-017` -
deleted without committing rather than re-archived) and asked for it to
replace `AuthCard`'s current 3-element brand composition (icon badge +
"PalletIQ" heading + tagline line, built in `PALLETIQ-017`) with the
single image, sized and centered on the card. Confirmed via
`AskUserQuestion`: applies to all 4 pages sharing `AuthCard` (sign-in,
sign-up, onboarding, accept-invite), not sign-in alone; and the image's
own opaque Brand Blue background stays as a rounded-rectangle banner
rather than being chroma-keyed to transparency, since `PALLETIQ-017`
already established the icon's internal negative-space detail (the
magnifying-glass lens interior, pallet face dividers) only reads
correctly against a colored backdrop.

Scoped as a new ticket rather than reopening `PALLETIQ-017`: that ticket
is `Done`, merged (`PR #39`), with its own close-out diff already
recorded in `docs/ACTIVE_CYCLE.md` - amending it to fold in new, unshipped
work would misrepresent what it actually shipped.

_In scope:_

- **New production asset**, `src/assets/palletiq-logo-lockup.png`,
  generated from the archived source via ImageMagick: `-fuzz 5% -trim` to
  remove the source's excess uniform-blue margin, then a 60px border
  restored in the source's own sampled background color
  (`srgb(0,60,227)`, not the canonical `#2563EB` token - matching how
  `PALLETIQ-017` treated content _extracted from_ the source versus
  _newly painted_ pixels like the favicon fills) so CSS corner-rounding
  never clips the pallet or text, then resized to 900px wide (~178KB) -
  a deliberate deviation from `PALLETIQ-017`'s no-resize-the-icon
  precedent, justified here because this asset is a full-width banner
  loaded on 4 page views, not a 40px sidebar icon. Corner-rounding stays
  CSS-only (`rounded-xl` on the `<img>`, matching the card's own existing
  radius) rather than baked into the PNG, consistent with the card's own
  precedent and avoiding coupling the asset to one exact background
  color. Pixel-level clearance at all four corners was verified at actual
  display size before committing to this approach.
- **`AuthCard.tsx`** now renders the image directly (`w-full h-auto
rounded-xl`, real `alt` text matching what the removed heading/tagline
  literally said - not `alt=""`, since this image is the sole carrier of
  that text content) in place of `<BrandMark tagline />`.
- **`BrandMark.tsx` simplified to zero props.** With `AuthCard` no longer
  calling it, `AppShell.tsx` (2 call sites, both identically
  `<BrandMark variant="dark" asHeading={false} />`) is the only remaining
  caller, making `variant="light"` and `tagline` 100% dead code and
  `asHeading` a prop that's passed but never varies. Dropped all three;
  the component now hardcodes exactly what `AppShell` needs (dark icon +
  span, no heading/tagline path). Same dead-code-removal instinct
  `PALLETIQ-017` used deleting `favicon.svg`/`icons.svg` after confirming
  zero references, applied to a prop surface instead of whole files.

_Doc-literalism notes, logged so `design-system-auditor` doesn't flag them
as new/unexplained (both are repeats of judgment calls `PALLETIQ-017`
already made once, now visible in a second spot):_ the source lockup is a
horizontal icon+wordmark layout with a tagline appended beneath, matching
neither of `Pallet-IQ-Design-System.md` §1's two named lockups
("Horizontal," no tagline; "Stacked," icon-above-wordmark) literally - it's
the same hybrid asset `PALLETIQ-017` already used for `AuthCard`'s
composed version, now shipped as one flattened image instead of composed
from parts. The banner's background is the source's own sampled blue
(`srgb(0,60,227)`/`#003CE3`), not the canonical `#2563EB` token, because
it's extracted/bordered content rather than newly painted pixels - same
distinction `PALLETIQ-017`'s scope note draws for the icon asset versus
the favicon fills.

_Out of scope, deferred:_ everything `PALLETIQ-017`'s own "Out of scope"
section already deferred (vector/SVG source, a navy+blue full-color
light-background variant, `manifest.json`/PWA wiring, a marketing/landing
page) - none of that changes here. The wordmark's split-color styling gap
`design-system-auditor` found during `PALLETIQ-017` (`BrandMark`'s
"PalletIQ" text rendering as one solid color instead of the doc's
"'Pallet' in navy, 'IQ' in brand blue" split) is moot for `AuthCard`'s
copy specifically now that it's a flattened image, not live text - it
still applies to `BrandMark`'s remaining `AppShell` usage, unchanged by
this ticket.

_Firestore/RBAC impact:_ none - static asset and two presentational
component changes only.

_UI pattern notes:_ no new component; simplifies `BrandMark.tsx`'s prop
surface and swaps `AuthCard.tsx`'s branding element for a plain `<img>`.

_ADR:_ not written - same reasoning as `PALLETIQ-017`: implementing
already-supplied brand assets isn't a new architectural decision.

_Scope note on `PALLETIQ-004` (2026-08-11) — Planning gate only, not started:_

_Resolved with the owner during scoping:_ this ticket's original title
("Secret Manager wiring for third-party credentials") predates `PALLETIQ-003`,
which pulled the actual mechanism forward - `functions/src/billing/params.ts`
already uses `firebase-functions/params`' `defineSecret` for
`STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` (see `ADR-0005`), and the Secret
Manager API is already enabled on `mrt-pallet-iq` (a side effect of that
ticket's live deploy, per `ACTIVE_CYCLE.md`'s 2026-08-10 drift note). The two
named future consumers - the Gemini API key (`PALLETIQ-005`'s scope note
deferred it here; Phase 2, not started) and marketplace API keys/vendor
logins (`PROJ-PALLETIQ.md`'s Phase 4 automation) - have no real code that
needs a secret yet. Rather than provision a credential with no consumer,
this ticket is narrowed to writing down the convention `ADR-0005` already
established, so the next ticket that needs a real third-party secret follows
it instead of re-deciding it.

_In scope:_ a new "Third-party secrets" section in `CONTRIBUTING.md`
(between "Before opening a PR" and "Branch protection") documenting: use
`defineSecret`/`defineString` via `firebase-functions/params` for any new
third-party credential, never plaintext `functions/.env*` or committed
config; provision the real value only when a concrete consumer needs it
(`firebase functions:secrets:set`), matching `PALLETIQ-003`'s
just-in-time approach rather than provisioning speculatively; Secret
Manager itself is already enabled on `mrt-pallet-iq`, so no fresh GCP
setup is needed the next time this comes up. Points to
`functions/src/billing/params.ts` and `ADR-0005` as the worked example.

_Out of scope, deferred:_ provisioning any specific new secret - the Gemini
API key (Phase 2) and marketplace API keys/vendor logins (Phase 4) both stay
unprovisioned until a real ticket in those phases needs one, at which point
that ticket pulls the work forward just-in-time, the same way `PALLETIQ-003`
did for Stripe rather than waiting on this ticket.

_Firestore/RBAC impact:_ none - documentation only, no collection, rule, or
RBAC boundary touched.

_UI impact:_ none - no UI reads or displays a secret.

_ADR:_ not written - this documents a convention `ADR-0005` already decided
(`defineSecret`, backed by Secret Manager, provisioned just-in-time per
consumer), not a new architectural decision.

_Scope note on `PALLETIQ-020` (2026-08-13) — Planning gate only, not started:_

_Origin:_ an external spec, `SPEC-SOURCING-INTEL-002` (Ryan, RPD Consulting),
proposed extending vendor coverage beyond the manifest-upload flow to
automated lot _discovery_ — scraping restock.ca's public listings so Ryan
can evaluate lots before buying, not after. Reviewed against
`docs/ROADMAP.md`/`docs/BACKLOG.md`/`docs/ACTIVE_CYCLE.md` and merged in via
the Planning gate; see `ADR-0009` for the full architectural reasoning,
including why the spec's other two proposed sources (B-Stock, Direct
Liquidation) are **not** part of this ticket — both explicitly prohibit
scraping in their own Terms of Use, split off as `PALLETIQ-021`'s
manual-entry-only Track B instead.

_Pulled forward from Phase 4, resolved with the owner:_ `docs/projects/
PROJ-PALLETIQ.md`'s Phase 4 already names "Automated vendor ingestion
(API/email/watch folders)" — this ticket is a narrow, single-vendor slice
of that bullet arriving early, the same pull-forward pattern `PALLETIQ-004`/
`003` already used moving Secret Manager mechanics from Phase 4 into Phase 0.
Runs as a **parallel track**, not gated on or gating Phase 2 (Intelligence,
not started) — no scoring/AI dependency either direction, it only produces
and stores discovered lots.

_Pre-flight compliance check, resolved before this ticket was opened:_ the
original spec (`SPEC-RESTOCK-SCRAPER-001`, folded into Track A unchanged)
flagged restock.ca's own Terms of Use/robots.txt as still needing
verification before any scraper code is written. That check has since been
completed (owner-confirmed) and came back clean — scraping restock.ca's
public, fixed-price category pages is permitted. Implementation still needs
to record this in-repo (a short README note or comment near the scraper
entry point) so a future contributor can see it was actually checked, not
assumed.

_In scope:_ a new `functions/src/restock-scraper/` Cloud Functions folder
(`scrapeRestockLots.ts` as the `onSchedule` entry point — first
`onSchedule`/Cloud Scheduler trigger in the codebase — plus `types.ts` and
colocated tests, matching the existing `functions/src/<feature>/`
convention). Runs hourly, parses restock.ca's public category pages into
`LotRecord`s via `cheerio` (see `ADR-0009` for why cheerio over a headless
browser), diffs against the global `restock_lots` collection (new lot →
create, changed lot → update, disappeared lot → mark closed/removed).
Fetches manifest links for new lots where publicly exposed on the listing
page. New `firestore.rules` block for `restock_lots` — global/cross-tenant
per `ADR-0009` (`read: isSignedIn()`, `write: if false`, Cloud Functions
only) — plus `firestore.rules.test.ts` coverage proving any authenticated
user across tenants can read and no client write path exists (Check I; this
collection needs a distinct test shape from the shared tenant-isolation
`describe.each` block, since it isn't tenant-scoped).

_Out of scope, deferred:_ any UI surfacing `restock_lots` to a Buyer (no
"browse discovered lots" page exists yet — a natural follow-on ticket once
this ticket's data exists, same relationship `PALLETIQ-011` had to
`PALLETIQ-010`); any scoring/recommendation logic on top of scraped lots
(Phase 2's Intelligence engine, not started); converting a `restock_lots`
entry into a real `vendors`/`imports` purchase flow (a plausible future
bridge between discovery and the existing buy pipeline, not this ticket's
literal scope); B-Stock/Direct Liquidation coverage (`PALLETIQ-021`,
manual-entry only, see `ADR-0009` for why no scraper is built for either).

_Firestore/RBAC impact:_ new collection `restock_lots`, global/cross-tenant
(not `tenants/{tenantId}/...`-scoped) — the second collection after
`product_intelligence` to use this shape. `read: isSignedIn()` (any
authenticated PalletIQ user, any tenant); `write: if false` (Cloud
Functions/Admin SDK only — the scheduled scraper is the only writer).

_UI pattern notes:_ none — this ticket ships no UI, data-ingestion only.

_ADR:_ written — see
[`docs/adr/0009-sourcing-intelligence-scraper-and-watchlist.md`](../adr/0009-sourcing-intelligence-scraper-and-watchlist.md)
(2026-08-13). Covers the Track A/B compliance split, the global-vs-tenant-scoped
collection decision, scraping library choice, and the `onSchedule` trigger
decision.

_Scope note on `PALLETIQ-021` (2026-08-13) — Planning gate only, not started:_

_Origin:_ same source as `PALLETIQ-020` above — `SPEC-SOURCING-INTEL-002`'s
Track B. B-Stock's Terms of Use (Section 3) and Direct Liquidation's Terms
of Service each independently prohibit "any robot, spider, scraper... or
other automated means" (B-Stock) / "any robot, spider, data miner...
or any automatic or manual device or process to copy or monitor" (Direct
Liquidation) — both quoted in full in `ADR-0009`. No scraper is built for
either source; this ticket is a compliant, manual-entry watchlist instead,
matching the discipline the original restock.ca spec already established
("if [a prohibition] exists, stop and surface it").

_Pulled forward from Phase 4, same rationale as `PALLETIQ-020`:_ a narrow
slice of `PROJ-PALLETIQ.md`'s Phase 4 "Automated vendor ingestion" bullet
(the compliant substitute for the two channels where automation isn't
legally available), running as a parallel track alongside Phase 2, not
gated by it.

_Combining the spec's Phase 1 (schema/storage) and Phase 2 (quick-add UI)
into one ticket:_ both are small and cohesive enough to ship together,
matching this repo's own precedent for a single-feature CRUD+UI ticket
(`PALLETIQ-007`'s vendor management, `PALLETIQ-011`'s inventory lifecycle)
rather than splitting a schema-only ticket with no UI to exercise it.

_In scope:_ a `WatchlistLot` type (`title`, `source: 'bstock' |
'direct_liquidation'`, `category`, `units`, `price`/`currentBid`,
`closesAt`, `productUrl`, `notes`, `addedAt`) and a new
`tenants/{tenantId}/watchlist_lots` collection — tenant-scoped, unlike
`PALLETIQ-020`'s global `restock_lots`, since each tenant's manually-tracked
lots are genuinely their own data (see `ADR-0009`). New `firestore.rules`
block (`read: isTenantMember`, `write: isOwnerOrBuyer` — reusing `ADR-0006`'s
existing helper, matching Buyer's core sourcing role) plus
`firestore.rules.test.ts` coverage (Check I). A minimal quick-add form
(paste URL + the handful of fields visible on a listing page) reusing
`docs/design/components.md`'s Form inputs pattern (`TextField`/`SelectField`,
React Hook Form + Zod, same stack as every existing form in the app). A
"closes soon" sorted view reusing the Data table pattern. A new `/watchlist`
route inside the existing `AppShell` nav, alongside Dashboard/Vendors/
Manifests/Inventory. A README (or PR-description section, implementation
decides placement) documenting _why_ this is manual-entry rather than
scraped, quoting the ToS clauses from `ADR-0009` — this is the spec's own
Definition-of-Done requirement for Track B, so a future contributor doesn't
"fix" this by adding a scraper.

_Out of scope, explicitly deferred — do not open follow-on tickets for
these without the named trigger condition:_ the spec's Phase 3 bookmarklet/
browser-extension (a personal, manually-triggered click-to-prefill tool) —
the spec itself says "only build if Phase 2 alone proves too slow in
practice... validate with a week of real use first"; logged as a
conditional follow-up in `docs/ACTIVE_CYCLE.md`, not a ticket, until that
validation happens. The spec's Phase 4 B-Stock outreach (contacting B-Stock
buyer support/sales about an API or saved-search feed) is explicitly Ryan's
own action item, not engineering work — logged as a tracked follow-up in
`docs/ACTIVE_CYCLE.md` instead of a ticket, since there's no code to write;
if it produces a sanctioned feed, that becomes a new Track-A-style ticket
built against the real endpoint, not scraped.

_Firestore/RBAC impact:_ new collection `tenants/{tenantId}/watchlist_lots`.
`read: isTenantMember(tenantId)`; `write: isOwnerOrBuyer(tenantId)` (existing
helper from `ADR-0006`, no new rules helper needed).

_UI pattern notes:_ `docs/design/components.md`'s Form inputs pattern (quick-add
form) and Data table pattern (closes-soon view) — both already-established
patterns, no new pattern introduced. First real client-side time-based sort
in the app (closes-soon ordering) — flag during implementation if it needs
anything beyond a plain sort-by-`closesAt`.

_ADR:_ written — see
[`docs/adr/0009-sourcing-intelligence-scraper-and-watchlist.md`](../adr/0009-sourcing-intelligence-scraper-and-watchlist.md),
shared with `PALLETIQ-020` (one architectural decision covering both tracks
of the same spec).

_Scope note on `PALLETIQ-022` (2026-08-11) — Planning gate only, not started:_

_Resolved with the owner during scoping:_ importing a real Restock.ca
manifest (`UPC, Merchant SKU, Quantity, Title, MSRP, Extended` headers)
produced 0 successful rows / 13 errors out of 13. Two causes, both real:
(1) `functions/src/manifests/normalize.ts`'s header-alias list doesn't
recognize `Title` (description) or `Merchant SKU` (sku) - a straightforward
alias-list gap; (2) the manifest has no per-item purchase cost column at
all - `MSRP` is retail reference value, not what the buyer paid, and
`unitCost` is currently a hard-required field that rejects any row lacking
it outright. Full design and alternatives considered are in
[`ADR-0010`](../adr/0010-lot-purchase-price-allocation.md).

_In scope:_

- `normalize.ts`'s `FIELD_ALIASES`: add `title` to `description`, add
  `merchant sku` to `sku`.
- New optional `totalPurchasePrice` field, collected on `ImportForm.tsx` at
  import time (not editable after, per `ADR-0010`'s reasoning), threaded
  through `enqueueManifestImport`'s request payload onto the new
  `ImportDoc.totalPurchasePrice: number | null` field.
- `processManifestImport.ts` gains a pre-pass summing quantity across
  rows with a valid description+quantity (before the existing per-row
  normalization pass), computing a flat `totalPurchasePrice ÷ totalQuantity`
  rate. A row missing a direct cost value uses that flat rate as its
  `unitCost`; a row with a real manifest-stated cost keeps it regardless.
  `unitCost` stays a required, always-populated `number` - no nullability
  introduced to `LineItemDoc` or `InventoryDoc`.
- Test coverage using this exact Restock.ca file's shape (header names,
  the no-cost-column scenario) as inline fixtures in `normalize.test.ts`/
  `processManifestImport.test.ts`, matching this repo's existing
  inline-object test convention - the raw CSV itself isn't committed to the
  repo (matches the "don't ship a stray raw file" instinct `PALLETIQ-019`'s
  scope note already used for its own source upload).

_Out of scope, deferred:_ MSRP-weighted allocation (rejected in `ADR-0010` -
flat per-unit split is what the owner actually described); tracking
whether a given line item's `unitCost` is real vendor-stated data or a
computed lot-price average (no provenance flag - `ADR-0010`'s Consequences
section names this as a real, deliberate gap for a future ticket to close
if it turns out to matter, e.g. for Phase 2 scoring); editing
`totalPurchasePrice` after an import has already run (would need a
Cloud-Function-driven rewrite of every affected `lineItems`/`inventory`
doc - `ADR-0010` explicitly rejected this complexity, same reasoning
`PALLETIQ-009` used to reject persisting landed cost); a "retry/reprocess an
existing import" mechanism (doesn't exist today at all, not just for this
ticket's scenario - out of scope here, the recovery path is a fresh import
with `totalPurchasePrice` filled in this time).

_Firestore/RBAC impact:_ `imports/{importId}` gains a new
`totalPurchasePrice` field, written by the existing Owner/Buyer-gated
`enqueueManifestImport` callable - no `firestore.rules` change expected
(the doc's existing `isOwnerOrBuyer` write / `isTenantMember` read already
covers it, same as `PALLETIQ-009`'s `freightCost`/`otherFees`), confirmed
via `firestore-rules-auditor` at close rather than assumed.

_UI pattern notes:_ `ImportForm.tsx` gains one new optional numeric field
(`docs/design/components.md`'s Form inputs pattern, same numeric-input
convention `PALLETIQ-009` established for `freightCost`/`otherFees` - plain
number input, `$`-prefixed only at display time). No new component.

_ADR:_ written - see
[`docs/adr/0010-lot-purchase-price-allocation.md`](../adr/0010-lot-purchase-price-allocation.md).
Decision: collect `totalPurchasePrice` once at import time and burn a flat
per-unit-quantity rate directly into `unitCost` server-side, rather than
the compute-on-read/nullable-`unitCost` approach that would otherwise
mirror `PALLETIQ-009`'s landed-cost pattern - rejected because
`inventory.unitCost` is a persisted snapshot, not a read-time computation,
so an editable-after-import price would need real rewrite machinery
`PALLETIQ-009` already chose not to build for a lower-stakes field.

_Scope note on `PALLETIQ-023` (2026-08-12) — Planning gate only, not started:_

_Found via `/code-review` on the (not yet merged) `PALLETIQ-022` diff:_
`processManifestImport.ts`'s pre-pass only computes `flatUnitCost` when
`totalPurchasePrice > 0`, so an explicit `totalPurchasePrice: 0` (a
correctly-entered free lot, allowed by `enqueueManifestImport.ts`'s `< 0`
check) is treated identically to no price given at all - every row
lacking a direct cost then fails normalization with "Missing or invalid
unit cost" instead of getting `unitCost: 0`. This contradicts
`normalize.ts`'s own existing "allows a zero unit cost" test, and
`ImportForm.tsx`'s comment explaining the field is a string specifically
to distinguish "not provided" from "really did pay $0" - the server
throws that distinction away. Logged as drift per `docs/GOVERNANCE.md`
rather than folded into `PALLETIQ-022`'s in-flight scope.

_In scope:_ change `processManifestImport.ts`'s pre-pass condition from
`totalPurchasePrice > 0` to a null/undefined check (e.g.
`totalPurchasePrice != null`) so `0` computes a `flatUnitCost` of `0`
same as any other value; a test covering the free-lot (`totalPurchasePrice:
0`) import path in `processManifestImport.test.ts`.

_Out of scope:_ any change to `enqueueManifestImport.ts`'s existing `< 0`
validation (already correct); the `PALLETIQ-024` negative-cost bug
(separate ticket, separate root cause).

_Firestore/RBAC impact:_ none - no schema or rules change, fixes existing
field-handling logic only.

_UI pattern notes:_ none - no UI change.

_ADR:_ not needed - bug fix within `ADR-0010`'s existing design, not a new
architectural decision.

_Scope note on `PALLETIQ-024` (2026-08-12) — Planning gate only, not started:_

_Found via `/code-review` on the (not yet merged) `PALLETIQ-022` diff:_
`normalize.ts`'s `directUnitCost >= 0 ? directUnitCost : flatUnitCost`
treats a negative manifest-stated unit cost (e.g. a vendor typo like
`-4.50`) identically to a missing cost column, silently substituting the
computed flat lot-price rate instead of surfacing the row as a data error
in `imports_errors` for buyer review. Before `PALLETIQ-022`, any negative
coerced cost failed normalization outright. This contradicts `ADR-0010`'s
own text that "a row with a real, manifest-stated cost always keeps that
value." Logged as drift per `docs/GOVERNANCE.md` rather than folded into
`PALLETIQ-022`'s in-flight scope.

_In scope:_ `normalize.ts` distinguishes "cost column absent/unparseable"
from "cost column present but negative" - only the former falls back to
`flatUnitCost`; the latter fails normalization and reports to
`imports_errors` as before `PALLETIQ-022`. A test covering a negative
manifest-stated cost alongside a `totalPurchasePrice` in
`normalize.test.ts`.

_Out of scope:_ the `PALLETIQ-023` zero-price bug (separate ticket,
separate root cause); any change to how a genuinely missing cost column
is detected (already correct).

_Firestore/RBAC impact:_ none - no schema or rules change, fixes existing
field-handling logic only.

_UI pattern notes:_ none - no UI change.

_ADR:_ not needed - bug fix within `ADR-0010`'s existing design, not a new
architectural decision.

_Scope note on `PALLETIQ-025` (2026-08-22) — Planning gate only, not started:_

_Origin:_ an external feature master plan,
[`docs/projects/treasure-hunter-plan.md`](./projects/treasure-hunter-plan.md)
("Treasure Hunter," v2, Ryan) — a photo-in/price-out item appraisal
capability. Reviewed against `docs/ROADMAP.md`/`docs/BACKLOG.md`/
`docs/projects/PROJ-PALLETIQ.md` and merged in via the Planning gate; see
`ADR-0011` for the full architectural reasoning, including why the owner
chose the pre-purchase field-scan workflow (this ticket and `026`–`029`)
over the post-receiving/pre-listing alternatives the plan also names
(`030` and later tickets pick those up).

_Pulled forward from Phase 2, resolved with the owner:_ `PROJ-PALLETIQ.md`'s
Phase 2 already names "Async, batched Gemini product analysis" — this
ticket is that capability's first real implementation, arriving as a
parallel track alongside the rest of Phase 2 (pallet-level scoring,
duplicate detection, ROI reconciliation), not gated on it — see `ADR-0011`.

_In scope:_ maps to the plan's own "Phase 0" (section 10). A mobile-first
capture flow for Buyer (2–5 photos: overall, label/tag, barcode, damage —
per `docs/design/mobile-responsive.md`'s new Buyer-capture-flow addendum,
this PR), uploading to a new `tenants/{tenantId}/item_scans/{scanId}/...`
Storage path (same size-limit posture as `ADR-0008`). A new
`enqueueItemScan` callable + `processItemScan` Cloud Tasks worker (extends
`PALLETIQ-005`'s existing `ai_tasks` pipeline with a new task type — first
real Gemini API call in the codebase, `GEMINI_API_KEY` via `defineSecret`
per `PALLETIQ-004`'s convention) that sends all captured photos in one
multimodal call with Google Search grounding enabled, requests structured
JSON output (item name, brand, model, category, condition grade + one-line
justification, confidence per field), and writes the full result to a new
`tenants/{tenantId}/item_scans/{scanId}` doc — storing the complete
identification record, not just pricing-relevant fields, per the plan's
section 2 reuse argument. The low-confidence path: when confidence is
below threshold, request and store the top-3 candidate matches instead of
forcing one answer, with a UI for the Buyer to pick/correct. New
`firestore.rules` block for `item_scans` (`read: isTenantMember`,
`write: isOwnerOrBuyer` — reusing `ADR-0006`'s helper) plus
`firestore.rules.test.ts` coverage (Check I).

_Out of scope, deferred:_ any pricing/waterfall logic (`PALLETIQ-026`);
barcode/UPC exact-match lookup (`PALLETIQ-026`'s waterfall step 1, not
identification itself — this ticket's vision path handles the barcode as
one more image input to Gemini, not a separate deterministic lookup path
yet); the saleability score (`PALLETIQ-027`); any outcome-data logging
(`PALLETIQ-028`); Warehouse/Store Manager access to `item_scans` (Buyer-only
for this ticket, per `ADR-0011`'s chosen use case).

_Firestore/RBAC impact:_ new collection `tenants/{tenantId}/item_scans`.
`read: isTenantMember(tenantId)`; `write: isOwnerOrBuyer(tenantId)`
(existing helper from `ADR-0006`). New Storage path,
`tenants/{tenantId}/item_scans/{scanId}/...`, mirroring `PALLETIQ-008`'s
manifests path (Owner/Manager/Buyer read, Owner/Buyer write) plus a size
limit in `storage.rules`.

_UI pattern notes:_ new mobile-first capture flow — see
`docs/design/mobile-responsive.md`'s Buyer-capture-flow addendum (this PR),
reusing Warehouse's existing bottom-tab-bar/44×44-touch-target/single-
column patterns rather than inventing new ones. No documented pattern
exists yet for a multi-photo capture input specifically (camera vs. file
picker, per-photo retake) — flagging that gap rather than silently
inventing one; first real instance to resolve during implementation.
Low-confidence top-3-candidates picker: no existing pattern, likely a
simple card-select list — flag if it needs more than that.

_ADR:_ written — see
[`docs/adr/0011-treasure-hunter-identification-and-pricing-architecture.md`](../adr/0011-treasure-hunter-identification-and-pricing-architecture.md).
Covers the full six-ticket architecture shared by this and the next five
tickets.

_Scope note on `PALLETIQ-026` (2026-08-22) — Planning gate only, not started:_

_Origin:_ same plan/ADR as `PALLETIQ-025` above — this ticket is the plan's
"Phase 1" (section 10): the pricing waterfall itself, plus the trust UI
that ships alongside the first price rather than after it, per the plan's
own explicit reasoning.

_In scope:_ a cost-ordered waterfall run against an existing `item_scans`
doc: step 0 cache lookup against a new global `product_price_cache`
collection (keyed by UPC/ASIN/identification fingerprint); step 1
deterministic UPC/barcode exact-match lookup; step 3 Google Search
grounding (already available from `PALLETIQ-025`'s identification call,
reused here for a retail/MSRP cross-check); step 4 eBay Browse API (OAuth,
`EBAY_APP_ID`/`EBAY_CERT_ID` via `defineSecret`) active-listing asking
prices, scaled by a hardcoded starting discount ratio (75–85% of median
asking, per the plan's section 5 — not yet calibrated against real outcome
data, that's `PALLETIQ-028`). Computes and stores MSRP / sale price /
liquidation price on the `item_scans` doc. Ships the confidence &
explanation panel and the recent-sales panel (plan section 6) as instances
of `docs/design/explainable-scoring.md`'s existing score-badge + factor-
breakdown pattern — no new component. The "we're not sure" empty state for
a scan that clears no waterfall step with adequate confidence.

_Out of scope, deferred:_ Keepa/PriceCharting/Discogs/Google Books category
specialists and background enrichment (`PALLETIQ-027`); the saleability
score itself (`PALLETIQ-027` — this ticket produces the confidence/
explanation inputs the formula will consume, not the formula); real eBay
sold-comps data or Marketplace Insights access (`PALLETIQ-028`); calibrating
the discount ratio against real outcomes (`PALLETIQ-028`, no outcome data
exists yet to calibrate against).

_Firestore/RBAC impact:_ new global collection `product_price_cache`
(cross-tenant, same "separate security domain" shape as `restock_lots`/
`product_intelligence` per `ADR-0009`/`ADR-0011`): `read: isSignedIn()`;
`write: if false` (Cloud Functions only — the waterfall's cache-write step
is the only writer). `item_scans` gains pricing fields, covered by its
existing `PALLETIQ-025` rule — no rule change needed, confirm via
`firestore-rules-auditor` at close.

_UI pattern notes:_ `docs/design/explainable-scoring.md`'s score-badge +
factor-breakdown + provenance-labeling pattern, reused directly for both
the confidence panel and the recent-sales panel — first real instance of
that addendum in shipped code (it predates any Phase 2 scoring work).
`docs/design/components.md`'s Empty States pattern for the "we're not
sure" state.

_ADR:_ written — shared `ADR-0011`, see `PALLETIQ-025`.

_Scope note on `PALLETIQ-027` (2026-08-22) — Planning gate only, not started:_

_Origin:_ same plan/ADR — the plan's "Phase 2" (section 10): category
specialists, background enrichment, and the saleability score.

_In scope:_ category-conditional waterfall branches per the plan's section
4 table — Keepa (`KEEPA_API_KEY`) for ASIN-matched items (price history,
sales rank, buy-box price), PriceCharting (`PRICECHARTING_API_KEY`) for
games/cards/collectibles/LEGO, Discogs (free tier) for vinyl/CDs/media,
Google Books (free) for ISBN-barcoded books. Slow/paid steps move to
background enrichment: the client gets an instant estimate from whatever
`PALLETIQ-026` step already resolved, then `item_scans` updates in place as
slower steps complete, with the UI notified of the update (extends
`PALLETIQ-025`'s async task pattern, doesn't replace it). The saleability
score formula from the plan's section 7 (sell-through, price variance,
condition, listing saturation, sales rank, sample confidence — seasonality
and category velocity explicitly deferred per the plan's own reasoning),
computed once the waterfall settles and shown via the same
`explainable-scoring.md` factor-breakdown component `PALLETIQ-026`
introduced.

_Out of scope, deferred:_ eBay Marketplace Insights / real sold-comps data,
outcome-data logging (`PALLETIQ-028`); fashion/sneaker categories and
StockX/Poshmark/Mercari (`PALLETIQ-029` — none of those vendors are
confirmed self-serve yet, per the plan's section 12); calibrating
saleability weights against real outcomes (no outcome data exists until
`PALLETIQ-028`, weights ship as the plan's stated "first guess, not
gospel").

_Firestore/RBAC impact:_ none beyond `PALLETIQ-025`/`026` — `item_scans`
gains a `saleabilityScore` field and category-specialist pricing data,
covered by the existing rule.

_UI pattern notes:_ `explainable-scoring.md`'s factor-breakdown pattern,
reused for the saleability score (a second instance alongside the pricing
confidence panel) — same component, different factor set. Background-
enrichment loading state reuses `components.md`'s skeleton-blocks
convention, same as `PALLETIQ-008`'s async job status.

_ADR:_ written — shared `ADR-0011`, see `PALLETIQ-025`.

_Scope note on `PALLETIQ-028` (2026-08-22) — Planning gate only, not started:_

_Origin:_ same plan/ADR — the plan's "Phase 3" (section 10): real eBay
sold-comps evaluation and "the start of the flywheel."

_Pulled forward from Phase 4, resolved with the owner:_ `PROJ-PALLETIQ.md`'s
Phase 4 already names "Pricing intelligence engine" — this ticket is the
part of that bullet concerned with real sold-comps access and closing the
outcome-data loop, arriving alongside the rest of the Treasure Hunter track
rather than waiting for Phase 3 (Operations) to ship first.

_Pre-flight check required before implementation starts, per `ADR-0011`'s
Consequences:_ apply for eBay Marketplace Insights API access and evaluate
a paid comps vendor in parallel, per the plan's section 12 — access odds
and timeline are unconfirmed as of the plan's writing (eBay closed
logged-out sold-listing access in July 2026, a tightening signal, not a
loosening one). If neither clears, this ticket ships the outcome-logging
half alone and the discount-ratio calibration described below still
works — sold-comps access improves the _input_, it isn't a dependency for
the flywheel itself.

_In scope:_ self-reported outcome fields added to `item_scans` (listed
price, sold price, days-to-sell — lightweight, user-entered, not gated on
Phase 3's full `sales`-tracking workflow, which doesn't exist yet and
isn't a dependency for this parallel track). A Cloud Function that, on a
completed outcome, writes an anonymized row into the global
`product_intelligence` collection (UPC/ASIN → historical resale price,
sell-through time) — `product_intelligence`'s first real writer, per
`ADR-0011`. Recalibrating `PALLETIQ-026`'s hardcoded asking-to-sold
discount ratio against accumulated real outcomes once there's enough
sample size to trust (the plan's section 12 names this open question
explicitly; a specific sample-size threshold gets decided against real
data at implementation time, not guessed here).

_Out of scope, deferred:_ any UI change to how a sold-comps result is
sourced beyond the confidence panel's existing labeling (`PALLETIQ-026`);
fashion/sneaker categories (`PALLETIQ-029`); usage-metering enforcement on
the now-real per-scan third-party API cost (`ADR-0011`'s flagged, non-
blocking consequence — `PALLETIQ-003`'s `incrementUsage` hook stays
uncalled here too, a separate ticket if cost becomes a real problem).

_Firestore/RBAC impact:_ `item_scans` gains outcome fields, covered by the
existing rule. `product_intelligence` gets its first real writer (Cloud
Functions/Admin SDK only — no rules change, the collection's existing
`read: isSignedIn()` / `write: if false` rule from `PALLETIQ-001` already
covers this).

_UI pattern notes:_ a small "report the outcome" form (reuses
`components.md`'s Form inputs pattern) — first instance of a user
self-reporting historical/completed data rather than current state.

_ADR:_ written — shared `ADR-0011`, see `PALLETIQ-025`.

_Scope note on `PALLETIQ-029` (2026-08-22) — Planning gate only, not started:_

_Origin:_ same plan/ADR — part of the plan's "Phase 4" (section 10):
fashion & sneaker categories.

_Pre-flight check required before implementation starts:_ per the plan's
sections 3 and 12, none of StockX, Poshmark, Mercari, Depop, or Facebook
Marketplace have confirmed self-serve API access — the plan explicitly
rules out DIY scraping for this category as a real Terms-of-Service risk
(plan section 11, and the same discipline `ADR-0009` applied to B-Stock/
Direct Liquidation). This ticket does not start until a compliant paid
data vendor or direct partnership is confirmed; if none clears, this
ticket stays blocked/deferred rather than shipping a scraper.

_In scope, once the pre-flight check clears:_ a fashion/sneaker waterfall
branch (plan section 4's category table: Cache → Grounding → confirmed
compliant paid vendor) feeding the existing `PALLETIQ-026`/`027` pricing
and saleability pipeline — no new collection or UI pattern, a new
category branch in the existing waterfall only.

_Out of scope, deferred:_ listing-copy generation and other "beyond
pricing" features (`PALLETIQ-030`); any direct StockX/Poshmark/Mercari
integration without a confirmed compliant path (explicitly rejected, see
above).

_Firestore/RBAC impact:_ none beyond the existing `item_scans` pricing
fields.

_UI pattern notes:_ none new — extends the existing confidence/pricing
panels with one more category branch.

_ADR:_ written — shared `ADR-0011`, see `PALLETIQ-025`. Revisit this
ticket's specific vendor choice if the pre-flight check surfaces new
information not already in the plan's section 3 research.

_Scope note on `PALLETIQ-030` (2026-08-22) — Planning gate only, not started:_

_Origin:_ same plan/ADR — the plan's section 8 "Beyond pricing": the first
feature built on the stored identification record beyond pricing itself,
and the first ticket in this track for a persona other than Buyer.

_Pulled forward from Phase 4, resolved with the owner:_ `PROJ-PALLETIQ.md`'s
Phase 4 already names "Listing copy generation (titles/descriptions from
manifest + image data)" — this ticket is that bullet's first real
implementation, reusing `PALLETIQ-025`'s stored `item_scans` identification
record (brand, model, category, condition, notable features) as the input
instead of raw manifest text, per the plan's section 8 argument that this
is "new uses of work that's already being done," not new identification
work.

_Corrected 2026-08-24, before implementation starts:_ two assumptions
below turned out stale once checked against the actual shipped codebase
(`PALLETIQ-025`/`035` postdate this note) - see `ADR-0014`'s Consequences
section for the full account. (1) There is no `ai_tasks` pipeline to
extend in practice - both real Gemini call sites built since bypass it
entirely with their own dedicated worker + dedicated status fields
directly on their own feature's doc, and `ADR-0004` has been amended to
say so. (2) There is no link anywhere in the codebase between an
`item_scans` doc and an `InventoryItem` - "surfaced on the inventory item
it's associated with" was never actually buildable as stated. The
corrected _In scope_/_Firestore-RBAC_/_UI pattern_ sections below replace
the originals rather than layering a second, conflicting version.

_In scope:_ a new `generateListingCopy` `onTaskDispatched` Cloud Tasks
worker (the same dedicated-worker pattern `identifyItem.ts`/
`priceResearch.ts` actually established, not `ai_tasks`) making a
**text-only** Gemini call - no photos re-sent, just the already-stored
candidate/pricing/saleability fields - triggered by a new
`enqueueListingCopy` `onCall` (Owner/Manager only). New `item_scans`
fields: `listingCopyStatus`, `listingCopy: {title, description} | null`,
`listingCopyError` (see `ADR-0014`). A new Manager-facing page (route TBD
at implementation) - the first Manager-only UI surface in the app -
listing the tenant's completed + priced `item_scans` (reusing the
existing Data table pattern) with a "Generate listing copy" action per
row; the generated draft displays as an editable text area plus a
"regenerate" action, editable before use, not auto-published anywhere (no
marketplace integrations exist yet, Phase 4's own later bullet).

_Out of scope, deferred:_ keywords/SEO tags, defect descriptions, bundle
suggestions, cross-listing recommendations, the ROI calculator, and aging-
inventory alerts — all named in the plan's section 8 as further reusable
outputs of the same engine, each its own future ticket once this first one
validates the pattern; any marketplace integration to actually publish a
listing (separate, unstarted Phase 4 bullet); linking `item_scans` to
`InventoryItem` (a real, separate architectural decision `ADR-0014`
explicitly declined to make here - the ROI calculator bullet above would
need it, this ticket doesn't).

_Firestore/RBAC impact:_ `item_scans`' existing `read: isTenantMember`
rule already covers Store Manager - no rule change needed for reading.
The new `listingCopyStatus`/`listingCopy`/`listingCopyError` fields are
Cloud-Tasks-worker-write-only via the Admin SDK, same shape as every
other status field already on this doc - no new client write rule
needed. `enqueueListingCopy`'s own RBAC gate (Owner/Manager) lives in the
callable itself, matching `priceItemScan.ts`'s own Owner/Buyer gate
precedent.

_UI pattern notes:_ no documented pattern yet for an AI-generated,
user-editable text draft - flagging this gap now rather than inventing
one silently; a text-area pre-filled with the generated draft plus a
"regenerate" action is the plan, worth a `docs/design/components.md`
addition if this recurs (the plan's section 8 lists several more
features that would reuse the same "editable AI draft" pattern). Also
the first real Manager-only page - first live exercise of governance
Check III for this specific role.

_ADR:_ written - [`ADR-0014`](../adr/0014-listing-copy-generation.md),
superseding this note's own stale `ai_tasks`/inventory-linkage
assumptions; originating plan still `ADR-0011`/`treasure-hunter-plan.md`
§8.

_Close-out (2026-08-24):_ shipped exactly per `ADR-0014`, no further
drift. `generateListingCopy.ts` (a text-only Gemini call, no photos
re-sent) + `enqueueListingCopy.ts`/`listingCopyWorker.ts` (the same
dedicated-onCall-plus-`onTaskDispatched`-worker pair
`identifyItem.ts`/`priceResearch.ts` already established) + three new
`item_scans` fields (`listingCopyStatus`/`listingCopy`/
`listingCopyError`). New `ScannedItemsPage.tsx` at `/scanned-items`
(Owner/Manager-gated route and nav item), reusing the Data table pattern
and a new `TextAreaField.tsx` (the multi-line `TextField.tsx` mirror this
ticket's own scope note flagged as a documented gap). 33 new tests
(8 `generateListingCopy` + 11 `enqueueListingCopy` + 6
`listingCopyWorker` + 2 `itemScanActions` + 6 `ScannedItemsPage`).
Check IV (`design-system-auditor`, dispatched against all four
new/changed UI files): clean pass, no violations - confirmed
`TextAreaField.tsx` faithfully mirrors `TextField.tsx`, the Data table
pattern matches `WatchlistPage.tsx`/`DiscoveredLotsPage.tsx` precedent,
touch targets/RBAC-omission/mobile treatment all correct. No
`firestore.rules` change, as scoped.

**Live-verified twice before merge, not just unit-tested.** (1) The
actual Gemini call, against real data via the compiled output: a
genuinely thin-data fair-condition item correctly produced honest,
undersold-appropriate copy ("sold as-is for parts, repair, or a rebuild
project") without fabricating anything beyond the given `$15 CAD` price;
a second run with `salePrice: null` correctly produced copy with zero
dollar figures, confirming the "don't invent a price" instruction holds.
(2) The actual page/RBAC via a real Playwright session against real
`mrt-pallet-iq` Firestore (pre-deploy, so scoped to what's live-testable
without the not-yet-deployed callable - the "Generate listing copy"
click-through itself is covered in the post-merge live-verification
pass instead): signed in as a real Manager, confirmed `/scanned-items`
renders a real priced scan correctly with the nav item visible; signed
in as a real Buyer, confirmed the route redirects away and the nav item
is correctly absent - the RBAC boundary holds in both directions, not
just per the Check IV audit's static read of the code.

_Scope note on `PALLETIQ-031` (2026-08-22) — Planning gate only, not started:_

_Found via live verification while closing `PALLETIQ-020`:_ `scrapeRestockLots`
was deployed to `mrt-pallet-iq` and run for real for the first time (see
`PALLETIQ-020`'s close note in `docs/ACTIVE_CYCLE.md`). It succeeded — 399
new `restock_lots` docs created from 10 real category pages — but logged
`unparsedCount` warnings on 8 of those 10 pages (121 cards skipped, ~19% of
the ~520 total cards seen). Fetching one of those pages directly and
testing its titles against `parseLotListPage.ts`'s `TITLE_PATTERN` found
the exact cause: some lots use a warehouse-prefixed lot number
(e.g. `"1400 units of Pharmacy & Wellness - MSRP $25,190 - Like New (Lot #
105-917312)"`) instead of the plain-numeric format the regex's lot-number
capture group (`(\d+)`) assumes (e.g. `"...(Lot # 1011402)"`, which
`__fixtures__/category-page.html`'s sample data happened to only contain).
Every prefixed-lot-number card is silently dropped rather than stored —
real, ongoing data loss, not a cosmetic gap.

_In scope:_ `TITLE_PATTERN`'s lot-number capture group loosens from `(\d+)`
to accept an optional warehouse-prefix segment (e.g. `(\d+(?:-\d+)?)`),
verified against both the existing fixture's plain-numeric lot numbers and
a new fixture case covering the prefixed format. `RestockLotDoc.lotNumber`
already stores this as a plain string (confirmed via the live
`restock_lots/1011402` doc), and a hyphenated value is a valid Firestore
document ID, so no schema or storage-layer change is needed beyond the
regex itself.

_Out of scope:_ investigating what the `105-` prefix specifically denotes
(a warehouse/region code, most likely, but not load-bearing for the fix —
the regex just needs to accept the shape, not interpret it); any other
`unparsedCount` cause not already covered by this exact pattern — re-run
against a fresh page sample after the fix ships to confirm `unparsedCount`
drops to (near) zero rather than assuming this is the only format variant.

_Firestore/RBAC impact:_ none — no schema or rules change, fixes existing
parsing logic only.

_UI pattern notes:_ none — no UI change, this ticket ships no UI.

_ADR:_ not needed — bug fix within `ADR-0009`'s existing design, same
reasoning `PALLETIQ-023`/`024` used for bugs found via review of
`PALLETIQ-022`.

_Scope note on `PALLETIQ-032` (2026-08-22) — Planning gate only, not started:_

_Found via live verification while closing `PALLETIQ-031`:_ redeploying
`scrapeRestockLots` with the fixed `TITLE_PATTERN` and triggering a real
run crashed with `Memory limit of 256 MiB exceeded with 265-266 MiB
used` before ever reaching its completion log — confirmed via a direct
Cloud Logging query (the `firebase functions:log` CLI was showing stale
cached lines and didn't surface this on its own). It crashed identically
on a second, auto-retried attempt. Root cause: the function's memory
budget was only ever exercised against an empty `restock_lots`
collection (the very first run, `PALLETIQ-020`'s close) - every run
since has to hold a full existing-docs snapshot (`collection.get()`) in
memory alongside a freshly-scraped `lots` array, and `PALLETIQ-031`'s own
fix makes that array bigger by correctly recovering the ~121 previously-
dropped, prefixed-lot-number cards. Net effect: the scraper was crash-
looping every hour in production, making zero progress past its initial
399 lots.

_In scope:_ `scrapeRestockLots`'s `onSchedule` memory bumped from
`256MiB` to `512MiB` - matching `processManifestImport`'s own existing
resource-sandbox precedent (`ADR-0008`), with headroom above the
observed peak rather than the exact number.

_Out of scope:_ any deeper memory optimization (e.g. projecting only the
fields `scrapeRestockLots` actually needs from the existing snapshot
instead of full documents, paginating the existing-docs read) - a flat
memory bump is the same "pin it explicitly, don't over-engineer a
resource bound you haven't proven you need" reasoning `PALLETIQ-012`
already used, and 512MiB comfortably clears the observed ~266 MiB peak.
Revisit if the collection grows enough that 512MiB stops being enough.

_Firestore/RBAC impact:_ none - no schema or rules change, a Cloud
Functions resource-configuration change only.

_UI pattern notes:_ none - no UI change, this ticket ships no UI.

_ADR:_ not needed - a resource-bound tuning change within `ADR-0009`'s
existing architecture, same class of change `ADR-0008` already made for
`processManifestImport` without its own ADR.

_Scope note on `PALLETIQ-033` (2026-08-23) — Planning gate only, not started:_

_Found during `PALLETIQ-027`'s Check IV design-system audit and recorded as
a logged-not-fixed follow-up in `docs/ACTIVE_CYCLE.md`:_ `ItemScanPage`'s
retry button on a `saleabilityStatus === 'failed'` state calls the same
`startPricing` mutation (`priceItemScan`) as the pricing-failed retry
button - re-running the _entire_ waterfall (cache/UPC/grounding/eBay) - even
though the scan is already priced and only saleability scoring failed. A
user reading "try again" on a saleability failure would reasonably expect
just a re-score, not a full pricing re-run. Not blocking at the time (the
30-day `product_price_cache` means a moments-later retry mostly hits a warm
cache rather than re-fetching eBay), but a real UX/wiring mismatch worth
its own ticket rather than staying silently accepted.

_In scope:_ a dedicated way to re-trigger just `enrichItemScanPricing` for
an already-priced scan - either a small new `onCall` (e.g.
`retrySaleabilityScore`) that re-enqueues the same `enrichItemScanPricing`
Cloud Tasks worker PALLETIQ-027 already built, or (if it turns out cheap
enough) exposing `enqueueItemScan`'s existing task-queue enqueue call
through a second, narrower callable - implementation detail to settle at
build time, not here. Requires `scanData.pricingStatus === 'priced'`
(otherwise there's nothing to re-score against) and resets
`saleabilityStatus` to `'scoring'` before enqueueing, mirroring
`priceItemScan`'s own pre-enqueue state transition. `ItemScanPage`'s
saleability-failed `EmptyState` retry button switches from calling
`startPricing` to calling this new mutation.

_Out of scope:_ any change to the pricing-failed retry path (that one
correctly re-runs the full waterfall, since pricing itself is what
failed) - the mismatch is specific to the saleability-failed path only.
Also out of scope: a UI change to `PricingPanel` or `SaleabilityPanel`
themselves, and any change to `computeSaleability.ts`'s scoring formula -
this ticket is wiring/plumbing only, not a scoring-logic change.

_Firestore/RBAC impact:_ none new - the new callable reads/writes the same
`tenants/{tenantId}/item_scans/{scanId}` doc `priceItemScan` already
does, under the existing `product_price_cache`/`item_scans` rules from
`PALLETIQ-025`/`026`. Same Owner/Buyer role check as `priceItemScan`
(`request.auth.token.role !== 'owner' && !== 'buyer'` → `permission-denied`).

_UI pattern notes:_ no new UI pattern - reuses the existing
`docs/design/`-governed `EmptyState` + retry-button treatment already on
this page (`PALLETIQ-026`/`027`), just rewires which mutation the existing
saleability-failed button calls.

_ADR:_ not needed - adds one narrowly-scoped callable within `ADR-0011`'s
existing background-enrichment design (`enrichItemScanPricing` already
exists; this just gives it a second, narrower entry point), not a new
architectural decision.

_Scope note on `PALLETIQ-034` (2026-08-23) — Planning gate only, not started:_

_Reported directly by the owner:_ on the item-scan capture screen
(`ItemScanCapture.tsx`, `PALLETIQ-025`), adding a first photo works, but
adding a second photo silently does nothing - no thumbnail, no error, no
visible change. The owner also asked for a "choose from device" option,
since currently the only way to add a photo is the device camera.

_Root cause, confirmed via a throwaway repro test:_ the file input's
accumulation logic itself is correct - a jsdom test firing two sequential
`change` events on the same `<input>` node correctly ends up with two
photos in state. The bug is the `capture="environment"` attribute: it
forces the browser to launch the camera app directly, skipping the OS's
native file-picker sheet entirely (which is _also_ why there's no
"choose from device" option today - that sheet is what would normally
offer it). Reusing that same input node for a second camera capture is a
known-unreliable pattern on mobile browsers, particularly iOS Safari,
where the second capture's `change` event can silently fail to fire on
the same DOM node. Both the reported bug and the requested feature trace
back to this one attribute.

_In scope:_ split the single `capture="environment"` input into two
separate controls - "Take photo" (camera-only, one at a time) and
"Choose from device" (`accept="image/*" multiple`, no `capture`
attribute, opens the OS's normal picker/gallery). Each input gets a
`key` that changes after every successful add, forcing React to mount a
fresh DOM node per use rather than reusing one - the standard, reliable
workaround for the known iOS Safari repeat-capture bug, applied to both
controls defensively even though the bug reports were specifically about
the camera path. Also fixes an adjacent bug found while touching this
code: `URL.createObjectURL(photo)` is currently called fresh on every
render for every photo without ever revoking the previous URL - a real
(if slow) memory leak across a multi-photo session - revoke stale blob
URLs on removal/unmount as part of this same fix, since it's the exact
code being rewritten, not new scope.

_Out of scope:_ any change to `priceItemScan`/`enrichItemScanPricing`/
identification (`processItemScan`) - this is a capture-UI-only bug;
drag-and-drop upload (no evidence this is needed for the mobile-first
capture flow this screen is scoped to, per `docs/design/mobile-
responsive.md`'s Buyer-capture-flow exception); documenting a new
`docs/design/components.md` two-button-picker pattern - flagging the gap
(same as `ItemScanCapture.tsx`'s existing header comment already does)
rather than writing new design-system doc content in a bug-fix ticket.

_Firestore/RBAC impact:_ none - client-side capture UI only, no backend
change.

_UI pattern notes:_ still no documented pattern for a multi-photo
capture control (`ItemScanCapture.tsx`'s own header comment already
flags this gap from `PALLETIQ-025`) - two side-by-side dashed-border
"Add photo"-style buttons (same visual treatment already in use, just
two of them) rather than inventing a new visual style, per the mobile-
first density rules this screen already follows.

_ADR:_ not needed - a bug fix + a same-shape UI control added to an
existing screen within `ADR-0011`'s existing capture-flow design, not an
architectural decision.

_Scope note on `PALLETIQ-035` (2026-08-23) — Planning gate only, not started:_

_Reported directly by the owner:_ scanned items only ever show an MSRP -
`salePrice`/`salePriceLow`/`salePriceHigh`/`liquidationPrice`/`comps` stay
empty. Traced to `functions/src/pricing/waterfall.ts`: those fields depend
entirely on eBay Browse API comps, and `EBAY_APP_ID`/`EBAY_CERT_ID` (plus
`KEEPA_API_KEY`/`PRICECHARTING_API_KEY` for background enrichment) are
still the inert placeholder values set during `PALLETIQ-026`/`027`. A
`try/catch` swallows the resulting OAuth failure and gracefully degrades
to MSRP-only, exactly as designed - not a bug, an unfinished credential
dependency.

Investigating this surfaced two bigger problems with simply swapping in
real credentials: (1) the current vendor stack (eBay Browse API hardcoded
to the US marketplace, Keepa/Amazon US sales rank) is entirely
US-oriented, while the owner's actual target market is Ontario, Canada;
(2) eBay Browse API only ever returns active asking prices, not real sold
data (`types.ts` already documents this) - real sold-comp data needs eBay
Marketplace Insights, which `ADR-0011` itself flags as gated/unconfirmed
access.

The owner has a Standard Operating Procedure
(`docs/projects/SOP-Pricing-Research-v1.4.docx`) used successfully for
months in a separate pawn shop business (Ontario/Canada) - an LLM session
with live web search+fetch tools, researching a Canadian retail price,
Kijiji Ontario comps (new/sealed and used), eBay sold/completed listings,
and an open-box estimate, synthesized into one bottom-line recommended
price with rationale. This is a fundamentally different architecture than
the deterministic multi-vendor API waterfall PalletIQ currently has -
agentic LLM research vs. per-vendor API integrations, each requiring its
own credential/account.

_Decision, confirmed with the owner via `AskUserQuestion`:_ re-architect
the pricing engine to match the SOP's method - Ontario/Canada market,
LLM-driven live research via Gemini (which already has a `googleSearch`
grounding tool in this codebase, `functions/src/gemini/identifyItem.ts`)
replacing the eBay/Keepa/PriceCharting/Discogs/Google Books vendor
waterfall entirely. Confirmed via the installed `@google/genai` SDK
(v2.18.0) that `googleSearch` and `urlContext` (fetch a specific URL's
content, not just search snippets) can run together in one
`generateContent` call - the building block that maps directly onto the
SOP's "search, then `web_fetch` the direct page" workflow.

_In scope:_ new `priceResearch.ts` (the Gemini call, `googleSearch` +
`urlContext` tools, a prompt encoding the SOP's §4-8 rules, a Zod schema
mirroring its §8 Output Format) and `mapPriceResearch.ts` (pure
SOP-response → `PricingResult`/`SaleabilityInputs` mapping, including a
relocated, unchanged `computePriceVariance`); collapsing
`priceItemScan.ts` (shrinks to enqueue-only) + `enrichItemScanPricing.ts`
into one new async worker `priceItemScanWorker.ts` (the two-stage
fast/slow split's justification - Keepa being a separate slow call - no
longer applies once Keepa is gone); simplifying `retrySaleabilityScore.ts`
to a synchronous recompute from already-stored comps (no more separate
data source to re-fetch); an additive `source` field on `PricingComp`;
`PricingPanel.tsx` copy generalized away from eBay-only language; deleting
`ebayBrowseApi.ts`/`upcLookup.ts`/`keepa.ts`/`priceCharting.ts`/
`discogs.ts`/`googleBooks.ts`/`enrichment.ts`/`waterfall.ts`/
`computePrices.ts`/`params.ts` (the four vendor secrets) and their tests;
slimming `categoryProfile.ts` to just `computeCacheKey` (the SOP doesn't
category-branch). Confidence is computed deterministically server-side
from structured facts the LLM reports (sample sizes, thin-data flags),
not trusted from the LLM's own self-rating - this drives a real buy/pass
money decision.

_Out of scope:_ the SOP's regulated-goods addenda (§11 nicotine/vape,
§12 adult novelty) - specific to the pawn shop's actual inventory mix,
not PalletIQ's liquidation-pallet buyer persona; any change to
`identifyItem.ts` or the four-stage Capture→Identify→Price→Score shape
(Price+Score are recommended to co-locate into one task dispatch as an
implementation detail, not a stage removal); any Firestore schema/rules
change (none needed - `PricingResult`'s top-level shape is unchanged, no
new collections).

_A known, forced consequence of this ticket, not optional:_ simplifying
`retrySaleabilityScore.ts` (`PALLETIQ-033`) from an async worker-retry to
a synchronous recompute is a direct effect of deleting Keepa's separate
slow data source, not a scope-creep addition - called out explicitly here
and in the close-out notes as revising prior shipped work.

_Firestore/RBAC impact:_ none new - `item_scans`/`product_price_cache`
keep their existing `PALLETIQ-025`/`026` rules unchanged, no new
collections or roles.

_UI pattern notes:_ `PricingPanel.tsx` keeps its existing
`docs/design/explainable-scoring.md` score-badge + factor-breakdown
pattern unchanged structurally - only copy changes (source-generalized
comp labeling instead of eBay-only language). `SaleabilityPanel.tsx` is
untouched (`SaleabilityResult`'s shape doesn't change).

_Known risk, not resolved by planning - resolved by a required pre-flight
spike during implementation:_ `docs/projects/treasure-hunter-plan.md` §12
notes eBay closed _logged-out_ sold-listing access in July 2026 - an
anonymous `urlContext` fetch may not be able to load eBay's sold-listings
pages at all. The prompt/schema design builds in the SOP's own fallback
for this (`ebaySold.thin`/`dataQuality.flags`, "flag when data is thin
rather than force a number") rather than assuming it will work; the
pre-flight spike (live `researchPrice()` calls against real items, before
finalizing the prompt) confirms which path is actually hit in practice.

_ADR:_ written - [`ADR-0012`](../adr/0012-treasure-hunter-pricing-llm-research-replaces-waterfall.md).
Supersedes `ADR-0011`'s "waterfall design, vendor
list" paragraph and its secrets list; explicitly confirms what's NOT
superseded (the four-stage shape, the async AI boundary treatment, the
Firestore collections/rules, the explainable-scoring UI reuse pattern,
the persona/RBAC/mobile-design decisions).

_Scope note on `PALLETIQ-036` (2026-08-23) — Planning gate only, not started:_

_Reported directly by the owner:_ uploading 2+ photos on the item-scan
capture screen "takes too long and never finished"; 1 photo "still took
a long time but did finish"; pricing afterward "took a very long time."
Asked to reduce friction/wait times generally and add a spinning
indicator wherever the app is waiting.

_Root cause, confirmed via code investigation:_ no photo compression
exists anywhere, client or server. `ItemScanCapture.tsx` uploads raw
camera files as-is; `processItemScan.ts` downloads each from Storage
and `identifyItem.ts` base64s every one into a single Gemini
`generateContent` call. Real phone photos run 3-8MB each - 5 photos can
total ~50MB raw, ~66MB once base64-inflated, all sent inline in one
request. Worse: `processItemScan.ts`'s 300s `onTaskDispatched` timeout,
when actually hit, is a platform-enforced kill that never reaches the
function's own `catch` block - `item_scans.status` stays stuck at
`'processing'` while Cloud Tasks silently retries (up to 3 attempts, up
to ~15 minutes) with no visible change to the client, which polls
indefinitely with no give-up logic. This is exactly "never finishes."
Pricing's separate ~30-50s latency is expected and inherent
(`PALLETIQ-035`'s live multi-step web research), not a bug to
eliminate, but something to set honest expectations around.

Separately: `docs/design/components.md` already documents a
spinner-vs-skeleton rule ("skeletons for long waits with real layout to
preview... spinners for short indeterminate waits like a button
mid-submit") that has never been implemented - zero
`Spinner`/`animate-spin` instances exist anywhere in `src/`. The three
item-scan wait states (identify/price/score) already correctly use
skeletons per that rule; the actual gap is `ItemScanCapture.tsx`'s
submit button, a textbook "button mid-submit" case, which today just
swaps text with no indicator at all.

_In scope:_ new `src/lib/itemScans/compressPhoto.ts` (client-side
`createImageBitmap`+canvas resize to 1600px longest-edge / 0.8 JPEG
quality, with graceful fallback to the original file on any decode/
encode failure - e.g. undecodable HEIC - so compression can never block
or fail an upload), wired into `ItemScanPage.tsx`'s `scanMutation`
immediately before the existing `uploadScanPhoto` call, still inside
the same `Promise.all`; new `src/components/Spinner.tsx` (a `lucide-
react` `Loader2` + Tailwind `animate-spin` wrapper, `role="status"`) -
the first real implementation of `components.md`'s documented pattern,
used only in `ItemScanCapture.tsx`'s submit button; expectation-setting
second-line captions added to the identify/pricing skeletons in
`ItemScanPage.tsx` ("Usually takes under a minute." / "This can take
up to a minute — we're checking retail, Kijiji, and eBay listings
live."); `processItemScan.ts`'s `timeoutSeconds` reduced 300→120 now
that payloads will be small (shrinks the worst-case silent-retry window
from ~15 min to ~6 min); a soft 90-second "Still working — this is
taking longer than usual." reassurance line appended to the identify/
pricing skeletons without stopping polling or swapping to a failed UI.

_Out of scope:_ changing `priceItemScanWorker.ts`'s 300s timeout
(pricing's latency is inherent to live web research, unrelated to this
bug - its ceiling stays as-is); any heartbeat/progress-write mechanism
(would need a second scheduled function or client-side staleness
detection - meaningfully bigger scope than this bug calls for, given
the root cause is being fixed directly); any hard client-side give-up/
stop-polling logic (identification's and pricing's legitimate worst-
case durations differ too much post-tuning - ~6 min vs. ~15 min - for
one threshold to be both safe and useful; a hard "failed" swap risks
firing while a real, still-working pricing retry is in flight); any
change to the pricing research prompt/architecture itself; swapping the
three existing correct skeletons for spinners (would regress against
`components.md`'s own rule and the rest of the app's convention).

_Firestore/RBAC impact:_ none new - no schema change.

_UI pattern notes:_ `Spinner.tsx` is the first real instance of
`components.md`'s already-documented spinner-for-short-waits pattern;
the three existing skeletons stay skeletons, already correct per that
same rule. `storage.rules`' existing 10MB-per-file cap on item-scan
photo uploads stays as-is - a generous upper bound above the compressed
target, and still needed as the ceiling for the HEIC-decode-failure
fallback path that uploads the original file unmodified.

_ADR:_ not needed - a bug fix plus the first real implementation of an
already-decided, already-documented UI pattern (`components.md`'s
spinner rule, decided under `ADR-0002`'s design-system-adherence
umbrella), not a new architectural decision. Same reasoning class
`PALLETIQ-033`/`034` used.

## PALLETIQ-037: Verify pricing comps actually resolve before trusting them

_Scope note (2026-08-23) — Planning gate only, not started:_ surfaced during
a review of `functions/src/pricing/priceResearch.ts` requested by the owner.
The Gemini research call's comp titles/URLs (Kijiji new/used, eBay sold) are
never checked server-side once returned - `mapPriceResearch.ts` passes them
straight through into `PricingResult.comps`, and `PricingPanel.tsx` renders
`comp.url` as a plain link with no validation. A hallucinated comp would
look identical to a real one in the UI, on a signal that drives a real
buy/pass money decision.

_In scope:_ a lightweight server-side verification step (e.g. a HEAD/GET
check that `comp.url` resolves and its response roughly matches the
expected domain per `comp.source` - `kijiji.ca` for `kijiji_new`/
`kijiji_used`, `ebay.ca`/`ebay.com` for `ebay_sold`) run before a
`PricingResult` is cached/written to the scan doc; deciding what happens to
a comp that fails verification (drop it vs. flag it) and whether that
should affect `computeConfidence()`.

_Out of scope:_ a full anti-hallucination framework; deep content-matching
of the fetched page against the comp's claimed title/price (only that the
URL resolves and is on the expected domain).

_Firestore/RBAC impact:_ none new - `product_price_cache` keeps its
existing `write: if false` / Admin-SDK-only rule; this only changes what
gets written, not who can write it.

_UI pattern notes:_ none - `PricingPanel.tsx`'s comp rendering is unchanged;
this is a data-quality gate before storage, not a new UI pattern.

_ADR:_ not needed - a lightweight verification step within the existing
pricing-research design, as predicted; no architectural decision beyond
what `verifyComps.ts`'s own header comment documents.

_Close-out (2026-08-23):_ shipped as scoped. `verifyComps.ts`'s
`verifyPricingComps()` runs a real `fetch` (GET, 8s timeout, follows
redirects) against each comp with a `source`/`url` before
`priceItemScanWorker.ts` caches or stores the `PricingResult`, checking
the resolved host against `EXPECTED_DOMAINS` per source
(`kijiji.ca` / `ebay.ca`+`ebay.com`). Resolved the two questions the scope
note deferred: a comp that fails verification keeps its title/price but
has its `url` nulled (not dropped - the price signal may still be real
even if the link isn't verifiable); `computeConfidence()` is unchanged
(out of scope, consistent with `PALLETIQ-038`'s precedent of not touching
scoring logic). A cache hit skips re-verification entirely - a cached
`PricingResult`'s comps were already verified at write time.

A live pre-flight check against real `ebay.ca`/`ebay.com`/`kijiji.ca`
(not just mocks) surfaced a real design flaw before merge: eBay returns
HTTP 403 to _any_ plain server-side fetch (homepage, search results),
regardless of `User-Agent`/`Accept`/`Sec-Fetch-*` headers - consistent
with datacenter-IP bot-blocking, which Cloud Functions' egress would also
hit in production, not just this sandbox. Shipping the original
ok-or-fail check as designed would have nulled the URL on virtually
every real eBay comp - a false, noisy "could not be verified" signal on
links that were actually fine. Fixed by treating `403`/`429` responses as
a third, inconclusive outcome (comp left completely untouched - no url
change, no factor) rather than a failure, reserving "failed" for
network errors, other non-2xx statuses (e.g. a genuine 404 dead link),
and wrong-domain resolutions. Re-verified live against real
`kijiji.ca`/`ebay.ca` URLs post-fix: real links kept, a fake domain and a
wrong-domain-for-its-source-tag URL both still correctly caught. See the
`PALLETIQ-037` drift note in `docs/ACTIVE_CYCLE.md` for the full account.

_Firestore/RBAC/UI impact:_ none, as scoped - confirmed no changes
outside `functions/src/pricing/verifyComps.ts` (new) and
`functions/src/item-scans/priceItemScanWorker.ts` (one new import + one
new await before the existing cache write).

## PALLETIQ-038: Speed up pricing research by splitting the single Gemini call into parallel legs

_Scope note (2026-08-23) — Planning gate only, not started:_ requested by
the owner after reporting pricing "takes a long time and sometimes doesn't
even return anything," with no visible progress indicator (the indicator
half of that report was a real bug, fixed directly in this same session -
see the `ItemScanPage.tsx` `refetchInterval` fix in this ticket's branch
history; not itself part of PALLETIQ-038's scope). Root cause: `researchPrice()`
runs the SOP's five steps (retail, Kijiji new, Kijiji used, eBay sold,
open-box) sequentially inside one Gemini model turn - `priceItemScanWorker.ts`
budgets up to 300s for it, and none of the steps can overlap.

_In scope:_ see [`ADR-0013`](../adr/0013-pricing-research-parallel-legs.md)
for the full design - splitting into three concurrent Gemini calls (retail+
open-box, Kijiji, eBay sold) plus one lightweight synthesis call, run via
`Promise.allSettled` and merged into the same `PriceResearchResponse` shape
`mapPriceResearch.ts` already expects; per-leg failure handling (a failed
leg degrades to null/empty/thin plus a `dataQuality.flags` entry, rather
than failing the whole price as today's single call does).

_Out of scope:_ changing what data each research leg looks for or the SOP's
synthesis rules themselves; changing `computeConfidence()`/
`computeSaleability()`; `PALLETIQ-037`'s comp-verification work (independent,
can land in either order); any model swap (noted in the ADR as a separate,
undecided lever).

_Firestore/RBAC impact:_ none - `product_price_cache`'s key/shape and rules
are unchanged per the ADR.

_UI pattern notes:_ none - `PricingPanel.tsx`/`ItemScanPage.tsx` are
unaffected; the merged response still maps onto the existing, unchanged
`PricingResult` shape.

_ADR:_ written - [`ADR-0013`](../adr/0013-pricing-research-parallel-legs.md).

## PALLETIQ-039: Browse discovered lots UI (restock.ca scraper results)

_Scope note (2026-08-24) — Planning gate only, not started:_ `PALLETIQ-020`
(Track A, `ADR-0009`) shipped a scheduled scraper that keeps a global
`restock_lots` collection in sync with restock.ca's public listings, but
explicitly deferred the UI: "no 'browse discovered lots' page exists yet -
a natural follow-on ticket once this ticket's data exists." That data has
existed and been running live in `mrt-pallet-iq` since `PALLETIQ-020`/
`031`/`032` closed - this ticket is that follow-on, requested directly by
the owner.

_Pulled forward from Phase 4, same track as `PALLETIQ-020`/`021`/`031`/
`032`:_ a UI on top of the same "automated vendor ingestion" slice, running
as a parallel track alongside Phase 2, not gated by it - see `ADR-0009` and
`docs/ROADMAP.md`'s Phase 4 pull-forward note.

_In scope:_ a new Buyer-facing page (route + nav entry, e.g. `/discovered-lots`)
listing `restock_lots` documents (`functions/src/restock-scraper/types.ts`'s
`RestockLotDoc`: `title`, `category`, `units`, `condition`, `msrp`, `price`,
`costPerUnit`, `vendor`, `warehouse`, `productUrl`, `imageUrl`,
`manifestUrl`, `status`). A `status: 'active'` filter by default (closed
lots hidden, not deleted - `scrapeRestockLots.ts` marks rather than removes
them). Sort/filter by category and by `firstSeenAt`/`lastSeenAt`
(newest-discovered-first as the default, not a "closes soon" sort -
restock.ca lots are fixed-price, not auctions, so they have no closing
time; that concept is specific to `watchlist_lots`'/`PALLETIQ-021`'s
auction sources and doesn't apply here). Each row links out to
`productUrl` (and `manifestUrl` when present) exactly like `PricingPanel.tsx`'s
existing external-comp-link pattern. Nav entry added to `AppShell.tsx`'s
base `NAV_ITEMS` (visible to every role, unrestricted, matching Watchlist's
own treatment) - correct per `firestore.rules`' existing `restock_lots`
read rule (`isSignedIn()`, any authenticated user/tenant/role, not
Buyer-specific), even though the ticket's Persona is Buyer as the primary
day-to-day user.

_Out of scope, explicitly deferred:_ a unified "all sourcing opportunities"
view merging `restock_lots` (global, read-only) with `watchlist_lots`
(tenant-scoped, manually-edited) into one list/collection - `ADR-0009`'s
own Alternatives section left this open on purpose ("revisit if/when a
real 'all opportunities' UI is scoped - not a speculative abstraction
today"). This ticket is that revisit trigger in the sense that a second
list UI now exists, but building the unification itself is a separate,
larger architectural decision (a merged read model across two different
security domains) that this ticket does not make - flagged here so a
future ticket can pick it up deliberately rather than by surprise. Any
action beyond viewing/linking out (e.g. "convert a discovered lot into a
watchlist entry" or into a real purchase/import) - a plausible future
bridge, not this ticket's scope, same relationship `PALLETIQ-020` already
named for "convert to a real vendors/imports flow." Search/full-text
filtering beyond category - a plain category dropdown + newest-first sort
is enough for a first pass at ~500-1000 active lots; revisit if that proves
insufficient in practice. Any change to `scrapeRestockLots.ts` or the
scraper's own data quality (`PALLETIQ-031`'s ~2% residual unparsed-card
rate) - this ticket only reads what's already stored.

_Firestore/RBAC impact:_ none new - `restock_lots`' existing
`firestore.rules` (`read: isSignedIn()`, `write: if false`) already covers
this read-only page; no new collection, no rules change. `docs/personas/
buyer.md` already lists `restock_lots` (read) from `ADR-0009`'s close-out,
no persona-doc update needed either.

_UI pattern notes:_ `docs/design/components.md`'s Data table pattern
(same one `PALLETIQ-021`'s closes-soon `/watchlist` view already
established, and `VendorsPage`/`ManifestsPage`/`InventoryPage` all use) -
no new pattern. First read-only external-link-out list sourced from a
global (not tenant-scoped) collection in the UI layer - `product_intelligence`
predates any UI, so this is a new-but-not-novel combination of two
existing patterns (Data table + `PricingPanel.tsx`'s external-comp-link
treatment), not a new one to invent.

_ADR:_ not needed - no new collection, no rules change, no new
architectural tradeoff; reuses `ADR-0009`'s existing `restock_lots` design
and `docs/design/components.md`'s existing Data table pattern. The
"unified sourcing view" question flagged above as deferred would need one
if it's ever picked up, per `ADR-0009`'s own note - not this ticket.

## PALLETIQ-040: Fix restock.ca scraper category field sometimes containing item title, not category

_Scope note (2026-08-24) — Planning gate only, not started:_ found via
`PALLETIQ-039`'s live verification against real `mrt-pallet-iq` data, not
a report or a test failure. Of 55 unique `category` values across 512
live active `restock_lots` documents, 21 (~38%) are actually
item-specific product names (e.g. `"14-inch Wheel Covers - Silver Finish

- Part Number KT1061-14S/L"`, `"Ionic Table Desks - 48 X 2"`, `"Offices
  To Go Reception Suites - 84" x 72" x 42.5" - Absolute Acajou"`) rather
than genuine categories (`"Automotive"`, `"Bicycles"`, `"Electronics"`,
etc.). Root cause is in `functions/src/restock-scraper/parseLotListPage.ts`'s
category-extraction logic - some category pages apparently don't expose
a genuine category breadcrumb the parser can read, and it falls back to
something too specific (likely the listing's own title or a sub-heading).
Not a `PALLETIQ-039`UI defect -`DiscoveredLotsPage.tsx`correctly
renders whatever`category` string is actually stored, per that ticket's
  own scope.

_In scope:_ fix `parseLotListPage.ts`'s category extraction so it
reliably captures a genuine category (or a documented, honest fallback
value like `"Uncategorized"` if the source page truly has none) instead
of a mis-parsed title/sub-heading. Fixture-based test coverage using the
real captured examples above (matching `PALLETIQ-031`'s own precedent of
testing against a real captured title format, not a synthetic one). No
manual backfill of already-stored `restock_lots` docs needed -
`scrapeRestockLots` re-fetches and updates every still-active lot on its
existing hourly schedule (confirmed working via `PALLETIQ-032`'s own live
verification: a normal run updates hundreds of existing docs), so a
corrected extractor self-heals every currently-active lot within one
scrape cycle; only lots that close before the next scrape keep a
stale/wrong category, a low-value one-time inaccuracy in already-`closed`
data with no live consumer, not worth a special backfill script for.

_Out of scope:_ `DiscoveredLotsPage.tsx`/any UI change - it already
correctly displays whatever is stored, nothing to fix there. A manual
backfill migration for existing docs (see above - not needed). The
broader "unified sourcing view" question `PALLETIQ-039`'s own scope note
flagged as deferred - unrelated to this data-quality fix.

_Firestore/RBAC impact:_ none - `restock_lots`' schema/rules are
unchanged; `category` stays a plain `string` field, this only changes
what value the scraper computes for it.

_UI pattern notes:_ none - no UI code touched.

_ADR:_ not needed - a scraper parsing-logic bug fix within the existing
`ADR-0009` design, not a new architectural decision, matching
`PALLETIQ-031`'s own precedent for the same file.

_Close-out (2026-08-24):_ shipped as scoped, with one real correction to
the scope note's own premise. Investigating found this scraper only ever
fetches restock.ca's one combined `/all/` catalog listing (see
`scrapeRestockLots.ts`'s `CATEGORY_PATH`), never per-category pages, and
the fixture HTML has no separate category element anywhere - so there
was never a "genuine category breadcrumb" for the parser to switch to
reading instead, as the scope note speculated. The only real fix
available is a heuristic on the title-derived text itself:
`normalizeCategory()` in `parseLotListPage.ts` falls back to
`"Uncategorized"` when the parsed category clause contains a digit or
`"` (dimensions, part numbers, inch marks) or exceeds 40 characters -
checked against every real example from the `PALLETIQ-039` finding
before shipping. 9 new fixture-based tests
(`parseLotListPage.test.ts`, using the real captured category strings
from that finding) - 5 confirming genuine item-specific titles get
normalized, 4 confirming real genuine categories pass through unchanged.
**Live-verified against all 512 real active lots before closing:** 55
unique category values before the fix, 40 after (simulated against the
shipped heuristic) - a real ~27% reduction, not total elimination (a few
borderline non-digit product names like `"Castor End Tables - White"`
still pass through as their own entries), matching the scope note's own
"meaningfully reduces junk," not "eliminates," framing. No manual
backfill - the next hourly `scrapeRestockLots` run re-normalizes every
still-active lot automatically. Full checklist clean: `functions` build/
lint/`vitest run` (227/227, up from 218) and repo-root format/lint/
typecheck/`npm test` (192/192, unaffected). No `firestore.rules`/UI
change, as scoped.

## PALLETIQ-041: Import discovered restock.ca lot's manifest into tenant inventory

_Scope note (2026-08-24) — Planning gate only, not started:_ `PALLETIQ-039`'s
own scope note named and deferred this exact idea — "convert a discovered
lot into a real purchase/import... a plausible future bridge, not this
ticket's scope." Requested directly by the owner: an "Import" button on
`DiscoveredLotsPage.tsx` for a `restock_lots` entry that pulls its manifest
into the tenant's own inventory via the existing manifest-import pipeline.
Sequenced before `PALLETIQ-042` (profitability scoring), which depends on
this ticket's output (a completed tenant-scoped import) and cannot start
first.

_Pulled forward from Phase 4, same track as `PALLETIQ-020`/`021`/`031`/
`032`/`039`/`040`:_ "automated vendor ingestion" already named in
`docs/projects/PROJ-PALLETIQ.md`'s Phase 4 bullets, running as a parallel
track, not gated by Phase 2/3 — see `ADR-0009`/`docs/ROADMAP.md`'s Phase 4
pull-forward note.

_In scope:_ a new Buyer/Owner-gated `onCall` (`enqueueDiscoveredLotImport`)
that validates the target `restock_lots/{lotId}` doc (`status: 'active'`,
non-null `manifestUrl`), writes a `queued` `imports/{importId}` doc (new
optional `sourceRestockLotId` field), and enqueues a Cloud Tasks worker —
never an inline fetch on the request path. The worker: fetches
`manifestUrl` server-side from an allowlisted restock.ca host only (the URL
always comes from the `restock_lots` doc, never client input), validates
`Content-Type`/magic bytes against CSV/XLSX (rejecting PDF or any other
format with an explicit "manifest not available in a supported format"
failure status — no PDF-parsing work in this ticket), enforces `ADR-0008`'s
existing size cap, uploads accepted content to the tenant's standard
manifest Storage path, then hands off to the **existing, unmodified**
`processManifestImport.ts`. Auto-provisions (get-or-create, idempotent) a
per-tenant `vendors/restock-ca` doc (`manifestFormat: 'csv'`, name
"Restock.ca (auto-imported)") the first time a tenant uses this feature —
`PALLETIQ-022` already confirmed restock.ca's real manifest shape is CSV.
Passes `restock_lots.price` through as `totalPurchasePrice`, reusing
`ADR-0010`'s existing flat-rate-per-unit allocation unchanged. UI: an
"Import" button + status affordance (queued/processing/completed/failed,
mirroring `item_scans`' existing status-badge pattern) on
`DiscoveredLotsPage.tsx`.

_Out of scope, explicitly deferred:_ PDF manifest parsing (no PDF-parsing
capability exists in the codebase; ship CSV/XLSX only, revisit if real
usage shows PDF is common); any change to `fetchManifestLink.ts`'s
never-verified-against-a-real-page manifest-link detection; the
profitability scoring itself (`PALLETIQ-042`); editing/retrying a failed
import beyond today's existing "re-upload as new import" UX
(`ADR-0010`'s existing limitation, unchanged); the "unified sourcing view"
question `ADR-0009`/`PALLETIQ-039` already deferred — this bridges one
discovered lot into one import on explicit buyer action, not a merged read
model.

_Firestore/RBAC impact:_ `imports/{importId}` gains an optional
`sourceRestockLotId: string | null` field — no rules change (still
`isOwnerOrBuyer` write, same as today). New `tenants/{tenantId}/
vendors/restock-ca` docs get created by this flow — existing `vendors`
rules (`isOwnerOrBuyer` write, per `ADR-0006`/`ADR-0007` lineage) already
cover it, confirmed at close via `firestore-rules-auditor`, not assumed
here. No new collection.

_UI pattern notes:_ button + status affordance reuses `item_scans`'
existing status-badge pattern (queued/processing/completed/failed) rather
than inventing a new one; `docs/design/components.md`'s Data table pattern
(already in use on this page per `PALLETIQ-039`) is otherwise unchanged.

_ADR:_ written — [`ADR-0015`](../adr/0015-discovered-lot-import-and-profitability-scoring.md).

## PALLETIQ-042: Score imported lot for profitability via text-based pricing research

_Scope note (2026-08-24) — Planning gate only, not started:_ requested
directly by the owner alongside `PALLETIQ-041`, using "a similar pricing
mechanism to the one used for single items" (the Treasure Hunter pipeline,
`ADR-0011`/`0012`/`0013`). **Depends on `PALLETIQ-041`** — needs a
completed, tenant-scoped import with line items to score; cannot start
first.

_Pulled forward from Phase 4:_ "pricing intelligence engine," already named
in `docs/projects/PROJ-PALLETIQ.md`'s Phase 4 bullets — same pull-forward
posture as `PALLETIQ-041`/`ADR-0009`/`ADR-0011`.

_In scope:_ a new Buyer/Owner-gated `onCall`
(`enqueueLotProfitabilityScore`), callable once an import (from
`PALLETIQ-041` or any regular manual upload) has `status: 'completed'`.
Enqueues a Cloud Tasks worker — never inline, per governance Check II. The
worker reads the import's `lineItems`, deduplicates by SKU/UPC (one
research call per distinct SKU, not per unit), builds an
`ItemScanCandidate`-shaped value directly from manifest fields for each
distinct line item (no Gemini vision call, no photo — `priceResearch.ts`'s
input is already text-only), and calls the **existing, unmodified**
`priceResearch.ts` once per distinct SKU. Aggregates projected resale value
(Σ `bottomLine.priceCad × quantity` per SKU) against landed cost (Σ
`unitCost × quantity`, reusing `PALLETIQ-009`'s existing landed-cost
calculation) into a lot-level profitability score/margin, written back to
the import. Must decide and ship a per-import SKU research cap or sampling
strategy before completion (flagged in `ADR-0015` as a real open question,
not deferred again). UI reuses `docs/design/explainable-scoring.md`'s
existing score-badge + factor-breakdown + provenance-labeling pattern (the
same instantiation `ADR-0011`'s saleability score already uses) — no new
pattern.

_Out of scope, explicitly deferred:_ condition grading of manifest line
items (manifests don't state condition; this ticket must default/flag it
rather than guess, a real limitation to surface in the UI, not silently
paper over); changing `priceResearch.ts`'s research logic or SOP itself;
usage-metering/rate-limiting enforcement beyond the per-import SKU cap
this ticket ships (same flagged-not-blocking posture `ADR-0011` used for
`item_scans` cost); scoring lots imported before this ticket ships without
a manual re-trigger (no backfill).

_Firestore/RBAC impact:_ profitability result written to
`imports/{importId}` (or a new `imports/{importId}/profitability` subdoc,
left to implementation) — `isOwnerOrBuyer` write, same as today, no new
collection expected. Confirmed at close via `firestore-rules-auditor`, not
assumed here.

_UI pattern notes:_ `docs/design/explainable-scoring.md`'s existing
score-badge pattern, reused verbatim — no new pattern to audit for Check IV
beyond confirming correct reuse.

_ADR:_ written — [`ADR-0015`](../adr/0015-discovered-lot-import-and-profitability-scoring.md).

## PALLETIQ-043: Dismiss a discovered restock.ca lot from the tenant's Discovered Lots list

_Scope note (2026-08-24) — Planning gate only, not started:_ requested
directly by the owner alongside `PALLETIQ-041`. `restock_lots` is a global,
cross-tenant, Cloud-Functions-write-only collection (`ADR-0009`) — a tenant
can never delete or mutate the shared doc itself, so "removing" a lot from
one tenant's `DiscoveredLotsPage.tsx` list has to be a per-tenant overlay
that hides it from that tenant's view only, leaving the shared doc and
every other tenant's view untouched.

_In scope:_ a new tenant-scoped `dismissed_lots/{lotId}` collection (doc ID
= the dismissed `restock_lots` doc's ID, value just `{dismissedAt:
serverTimestamp()}` — no richer shape needed). A "Remove" row action on
`DiscoveredLotsPage.tsx`, reusing `WatchlistPage.tsx`'s existing `Trash2`
icon-button pattern (same row-action precedent already on this page for
the external-link/manifest-link icons), that writes a `dismissed_lots` doc
for the current tenant — a direct tenant-scoped Firestore write, not a
Cloud Function, matching `watchlist_lots`' existing write pattern (no
async/Cloud Tasks boundary needed, this isn't an AI call). The page's list
query filters out any lot ID present in the signed-in tenant's
`dismissed_lots`.

_Out of scope, explicitly deferred:_ un-dismissing / restoring a
previously dismissed lot (no "undo" UI in this ticket — a real limitation,
not silently papered over); bulk-dismiss / dismiss-all; automatically
un-dismissing if the underlying lot's data changes (e.g. a price drop) —
a dismissal is permanent from that tenant's perspective until a future
ticket adds restore; any change to the global `restock_lots` collection
itself, which this ticket never reads differently or writes to.

_Firestore/RBAC impact:_ new collection
`tenants/{tenantId}/dismissed_lots/{lotId}` — `isTenantMember` read,
`isOwnerOrBuyer` write, mirroring `watchlist_lots`' existing rule shape
exactly (`ADR-0006` lineage) since this is the same "Buyer's daily sourcing
job" RBAC posture, not an admin task. New collection, so Check I applies —
needs its own rules test pair at close.

_UI pattern notes:_ reuses `WatchlistPage.tsx`'s existing `Trash2`
icon-button row-action verbatim — no new pattern to audit for Check IV.
`docs/design/components.md`'s Data table pattern (already in use on this
page per `PALLETIQ-039`) is otherwise unchanged.

_ADR:_ not needed — a straightforward tenant-scoped overlay collection
with no new tradeoffs, directly mirroring `watchlist_lots`' existing shape
and RBAC rule (`ADR-0006`/`ADR-0009` already cover the relevant
decisions).

## PALLETIQ-044: Fix fetchManifestLink.ts extracting a false-positive nav link, not a real manifest

_Scope note (2026-08-24) — Planning gate only, not started:_ found via
`PALLETIQ-041`'s own live-verification pass against real production data,
not reported by the owner. `fetchManifestLink.ts`'s own header comment
already flagged the risk: "written and tested against a synthetic
fixture... verify/adjust the selectors below against a real restock.ca lot
detail page before relying on this in production." That verification
finally happened here, and the selector is wrong: querying all 500 real
`active` `restock_lots` docs (spanning dozens of categories - Lawn Tools,
Coffee Tables, Rugs, Home Products, and more) shows every single one has
the _identical_ `manifestUrl`:
`https://www.restock.ca/furniture/unmanifested-furniture/` — a real
site-wide nav/footer link present on every lot detail page, matched by
`extractManifestLink`'s `href.includes('manifest')` check because
"unmanifested-furniture" contains the substring "manifest". It is a
genuine HTML category page (confirmed live: `Content-Type: text/html`,
`<title>Unmanifested Furniture</title>`), not a per-lot manifest file.
Every lot currently in the database has this same wrong value - `100%` of
attempts to use `PALLETIQ-041`'s new "Import" button will correctly fail
(`PALLETIQ-041`'s own host-allowlist + HTML-content-sniffing rejects it
safely, verified live) but the feature is functionally dead until this is
fixed. `P1`, not `P2` like its sibling tickets, because it fully blocks a
just-shipped feature's real-world utility, not because of new scope.

_In scope:_ fix `extractManifestLink`'s selector/matching logic
(`functions/src/restock-scraper/fetchManifestLink.ts`) against **real**
restock.ca lot detail pages across a few different categories/lots (not
just the one synthetic fixture this was originally written against) -
confirm it returns a genuine per-lot file link when a real manifest
exists on the page, and returns `null` (not a false positive) when it
doesn't. Decide and ship a backfill/re-fetch plan for the 500 already-
`active` lots carrying the wrong value today -
`scrapeRestockLots.ts`'s own comment notes `manifestUrl` is "not re-fetched
on later runs once a lot is already known," so without an explicit
backfill step every existing lot stays permanently wrong even after the
extraction logic itself is fixed.

_Out of scope, explicitly deferred:_ any change to `PALLETIQ-041`'s import
pipeline itself (already correct - verified live to fail safely on bad
manifest data, nothing to fix there); PDF-manifest parsing (`ADR-0015`
already deferred this separately); backfilling lots that are no longer
`active` (`status: 'closed'`) - only the live, importable set matters.

_Firestore/RBAC impact:_ none - scraper-internal logic and a one-time
backfill only, no schema/rules change.

_UI pattern notes:_ none - `DiscoveredLotsPage.tsx` and every other UI
surface are unaffected.

_ADR:_ not needed - a bug fix to existing, already-decided scraper logic,
not a new architectural decision.

## PALLETIQ-045: Log Gemini usage per call site and fix pricing retry-amplification bug

_Scope note (2026-08-24) — Planning gate only, not started:_ found via
`docs/reports/2026-08-24-gemini-cost-audit.md`, a deep-dive requested
directly by the owner into why Gemini spend seemed high. Two findings from
that report, both verified against real code, addressed here; two related
findings (usage metering, model choice) are split into their own tickets
(`PALLETIQ-046`/`047`) since they're independently shippable decisions.

_In scope:_ (a) structured per-call Gemini usage logging - one
`logger.info()` after each `generateContent()` call in
`gemini/identifyItem.ts`, `pricing/priceResearch.ts` (all 4 legs, via
`runLeg`), and `listing-copy/generateListingCopy.ts`, recording call site,
model, whether the call was grounded, and the four `usageMetadata` fields
the SDK already returns (`promptTokenCount`, `candidatesTokenCount`,
`toolUsePromptTokenCount`, `thoughtsTokenCount`) - the only way to see
which pricing leg actually costs the most, since no billing-export or
logging exists today. (b) Fix a real bug: `pricing/priceResearch.ts`'s 3
research legs already degrade gracefully to a null/empty default on
individual failure, but the 4th synthesis call has no fallback and throws
by design; because `product_price_cache` is only written after full
success and every Gemini-calling worker retries up to 3x on failure, a
synthesis-only failure discards 3 already-paid grounded research calls and
reruns all 4 from scratch (worst case 12 Gemini calls, 9 wasted, for one
logical price). Fixed by persisting each leg's result onto the scan doc
(`ItemScanDoc.pricingResearchLegs`, a new optional field) as soon as it
succeeds, and skipping already-succeeded legs on a Cloud Tasks retry -
splits `researchPrice()` into `researchPricingLegs()` (skippable, never
throws) + `synthesizePricing()` (unchanged, still all-or-nothing). Cleared
on a fresh manually-triggered `priceItemScan` request (not just a Cloud
Tasks retry of the same attempt), since a stale multi-day-old partial
result shouldn't silently answer a brand-new pricing request. (c) Bump
`priceItemScanWorker.ts` to an explicit `memory: '512MiB'`, matching
sibling workers' established precedent after past OOM incidents - it's the
heaviest, longest-running (300s), most Gemini-call-dense worker and
currently defaults to the platform floor (256MiB).

_Out of scope, explicitly deferred:_ wiring `incrementUsage()` and a
free-tier usage cap (`PALLETIQ-046`); switching the Gemini model
(`PALLETIQ-047`); enabling GCP's billing export/budget alert (the owner's
own Console action, not code); a per-import SKU research cap for lot
scoring (`PALLETIQ-042`, not built yet); investigating prompt caching
(explicitly flagged "not scheduled" in the cost-audit report, pending real
prompt-size data this ticket's own logging will surface).

_Firestore/RBAC impact:_ `ItemScanDoc` (`tenants/{tenantId}/item_scans`)
gains one new optional field, `pricingResearchLegs` - no new collection, no
rules change (existing `isTenantMember` read / `isOwnerOrBuyer` write on
`item_scans` already covers it).

_UI pattern notes:_ none - no UI surface changes; `pricingResearchLegs` is
never rendered, internal bookkeeping only.

_ADR:_ not needed - a bug fix + observability addition using the existing
Cloud Tasks retry/cache-first pricing shape unchanged, not a new
architectural decision.
