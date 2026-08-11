# Backlog

Ticket IDs are `PALLETIQ-NNN`, allocated sequentially, never reused. Status
follows the 3-phase gate model in [`docs/GOVERNANCE.md`](./GOVERNANCE.md):
Planned → In Progress → Done. Priority is P0 (blocking) / P1 / P2.

| ID           | Title                                                                          | Persona     | Phase | Status      | Priority |
| ------------ | ------------------------------------------------------------------------------ | ----------- | ----- | ----------- | -------- |
| PALLETIQ-001 | Multi-tenant Firestore schema + security rules (with automated rules tests)    | Owner/Admin | 0     | Done        | P0       |
| PALLETIQ-002 | Auth custom claims (`tenantId`, `role`) + RBAC scaffolding                     | Owner/Admin | 0     | Done        | P0       |
| PALLETIQ-003 | Stripe billing integration (Free/Pro tiers, usage metering hooks)              | Owner/Admin | 0     | In Progress | P2       |
| PALLETIQ-004 | Secret Manager wiring for third-party credentials                              | Owner/Admin | 0     | Planned     | P1       |
| PALLETIQ-005 | Async AI task pipeline scaffolding (Cloud Tasks/Pub-Sub)                       | Buyer       | 0     | Done        | P0       |
| PALLETIQ-006 | Authentication + tenant onboarding flow (incl. empty-state UX)                 | Owner/Admin | 1     | Done        | P0       |
| PALLETIQ-007 | Vendor management for 2–3 vendors, 1–2 manifest formats (CSV + XLSX)           | Buyer       | 1     | Done        | P0       |
| PALLETIQ-008 | Manifest import → data normalization → common product schema                   | Buyer       | 1     | Done        | P0       |
| PALLETIQ-009 | Landed cost calculator (purchase price + freight/fees)                         | Buyer       | 1     | Done        | P1       |
| PALLETIQ-010 | Basic dashboard (today's opportunities, recent imports, inventory totals)      | Buyer       | 1     | Done        | P1       |
| PALLETIQ-011 | Basic inventory lifecycle tracking (Purchased → Received → Listed → Sold)      | Warehouse   | 1     | Done        | P1       |
| PALLETIQ-012 | Manifest upload security hardening (size limits, sandboxed parsing, no macros) | Buyer       | 1     | Done        | P0       |
| PALLETIQ-013 | Provision Firebase project + wire real project ID into repo config             | Owner/Admin | 0     | Done        | P0       |
| PALLETIQ-014 | Cloud Functions package scaffold (functions/, deploy target, CI job)           | Owner/Admin | 0     | Done        | P1       |
| PALLETIQ-015 | CI/CD deploy workflow for Firebase Hosting on merge to main                    | Owner/Admin | 0     | Done        | P1       |
| PALLETIQ-016 | Wire design system into Tailwind v4 tokens, fonts, and icon library            | Owner/Admin | 0     | Done        | P1       |
| PALLETIQ-017 | Replace favicon/icon assets with brand-correct marks (Check IV gap)            | Owner/Admin | 0     | Planned     | P2       |
| PALLETIQ-018 | Provision Cloud Storage bucket + wire storage.rules into repo config           | Owner/Admin | 0     | Done        | P1       |

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
