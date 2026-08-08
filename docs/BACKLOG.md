# Backlog

Ticket IDs are `PALLETIQ-NNN`, allocated sequentially, never reused. Status
follows the 3-phase gate model in [`docs/GOVERNANCE.md`](./GOVERNANCE.md):
Planned → In Progress → Done. Priority is P0 (blocking) / P1 / P2.

| ID           | Title                                                                          | Persona     | Phase | Status      | Priority |
| ------------ | ------------------------------------------------------------------------------ | ----------- | ----- | ----------- | -------- |
| PALLETIQ-001 | Multi-tenant Firestore schema + security rules (with automated rules tests)    | Owner/Admin | 0     | In Progress | P0       |
| PALLETIQ-002 | Auth custom claims (`tenantId`, `role`) + RBAC scaffolding                     | Owner/Admin | 0     | Planned     | P0       |
| PALLETIQ-003 | Stripe billing integration (Free/Pro tiers, usage metering hooks)              | Owner/Admin | 0     | Planned     | P0       |
| PALLETIQ-004 | Secret Manager wiring for third-party credentials                              | Owner/Admin | 0     | Planned     | P1       |
| PALLETIQ-005 | Async AI task pipeline scaffolding (Cloud Tasks/Pub-Sub)                       | Buyer       | 0     | Planned     | P0       |
| PALLETIQ-006 | Authentication + tenant onboarding flow (incl. empty-state UX)                 | Owner/Admin | 1     | Planned     | P0       |
| PALLETIQ-007 | Vendor management for 2–3 vendors, 1–2 manifest formats (CSV + XLSX)           | Buyer       | 1     | Planned     | P0       |
| PALLETIQ-008 | Manifest import → data normalization → common product schema                   | Buyer       | 1     | Planned     | P0       |
| PALLETIQ-009 | Landed cost calculator (purchase price + freight/fees)                         | Buyer       | 1     | Planned     | P1       |
| PALLETIQ-010 | Basic dashboard (today's opportunities, recent imports, inventory totals)      | Buyer       | 1     | Planned     | P1       |
| PALLETIQ-011 | Basic inventory lifecycle tracking (Purchased → Received → Listed → Sold)      | Warehouse   | 1     | Planned     | P1       |
| PALLETIQ-012 | Manifest upload security hardening (size limits, sandboxed parsing, no macros) | Buyer       | 1     | Planned     | P0       |
| PALLETIQ-013 | Provision Firebase project + wire real project ID into repo config             | Owner/Admin | 0     | Done        | P0       |
| PALLETIQ-014 | Cloud Functions package scaffold (functions/, deploy target, CI job)           | Owner/Admin | 0     | Planned     | P1       |
| PALLETIQ-015 | CI/CD deploy workflow for Firebase Hosting on merge to main                    | Owner/Admin | 0     | Done        | P1       |
| PALLETIQ-016 | Wire design system into Tailwind v4 tokens, fonts, and icon library            | Owner/Admin | 0     | Planned     | P1       |
| PALLETIQ-017 | Replace favicon/icon assets with brand-correct marks (Check IV gap)            | Owner/Admin | 0     | Planned     | P2       |
| PALLETIQ-018 | Provision Cloud Storage bucket + wire storage.rules into repo config           | Owner/Admin | 0     | Done        | P1       |

## Adding a ticket

New tickets go through the Planning gate first (see `docs/GOVERNANCE.md`)
before landing here with a Phase and Priority assigned.

_Note on `PALLETIQ-001` (2026-08-08): the schema/rules scaffold itself already
shipped (`firestore.rules` has all 22 tenant-scoped collections defined). What's
actually outstanding, and what "In Progress" now tracks, is the rules-test-
coverage gap: `firestore.rules.test.ts` has 6 tests, not one
`assertSucceeds`/`assertFails` pair per collection. A parallel gap exists for
`storage.rules`, which has zero automated tests — fold that into this same
ticket rather than opening a separate one, since it's the same kind of work
against a sibling rules file._

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

_ADR needed:_ yes, before implementation starts — how claims get set (trigger
vs. callable function), the bootstrap-vs-invite distinction, and invite-flow
security (only Owner can assign roles) are real architectural decisions with
alternatives and consequences; a flawed claim-setting mechanism is a
privilege-escalation risk. Not written in this session — write via `new-adr`
when the dedicated implementation planning pass for this ticket begins.

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
