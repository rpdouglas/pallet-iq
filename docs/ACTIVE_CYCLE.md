# Active Cycle

Template — fill in at the start of each cycle. Sits alongside
`docs/BACKLOG.md` (ticket detail) and `docs/ROADMAP.md` (phase-level
status). See `docs/GOVERNANCE.md` for the 3-phase gate model this cycle is
run against.

## Cycle goal

Get a real Firebase project provisioned and wired into the repo so Phase 0
tickets (PALLETIQ-002–005) have somewhere to actually deploy against. **Met**
as of this update — see PALLETIQ-013 below. Follow-on Phase 0 tickets can now
proceed against the real `mrt-pallet-iq` project instead of a placeholder.

## Completed this cycle (process/tooling, not persona-facing)

Not ticketed through the Planning gate — this was governance/tooling setup for
the process itself, not product-scoped work. Logged here per Check
"practice-what-we-preach" rather than left with no paper trail:

- **PR #2** — `.claude/hooks/git-branch-guard.py` + `CONTRIBUTING.md`/`GOVERNANCE.md`/
  `CLAUDE.md` updates enforcing feature-branch + PR workflow (no direct commits to
  `main`).
- **PR #3** — Reviewed `docs/design/Pallet-IQ-Design-System.md`, fixed two spec
  defects (WCAG contrast failure, unlicensed font), added 4 pattern addenda, and
  formalized adherence as governance **Check IV** (ADR-0002,
  `design-system-auditor` subagent). Opened `PALLETIQ-016` for the follow-up
  Tailwind-token/font/icon implementation (not started).
- **PR #4** — Post-merge audit: deleted 3 stale merged branches, broadened
  Check IV's audit surface (`design-system-auditor` + `pre-pr-check`) to cover
  `public/` and `index.html` (not just `src/`), fixed the placeholder
  `<title>`, opened `PALLETIQ-017` for the favicon/icon brand-asset gap.
- **PR #24** — Fixed a real process bug surfaced by closing `PALLETIQ-001`:
  `pre-pr-check` offered to push/open the PR with no mention of `close-ticket`,
  so the natural sequence was pre-pr-check → push → merge → close-ticket —
  which always hits `close-ticket` step 8's "already merged" fallback and costs
  a second, bookkeeping-only PR (that's exactly what happened closing
  `PALLETIQ-001`: PR #22 implementation, then a separate PR #23 just for the
  `BACKLOG.md`/`ACTIVE_CYCLE.md` updates). `pre-pr-check` step 10 now hands off
  to `close-ticket` before pushing when the change closes a ticket, so its doc
  commits land in the same PR as the implementation — the fallback path stays
  available for tickets closed outside this sequence, but is no longer the
  path every closed ticket took by default. `CLAUDE.md`'s skill list and
  `close-ticket`'s own opening section updated to state the ordering
  explicitly.

## Tickets in flight

None currently in flight. `PALLETIQ-003` is shelved, not active — see below.

## Shelved, not a near-term blocker

- **`PALLETIQ-003` (2026-08-10).** Stripe billing mechanism is implemented
  and unit-tested (`createCheckoutSession`, `stripeWebhook`,
  `incrementUsage`, Secret Manager wiring via `defineSecret`, per
  ADR-0005), merged to `main`. Live verification (a real Stripe test-mode
  account, a Pro Price, the two Secret Manager secrets, and the
  `STRIPE_PRO_PRICE_ID` param) was deferred pending the owner's
  credentials — the owner has since said they don't plan to pick this back
  up for a long time, so this is an intentional, indefinite hold, not an
  active thing to chase or remind about. Priority dropped `P0` → `P2` in
  `docs/BACKLOG.md` accordingly. Ticket stays `In Progress`, not `Done`
  — Phase 0's QA criterion ("a test Stripe subscription can be created,
  upgraded, and canceled end-to-end") isn't met and won't be until this
  resumes. Phase 0 can't fully complete while this sits open; that's
  accepted, not a bug. Resume via the checklist in this session's
  transcript (Stripe Dashboard setup → `firebase functions:secrets:set` →
  deploy → live exercise) whenever the owner returns to it — don't
  re-derive it from scratch.

## Blockers

None currently open. `PALLETIQ-013`'s Firebase-project blocker, the Auth/
Storage initialization gaps, and GitHub branch protection on `main` (was
undocumented via API for several review passes) are all resolved as of this
update — see Drift notes for the first three; branch protection was applied
directly via the GitHub UI and reconfirmed live (`protected: true`) via the
API.

**Note for `PALLETIQ-002`:** Auth is enabled with Email/Password only. If a
second sign-in method (e.g. Google) turns out to be needed, that's additional
console configuration, not something this repo's automation can add.

