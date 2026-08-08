# Backlog

Ticket IDs are `PALLETIQ-NNN`, allocated sequentially, never reused. Status
follows the 3-phase gate model in [`docs/GOVERNANCE.md`](./GOVERNANCE.md):
Planned → In Progress → Done. Priority is P0 (blocking) / P1 / P2.

| ID           | Title                                                                          | Persona     | Phase | Status  | Priority |
| ------------ | ------------------------------------------------------------------------------ | ----------- | ----- | ------- | -------- |
| PALLETIQ-001 | Multi-tenant Firestore schema + security rules (with automated rules tests)    | Owner/Admin | 0     | Done    | P0       |
| PALLETIQ-002 | Auth custom claims (`tenantId`, `role`) + RBAC scaffolding                     | Owner/Admin | 0     | Done    | P0       |
| PALLETIQ-003 | Stripe billing integration (Free/Pro tiers, usage metering hooks)              | Owner/Admin | 0     | Planned | P0       |
| PALLETIQ-004 | Secret Manager wiring for third-party credentials                              | Owner/Admin | 0     | Planned | P1       |
| PALLETIQ-005 | Async AI task pipeline scaffolding (Cloud Tasks/Pub-Sub)                       | Buyer       | 0     | Planned | P0       |
| PALLETIQ-006 | Authentication + tenant onboarding flow (incl. empty-state UX)                 | Owner/Admin | 1     | Planned | P0       |
| PALLETIQ-007 | Vendor management for 2–3 vendors, 1–2 manifest formats (CSV + XLSX)           | Buyer       | 1     | Planned | P0       |
| PALLETIQ-008 | Manifest import → data normalization → common product schema                   | Buyer       | 1     | Planned | P0       |
| PALLETIQ-009 | Landed cost calculator (purchase price + freight/fees)                         | Buyer       | 1     | Planned | P1       |
| PALLETIQ-010 | Basic dashboard (today's opportunities, recent imports, inventory totals)      | Buyer       | 1     | Planned | P1       |
| PALLETIQ-011 | Basic inventory lifecycle tracking (Purchased → Received → Listed → Sold)      | Warehouse   | 1     | Planned | P1       |
| PALLETIQ-012 | Manifest upload security hardening (size limits, sandboxed parsing, no macros) | Buyer       | 1     | Planned | P0       |
| PALLETIQ-013 | Provision Firebase project + wire real project ID into repo config             | Owner/Admin | 0     | Done    | P0       |
| PALLETIQ-014 | Cloud Functions package scaffold (functions/, deploy target, CI job)           | Owner/Admin | 0     | Done    | P1       |
| PALLETIQ-015 | CI/CD deploy workflow for Firebase Hosting on merge to main                    | Owner/Admin | 0     | Done    | P1       |
| PALLETIQ-016 | Wire design system into Tailwind v4 tokens, fonts, and icon library            | Owner/Admin | 0     | Planned | P1       |
| PALLETIQ-017 | Replace favicon/icon assets with brand-correct marks (Check IV gap)            | Owner/Admin | 0     | Planned | P2       |
| PALLETIQ-018 | Provision Cloud Storage bucket + wire storage.rules into repo config           | Owner/Admin | 0     | Done    | P1       |

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

_Note on `PALLETIQ-006` (2026-08-08): when this ticket starts (first real
multi-page auth/onboarding flow), that's the trigger to reconsider Playwright —
deferred until now because there was nothing E2E-worthy to test. See the
testing/security review in this cycle's drift notes for the full reasoning._

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
