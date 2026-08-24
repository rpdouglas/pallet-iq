# ADR-0017: Committed e2e tests run against the Firebase emulator suite, with an explicit Cloud Tasks coverage boundary

**Status:** Proposed
**Date:** 2026-08-24

## Context

Across many past tickets, Playwright has been used repeatedly for
verification, but only as a throwaway script — written fresh inside a
session, run once against **real production** (`mrt-pallet-iq`), then
deleted (`docs/ACTIVE_CYCLE.md`'s drift notes document this extensively,
`PALLETIQ-050` being the most recent instance). That pattern relies on a
fragile credential-minting technique to sign in as a real user: mint a
Google OAuth token from firebase-tools' stored session, mint a Firebase
custom token via `signJwt`, exchange it for an ID token. `signJwt` is now
hard-blocked by this session's safety classifier, so the pattern can't
reliably be repeated — the concrete forcing function for this decision.

A full Firebase emulator suite (auth/firestore/storage/functions/hosting)
is already defined in `firebase.json` and already proven credential-free in
CI (`test:rules`/`test:storage-rules`, run via `firebase emulators:exec`),
but has never been wired into app code (`src/lib/firebase.ts` has no
emulator-connection seam) or used for a full-app run.

Six Cloud-Tasks-dispatched workers (item-scan identify, pricing research,
listing-copy generation, manifest import processing, discovered-lot import,
the dummy AI task) exist in this codebase. The Firebase emulator suite has
no Cloud Tasks emulator — any flow whose completion depends on one of these
workers finishing cannot be driven to completion locally, regardless of how
the rest of this setup is built. This is a hard limit, not a configuration
gap to solve.

## Decision

A committed `e2e/` Playwright suite runs against the Firebase **emulator
suite**, started via `firebase emulators:exec --project demo-palletiq`
(a fake, offline-safe project id — never real `mrt-pallet-iq`). Test data
is seeded via the Admin SDK directly against the emulator (`e2e/support/`),
not by driving the signup UI — keeping "system under test" separate from
"test fixture setup," and letting most specs run without the functions
emulator even needing to be up.

Production code gets a minimal, environment-gated emulator-connection seam:
`src/lib/firebase.ts` calls `connectAuthEmulator`/`connectFirestoreEmulator`/
`connectStorageEmulator`/`connectFunctionsEmulator` only when
`import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'` — a `VITE_*` var
Vite inlines at build time, so Rollup dead-code-eliminates the whole branch
in a real production build where the var is unset. This var is never set in
`.env`, never in the `deploy-hosting` CI job's environment — only in the
Playwright `webServer`'s build step.

**Coverage boundary, stated explicitly:** this suite can exercise
auth/onboarding, RBAC route-guard redirects, and CRUD-ish pages that don't
depend on AI/worker completion (e.g. Discovered Lots list/dismiss, a direct
Firestore write). It **cannot** exercise any flow gated on one of the six
Cloud-Tasks workers above finishing — those stay explicitly out of scope for
this suite.

The existing manual live-verification-against-production pattern is **not
retired**. It remains the only way to verify the out-of-scope flows above
end-to-end, and continues to be used for that purpose (its own friction,
e.g. the `signJwt` blocker, is a separate, ongoing concern — not resolved by
this decision).

The new CI job (`e2e` in `.github/workflows/ci.yml`) starts **non-blocking**
(`continue-on-error: true`, not in `deploy-hosting`'s `needs:`, not added to
`CONTRIBUTING.md`'s required-checks list) — new integration surface (an
emulator seam in production code, a new seed helper, a new build/serve
wiring) with more failure modes than the already-battle-tested rules-test
jobs. Revisit to blocking once it's been green for a stretch.

## Alternatives considered

- **Keep doing ad hoc scripts every ticket.** The status quo, and exactly
  the pain point motivating this decision — no durable coverage, re-derived
  from scratch each time, and now partially blocked by the `signJwt`
  classifier restriction. Rejected.
- **Mock Firebase entirely** (e.g. a hand-rolled fake SDK or a library like
  `firebase-mock`) instead of a real emulator. Lower fidelity than the
  already-configured, already-CI-proven emulator suite — would mean
  maintaining a second, parallel understanding of Firestore/Auth semantics
  alongside the real rules/security model. Rejected.
- **e2e against a real dev/staging Firebase project** instead of the local
  emulator. Would sidestep the Cloud Tasks emulator gap (Cloud Tasks is a
  real GCP service, reachable from a real project), but reintroduces a
  real-credentials problem in CI and adds a second cloud project to
  provision and maintain. Rejected for now; worth revisiting if emulator
  fidelity (or the Cloud Tasks gap specifically) proves too limiting later.
- **Drive the UI signup flow for all seeding**, not just the one spec that
  tests it directly. Simpler mental model (one way to get a tenant), but
  makes every other spec's setup dependent on onboarding being bug-free,
  and is far slower (a full browser round-trip per test) than direct Admin
  SDK writes. Rejected in favor of Admin-SDK seeding, with the UI flow
  reserved for the one spec that exists to test it.

## Consequences

- New root `firebase-admin` devDependency (today only `functions/` has it).
- A new CI job with its own runtime cost (Playwright browser install +
  building the app + starting 4 emulator services), on top of the existing
  4 jobs.
- The Cloud Tasks coverage boundary means AI/worker-flow regressions
  (identify, pricing, listing copy, manifest/lot import) are **still only**
  caught by manual live verification — this ADR does not reduce reliance on
  that muscle-memory, and future tickets touching those workers should keep
  live-verifying them, not assume this suite has them covered.
- The emulator seam is new, permanent production-code surface
  (`src/lib/firebase.ts`, `src/lib/auth/tenantActions.ts`) that must stay
  provably dead in production builds — checked at ticket-close time via a
  build-output grep, not just trusted by inspection, and worth re-checking
  if either file changes again later.
- `functions/.secret.local` (gitignored, dummy values only) becomes a new,
  repo-documented mechanism for feeding `defineSecret` values to the
  functions emulator — future tickets adding a new `defineSecret` need to
  extend this file's dummy values too, or the `e2e` job's functions
  emulator will fail at cold start.
- Two parallel copies of "what does a new tenant look like" now exist —
  `functions/src/auth/createTenant.ts` (real) and `e2e/support/seed.ts`
  (test fixture) — with no shared code between them. A future change to
  `createTenant`'s doc shape needs a matching manual update to the seed
  helper, or specs relying on it silently seed stale-shaped data.