## Drift notes

_Recorded at ticket close per the governance model: where implementation
diverged from the plan, and why. Feed anything with lasting scope impact
back into `docs/BACKLOG.md` or `docs/ROADMAP.md`._

- **2026-08-07** — Process/tooling work (PRs #2, #3 above) went straight to PR
  without going through `open-ticket`'s Planning gate first, since it was
  governance/meta work rather than a product-scoped ticket. Going forward,
  meta-governance changes should still get a lightweight `docs/ACTIVE_CYCLE.md`
  note like this one even when a full ticket feels like overhead, so the record
  stays honest.

- **2026-08-08 — PALLETIQ-013 closed.** Planned scope was "provision a Firebase
  project + wire the real project ID into repo config." Shipped: the project
  (`mrt-pallet-iq`) already existed with a registered web app, native
  Firestore database (`northamerica-northeast1`), and a Hosting site — none of
  that had to be created this session, just discovered and wired in
  (`.firebaserc` updated from the `pallet-iq` placeholder; `.env` populated
  from the real web SDK config, gitignored so it never lands in git).
  **Drift beyond planned scope:** the live Firestore rules were still the
  locked-mode default (`allow read, write: if false` for everything) —
  deployed the repo's actual tenant-isolation `firestore.rules` to production
  and verified via the Firebase Rules API that the live ruleset now matches
  the repo. **Drift discovered, not fixed here:** Authentication and Storage
  were never initialized on the project at all (see Blockers above) — Storage
  folded forward into `PALLETIQ-018`; Auth enablement doesn't get its own
  ticket since it's an implicit prerequisite already inside `PALLETIQ-002`'s
  scope, just called out here so it isn't a silent surprise when that ticket
  starts.

- **2026-08-08 — PALLETIQ-018 closed.** Planned scope was "provision a Cloud
  Storage bucket + wire `storage.rules` into repo config." Owner manually
  completed the console-side bucket creation (Storage → Get Started) between
  the two tickets. **Drift from the recorded location decision:** Storage was
  created in `US-EAST1`, not `northamerica-northeast1` (Firestore's region) —
  `northamerica-northeast1` wasn't available on the free Spark plan's default-
  bucket location list. Firestore and Storage are now in different regions;
  not a correctness problem, just a latency tradeoff accepted to stay on the
  free tier at this stage. Revisit if/when the project moves to Blaze and
  region co-location becomes worth a bucket migration.
  Shipped: `storage.rules` (new) applying the same `tenants/{tenantId}/...` +
  deny-by-default pattern as `firestore.rules`, wired into `firebase.json`
  (deploy target + emulator port), deployed to production, and verified via
  the Firebase Rules API that the live ruleset matches the repo — replacing
  the console's locked-mode default (`allow read, write: if false`).
  **Known gap, not fixed here:** no automated rules-test suite for
  `storage.rules` yet (unlike `firestore.rules.test.ts` for Check I) — noted
  in the rules file itself. Add test coverage alongside `PALLETIQ-008`/`012`
  (the tickets that will actually exercise uploads), or consider formalizing
  a storage-rules parity check later if this becomes a recurring gap.

- **2026-08-08 — Testing & security review.** Full pass across dependencies
  (`npm audit`: 5 moderate, all transitive through the `firebase-tools`
  devDependency, low real risk), GitHub repo hygiene, CI hardening, and
  Firebase Auth configuration. Verified clean: no secrets ever committed
  (checked full git history), no public IAM grants on the Storage bucket,
  both rules files deny-by-default with live tenant isolation.
  **Shipped:** `.github/dependabot.yml`, `permissions: contents: read` +
  `npm audit --audit-level=high` in `ci.yml`, `CODEOWNERS`, `SECURITY.md`.
  Deployed a real Firebase Auth password policy (was the 6-char/no-complexity
  default) — `minPasswordLength: 10`, requires lowercase + uppercase +
  numeric, `ENFORCE`; verified live via a fresh GET against the Identity
  Platform config API, not just the PATCH response. **Rescoped, not fixed
  here:** `PALLETIQ-001` reopened to close the rules-test-coverage gap (see
  Tickets in flight). **Explicitly deferred, logged not silently dropped:**
  Playwright/E2E (no multi-page flow exists yet to test — revisit when
  `PALLETIQ-006` starts, see its `BACKLOG.md` note), Firebase App Check, and
  Hosting security headers (both real design decisions, need their own
  tickets once there's a live page/API surface to actually protect).
  **Still can't be done from this session** (same token-scope limitation as
  branch protection): confirming/enabling GitHub Dependabot alerts and secret
  scanning in Settings → Code security.

- **2026-08-08 — PALLETIQ-015 closed.** Shipped exactly to the scope note in
  `docs/BACKLOG.md` — no real drift. `deploy-hosting` CI job, gated on both
  existing checks passing, push-to-`main`-only, via a service account scoped
  to only `roles/firebasehosting.admin` on `mrt-pallet-iq`. **Verified live,
  not just assumed from a green CI run:** `curl -I
https://mrt-pallet-iq.web.app` returned `200` with a `last-modified`
  timestamp matching the merge, and the owner independently confirmed the
  site loads correctly. **Known gap, not fixed here:** verification was a
  manual live check, not an automated post-deploy smoke test — nothing in CI
  itself asserts the deployed site actually serves correctly beyond the
  deploy action's own exit code. Worth a lightweight smoke-test step
  (`curl`/status-code check against the Hosting URL) if deploy failures ever
  need to be caught faster than "someone notices the site is down."

- **2026-08-08 — PALLETIQ-014 closed (belatedly).** Implementation and its PR
  merged earlier this cycle, but the `docs/BACKLOG.md` status flip and this
  note were missed at the time — caught while closing `PALLETIQ-002`, which
  depended on it. No scope drift in the original implementation itself
  (`functions/` package, deploy target, CI job, all per its scope note); the
  drift is procedural — a reminder that "PR merged" and "ticket closed" are
  different steps and skipping the second one leaves the backlog lying about
  what's actually done.

- **2026-08-08 — PALLETIQ-002 closed.** Shipped per its scope note and
  ADR-0003: 4 HTTPS Callables (`createTenant`, `inviteMember`, `acceptInvite`,
  `updateMemberRole`) in `functions/src/auth/`, the `users/{userId}`
  tightening + new `tenants/{tenantId}/invites/{inviteId}` collection in
  `firestore.rules` (both with `firestore.rules.test.ts` coverage, 13/13
  tests passing against a real emulator run — Java 21 wasn't available in
  this Codespace by default, downloaded a Temurin 21 tarball directly rather
  than skip verification), and client-side RBAC scaffolding
  (`AuthProvider`/`useAuth`/`RequireRole` in `src/lib/auth/`, wired into
  `src/main.tsx`).
  **Drift beyond planned scope:**
  - Added 24 unit tests for the 4 callables' authorization/validation logic
    (mocked Admin SDK, no emulator needed) and 8 for the client-side pieces —
    not explicitly required by the scope note, but the ADR's own Consequences
    section flagged "build, test, and eventually secure-review" for
    privilege-escalation-risk code, so this was treated as required, not
    optional.
  - Building those tests surfaced a real gap: `request.data` in all 4
    callables was typed as if the client-supplied payload were trustworthy
    (e.g. `tenantName: string`), when it's untrusted input that could be
    anything at runtime. Retyped as `unknown` with explicit runtime guards
    throughout — a genuine correctness fix, not just a lint satisfaction.
  - `functions/` needed its own `vitest.config.mts` and a second,
    lint-only `tsconfig.eslint.json` (test files excluded from the
    production `tsconfig.json`/build, but still type-aware-linted) —
    retroactively extends `PALLETIQ-014`'s scaffold, which didn't anticipate
    a test runner.
  - The `users/{userId}` rule tightening flagged in ADR-0003 shipped here
    (not folded into `PALLETIQ-001`) — the ADR left that an open decision;
    implementation-time call was to keep it with the ticket that actually
    depends on it.
    **Known gap, not fixed here:** `PALLETIQ-006`'s onboarding UI (and any
    later invite-teammate UI) is the first real caller of `createTenant`/
    `acceptInvite`/`inviteMember` — nothing has exercised these against a live
    Auth-emulator-backed integration test yet, only unit tests against mocked
    Admin SDK calls. Worth an integration-test pass once real UI exists to
    drive it.

- **2026-08-08 — PALLETIQ-001 closed.** Planned scope (per the `BACKLOG.md`
  rescoping note): close the rules-test-coverage gap for both
  `firestore.rules.test.ts` (13 tests covering 5 of 23 tenant/role-scoped
  collection blocks) and `storage.rules.test.ts` (zero tests). Shipped exactly
  that — `firestore.rules.test.ts` now has 81 tests covering all 23
  collections (one `assertSucceeds`/`assertFails` pair minimum per collection,
  `describe.each`-parameterized for the ~10 collections sharing a "tenant
  member read, owner/manager write" RBAC shape so the pattern doesn't drift
  out of sync as collections are added); `storage.rules.test.ts` is new, 5
  tests proving tenant isolation, deny-unauthenticated, and deny-outside-
  `tenants/`-prefix. No changes to `firestore.rules` or `storage.rules`
  themselves — test coverage only, as scoped. `firestore-rules-auditor`
  reviewed before merge.
  **Drift beyond planned scope:** the `firestore-rules-auditor` review caught
  that `vendors` and `inventory` — the two collections with pre-existing
  tests from before this ticket — only had the original cross-tenant
  read/write denial tests, not the full 4-case matrix (member read,
  cross-tenant deny, manager write allow, buyer write deny) the newly-written
  collections got. Folded both into the same `describe.each` group rather
  than leaving them at a lower coverage standard than everything else.
  **Drift discovered mid-implementation:** `storage.rules.test.ts` initially
  failed every `uploadBytes`-based test with a generic `storage/unknown`
  error under `firebase emulators:exec`, even with correct rules and a
  correctly-running emulator (isolated via a standalone repro script that
  connects to the same emulator and succeeds). Root cause: the project's
  default Vitest environment is `jsdom` (`vite.config.ts`, needed for
  React component tests), and jsdom's XHR/fetch shim silently breaks
  Storage's binary upload handling — Firestore's rules tests are unaffected
  since they don't do binary uploads. Fixed with a per-file
  `// @vitest-environment node` pragma on `storage.rules.test.ts`, not a
  project-wide config change. Worth remembering if any other Storage-touching
  test is added later.

- **2026-08-10 — PALLETIQ-005 closed.** Planned scope per the `BACKLOG.md`
  scope note and ADR-0004: an `enqueueDummyTask` HTTPS Callable creating a
  `tenants/{tenantId}/ai_tasks/{taskId}` doc and enqueueing a Cloud Tasks task;
  a `processDummyTask` worker, OIDC-authenticated via Cloud Tasks, that
  processes it and writes the result back; `ai_tasks`'s `firestore.rules`
  block + `firestore.rules.test.ts` coverage (Check I); provisioning the real
  Cloud Tasks queue in `mrt-pallet-iq`. Shipped exactly that — 84/84 rules
  tests passing (3 new for `ai_tasks`), 6 new unit tests for the two
  functions (mocked Admin SDK/Cloud Tasks client), `firestore-rules-auditor`
  clean.
  **Drift — simplifies the ADR, doesn't change its decision:** ADR-0004
  assumed a manually-configured `@google-cloud/tasks` client, manual OIDC
  token handling, and a manual `gcloud tasks queues create` provisioning
  step. Implementation instead used Firebase's native
  `onTaskDispatched`/`getFunctions().taskQueue().enqueue()` integration
  (`firebase-functions/v2/providers/tasks`), which auto-provisions the queue
  on `firebase deploy` and handles OIDC auth internally — no manual queue
  setup or token plumbing needed. Cloud Tasks over Pub/Sub and the new
  `ai_tasks` collection shape are unchanged; the ADR itself wasn't reopened
  since its Decision/Alternatives are still accurate, only its assumed
  implementation mechanics were an overestimate of the manual work involved.
  **Known verification gap closed, not just accepted:** the scope note
  flagged upfront that the Cloud Tasks emulator doesn't exist, so the
  round-trip could only be proven live. Deployed all 6 functions (4 existing
  - `enqueueDummyTask`/`processDummyTask`) to `mrt-pallet-iq` for the first
    time (previously zero functions were deployed) and drove a real request
    through the live queue: created a test Firebase Auth user with
    `{tenantId, role: buyer}` custom claims, signed in for a real ID token,
    called `enqueueDummyTask` over HTTPS, and polled the resulting Firestore
    doc — observed `queued` → `completed` in ~4 seconds, `result: {echo: true}`
    as expected. Test user and task doc deleted afterward.
    **Drift in verification method:** this session's sandbox has no Google
    Application Default Credentials, and `firebase login`'s CLI OAuth session
    doesn't double as ADC for `firebase-admin` Node scripts. Rather than
    installing `gcloud` for a second interactive login, reused the already-
    authenticated `firebase login` refresh token (read from
    `~/.config/configstore/firebase-tools.json`) via `firebase-tools`' own
    internal `getAccessToken()` to mint a cloud-platform-scoped access token,
    used as an ad-hoc Admin SDK credential for Auth calls and raw Firestore
    REST calls (the Admin SDK's native gRPC Firestore client only accepts a
    `ServiceAccountCredential` or recognized ADC instance, not an arbitrary
    custom-credential object, so Firestore reads went through the REST API
    directly instead). One-off verification tooling only, not committed to the
    repo or intended as a durable pattern — a future session needing live
    Admin SDK access should still set up real ADC (`gcloud auth
application-default login`) rather than repeat this.
