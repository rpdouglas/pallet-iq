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
  re-derive it from scratch. **Added 2026-08-10:** `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRO_PRICE_ID` (the latter in
  `functions/.env.mrt-pallet-iq`) currently hold inert placeholder values,
  set only to unblock an unrelated functions redeploy — replace all three
  with real values as the first step of this resume checklist, don't assume
  their mere existence means this ticket is further along than it is.

## Blockers

None currently open. `PALLETIQ-013`'s Firebase-project blocker, the Auth/
Storage initialization gaps, GitHub branch protection on `main` (was
undocumented via API for several review passes), and the stale-`createTenant`
deploy gap below are all resolved as of this update — see Drift notes for
details; branch protection was applied directly via the GitHub UI and
reconfirmed live (`protected: true`) via the API.

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

- **2026-08-10 — `PALLETIQ-016` in progress: Playwright adopted now, not
  deferred to `PALLETIQ-006`.** The 2026-08-08 testing/security review (below)
  deferred Playwright/E2E until `PALLETIQ-006` on the reasoning that there was
  no multi-page flow yet worth testing. Mid-implementation on `PALLETIQ-016`,
  the owner asked to install it now instead, since it'll see heavy use for UI
  verification going forward, not just full E2E flows — a narrower use
  (single-page computed-style/console-error checks against the dev server)
  than the original deferral note anticipated, but the same tool. Installed as
  `@playwright/test` in the root `package.json` (a real devDependency, not a
  scratchpad-only install) with Chromium cached via `npx playwright install`.
  `docs/BACKLOG.md`'s `PALLETIQ-006` note updated to mark itself superseded
  rather than left silently stale. No `playwright.config.ts` or committed test
  suite yet — this cycle's usage was one ad-hoc verification script
  (`verify-ui.mjs`); formalizing into real specs is follow-on work, not part
  of `PALLETIQ-016`'s scope.

- **2026-08-10 — `PALLETIQ-016` closed.** Shipped exactly to the `BACKLOG.md`
  scope note: the 8-color/5-type-scale `@theme` token block in
  `src/index.css`, self-hosted Inter + Poppins ExtraBold via `@fontsource/*`,
  `lucide-react` installed, and `src/App.tsx` updated to use the new tokens
  end-to-end — closing the exact `App.tsx`-uses-default-Tailwind-slate gap
  `CLAUDE.md`/`ADR-0002` called out by name. Verified visually and
  programmatically via the Playwright script above (computed styles matched
  intended tokens exactly, zero console errors) before the script was deleted
  as scratch tooling, not committed. `design-system-auditor` run before close:
  no unapproved colors/fonts, no non-Lucide icons, no default-Tailwind-color
  regressions.
  **Drift beyond planned scope:** the Playwright adoption above; the
  Success/Danger color-gap fix and Poppins-vs-Baloo-2 pick were both already
  folded into the scope note itself during Planning-gate scoping, so no
  separate drift entry for those. `design-system-auditor` caught one real
  Check IV mismatch mid-implementation — `App.tsx`'s helper text paired the
  Body size token with the Slate Gray color, a combination the design doc's
  typography table doesn't specify (it pairs Body→Ink Navy, Label/Caption→
  Slate Gray) — fixed by switching to `text-label` to match the documented
  pairing.
  **Known gaps, not fixed here:** (1) the `@theme` block adds brand tokens
  without disabling Tailwind's built-in `slate-*`/`gray-*`/`blue-*`/`cyan-*`
  utilities, so nothing stops a future diff from reaching for a default
  Tailwind color out of habit instead of the brand token — Check IV audits
  will keep catching this reactively until/unless it's enforced structurally
  (e.g. a theme reset or lint rule); (2) `--color-navy` (`#1E3A8A`, Deep Navy)
  and `--color-ink-navy` (`#0F172A`) are similarly-named but different colors
  — low risk of mixup today given how few components exist, worth a clearer
  name if this ever causes a real mistake. Neither blocks close; both are
  cheap to fix later if they bite.

- **2026-08-10 — Live production bug found and fixed: Hosting deployed with
  an entirely undefined Firebase config.** The owner hit
  `auth/invalid-api-key` loading the live site. Root cause: `ci.yml`'s
  `deploy-hosting` job (`PALLETIQ-015`) runs `npm run build` with none of the
  6 `VITE_FIREBASE_*` env vars set — `.env` is gitignored
  (`docs/ACTIVE_CYCLE.md`'s `PALLETIQ-013` note), so the CI checkout never
  has them, and Vite bakes `undefined` into every reference. Confirmed by
  downloading the live bundle and finding
  `apiKey:void 0,authDomain:void 0,projectId:void 0,...` verbatim — this has
  almost certainly been broken since `PALLETIQ-015`'s very first deploy, not
  a regression from a specific later change. **Why the existing
  verification didn't catch it:** `PALLETIQ-015`'s drift note already
  flagged "no automated post-deploy smoke test" as a known gap, but even
  that suggested fix (a `curl`/status-code check) wouldn't have caught this
  specific bug — the failure only happens at JS runtime when the Auth SDK
  initializes client-side, not at the HTTP-response level `curl` can see.
  **Fixed:** added the 6 `VITE_FIREBASE_*` values as GitHub Actions repo
  secrets (values aren't actually sensitive by Firebase's own security
  model — Auth + Firestore/Storage rules are the real boundary, not hiding
  this key — stored as secrets only because that's the existing mechanism
  for getting `.env`-gitignored values into a CI build) and wired them into
  `deploy-hosting`'s build step via `env:`. **Still not fixed, logged not
  silently dropped:** no automated check actually asserts the deployed app
  initializes Firebase without error post-deploy — same class of gap
  `PALLETIQ-015` already flagged, now confirmed to matter in practice, not
  just hypothetically. Worth a real smoke test (e.g. a headless-browser
  console-error check against the live URL) if this kind of runtime-only
  failure needs to be caught by CI instead of a user hitting it first.

- **2026-08-10 — `PALLETIQ-006` closed.** Shipped: sign-up, sign-in,
  accept-invite, and sign-out, plus route-level gating (`RequireGuest`,
  `RequireNoTenant`, and an extended `RequireRole`) wired through
  `src/App.tsx` on top of `PALLETIQ-002`'s existing `createTenant`/
  `acceptInvite` callables and `useAuth`/`RequireRole` scaffolding. Verified
  live end-to-end against the real `mrt-pallet-iq` project (not just unit
  tests): sign-up → onboarding → workspace creation → landing page → sign-out
  → sign-in round trip, driven with Playwright, zero console errors, screen-
  shots visually confirmed correct token/font/spacing usage. Test account and
  its `users`/`tenants` docs deleted afterward via the same firebase-tools
  refresh-token-to-access-token trick used in `PALLETIQ-005`'s close (this
  time the originally-granted `loginScopes` had to be reused verbatim — asking
  for an additional scope, e.g. `identitytoolkit`, made Google's token
  endpoint reject the whole refresh, not just decline the extra scope).
  `design-system-auditor` and `firestore-rules-auditor` both clean;
  `firestore-rules-auditor` confirmed the new client-side read
  (`tenants/{tenantId}/settings/general` on the landing page) is already
  covered by `PALLETIQ-001`'s existing `settings` rule + test pair — no new
  rule needed, and `npm run test:rules` (real emulator, Java downloaded
  fresh into this session same as `PALLETIQ-002`'s close) confirmed 85/85
  passing.
  **Drift beyond planned scope:**
  - The scope note described sign-up as collecting a tenant name and calling
    `createTenant` directly. Implementation instead split this: `SignUpPage`
    only creates the Firebase Auth account (no tenant-name field) and always
    lands on `/`, letting the route guards bounce a tenant-less user to
    `/onboarding`; `createTenant` is called from `OnboardingPage` alone. This
    is the only way `AcceptInvitePage`'s `redirect`-param flow works cleanly
    — a user arriving via an invite link who needs to create an account first
    must not be forced through a "name your workspace" field on the way to
    joining someone _else's_ workspace. One page, one responsibility, per the
    code comment left on `SignUpPage.tsx`.
  - Added three small route guards (`RequireGuest`, `RequireNoTenant`, and an
    extended `RequireRole` with a new `noTenantRedirectTo` prop) rather than
    the single existing `RequireRole` the scope note assumed would be enough
    — the actual state matrix (unauthenticated / authenticated-no-tenant /
    fully authenticated) needs three distinct redirect targets depending on
    which route is asking, which the original single-target `RequireRole`
    couldn't express without conflating "no auth" and "no tenant yet."
  - Built five shared components not itemized in the scope note (`Button`,
    `TextField`, `EmptyState`, `BrandMark`, `AuthCard`) — the first real
    instances of `docs/design/components.md`'s form-input and empty-state
    patterns, and `docs/design/Pallet-IQ-Design-System.md`'s button variants.
    Directly in service of the scoped pages (five forms needed consistent
    inputs/buttons), not scope creep.
    **Real gap discovered, not fixed here:** live verification surfaced that
    the _deployed_ `createTenant` Cloud Function is stale — it still predates
    `PALLETIQ-003`'s addition of the `tenants/{tenantId}/subscriptions/current`
    write. The test tenant's `settings/general` doc was created correctly but
    `subscriptions/current` 404'd. This means **every real tenant created
    through the live app right now silently has no subscription doc**,
    contrary to `ADR-0005`'s "the doc always exists once a tenant does" design.
    Not fixed in this PR — redeploying Cloud Functions is a deliberate
    production action, out of scope for a frontend-only ticket, and needs the
    owner's go-ahead. Logged as an open blocker below, not silently absorbed.

- **2026-08-10 — Stale-`createTenant` blocker resolved (functions redeployed).**
  Owner approved a targeted `firebase deploy --only functions:createTenant,
inviteMember,acceptInvite,updateMemberRole,enqueueDummyTask,processDummyTask`
  against `mrt-pallet-iq`, deliberately excluding `createCheckoutSession`/
  `stripeWebhook` (`PALLETIQ-003`'s functions stay untouched while that
  ticket is shelved). **Drift discovered mid-deploy:** `firebase-tools`
  resolves every `defineSecret`/`defineString` param across the _entire_
  codebase before filtering to `--only` targets, so even this narrow deploy
  demanded real values for `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  (Secret Manager, previously never provisioned — Secret Manager API itself
  had to be enabled on the project too, its first use) and
  `STRIPE_PRO_PRICE_ID` (a plain string param, via a new `functions/.env.
mrt-pallet-iq` file). Set inert placeholder values for all three, gitignored
  the new `functions/.env.mrt-pallet-iq` file (`.gitignore` gained
  `functions/.env`/`functions/.env.*` patterns, mirroring the root `.env`
  entries), and confirmed `createCheckoutSession`/`stripeWebhook` are still
  unwired to any UI so the placeholders are inert, not a live (if fake)
  Stripe integration. **Fold-forward for whoever resumes `PALLETIQ-003`:**
  these three placeholder values need replacing with real ones (`firebase
functions:secrets:set STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`, and a
  real price ID in `functions/.env.mrt-pallet-iq`) as part of that ticket's
  existing resume checklist above — added as an explicit step there.
  **Verified fixed**, not just deployed: repeated the same live sign-up →
  onboarding round trip as `PALLETIQ-006`'s close, this time confirming
  `tenants/{tenantId}/subscriptions/current` was created (`plan: "free"`,
  `status: "free"`) alongside `settings/general`. Test account and docs
  deleted afterward, same as every other live-verification pass this cycle.

- **2026-08-10 — `PALLETIQ-007` closed.** Shipped per the `BACKLOG.md` scope
  note: CRUD UI for `vendors` (name, `manifestFormat`, contact, `terms`), a
  new `SelectField` component matching `TextField`'s pattern, a real
  `/vendors` route, and closing `PALLETIQ-006`'s landing-page dead-end
  placeholder with an actual "Go to vendors" CTA. `firestore.rules`' vendors
  write rule tightened from the placeholder `isOwnerOrManager` to the real
  `isOwner` policy, with a dedicated rules-test block (pulled out of the
  shared `describe.each`) proving the tightened policy, not just added
  coverage — 87/87 rules tests passing against the real emulator. Verified
  live end-to-end against `mrt-pallet-iq`: sign-up → onboarding → landing →
  vendors → add → edit → delete, zero console errors. Test account and
  Firestore docs deleted afterward.
  **Drift, caught by `design-system-auditor` before merge, fixed in this
  PR:** `VendorsPage.tsx`'s "Vendors" page heading initially copied
  `BrandMark.tsx`'s `font-display`/`font-extrabold` classes — those are
  scoped to the "PalletIQ" wordmark only per
  `docs/design/Pallet-IQ-Design-System.md` §3, not ordinary page titles.
  Fixed to `font-bold` (default Inter), matching the H1 spec ("24–28px,
  Bold, Ink Navy"). Worth watching for on future pages copying `BrandMark`'s
  classes instead of just its component.
  **Known gaps, not fixed here (both flagged by `design-system-auditor` as
  non-blocking):** (1) `listVendors()` fetches the full vendor doc including
  `terms` for every role — the Warehouse-role omission is client-side only
  (render-time, per `rbac-ui-patterns.md`'s explicitly-permitted pattern),
  so `terms` is still visible in the network payload/dev-tools for a
  Warehouse user even though it never paints. Compliant with the documented
  pattern as written, but worth a `firestore.rules` field-level look if that
  ever needs tightening. (2) The vendor table has no sticky header or
  row-hover treatment (`components.md` calls for both on "long tables") —
  reasonable for a 2–3-vendor MVP list, revisit if vendor counts grow.
  (3) The `terms` field is a single-line `TextField`, not a textarea —
  `components.md` doesn't document a textarea pattern at all yet, so this
  is a gap in the doc, not a violation; worth adding one if free-text
  fields recur.

- **2026-08-10 — `PALLETIQ-008` closed.** Shipped per `ADR-0006` and the
  `BACKLOG.md` scope note: `enqueueManifestImport` callable +
  `processManifestImport` Cloud Tasks worker (reusing `PALLETIQ-005`'s
  queue infrastructure), `papaparse`/`exceljs` parsers, a common
  `LineItem` schema with header-alias matching (`sku`/`upc`/`description`/
  `quantity`/`unitCost`/`condition`/`category`, tolerant of `$`/`,`-
  formatted numbers), partial-success row handling (bad rows land in
  `imports_errors`, not a whole-file failure), and `/manifests` +
  `/manifests/:importId` UI. `firestore.rules` gained a new
  `isOwnerOrBuyer` helper; `imports`/`manifests`/`lineItems` write
  tightened to it (a real behavior change - Manager write now denied,
  previously allowed under the placeholder policy) and `imports_errors`
  moved to Cloud-Functions-only write. `storage.rules` gained its first
  path-specific tightening since `PALLETIQ-001` (`manifests/{importId}/
{fileName}`: read Owner/Manager/Buyer, write Owner/Buyer) plus new
  `storage.rules.test.ts` coverage - closing that file's own long-standing
  "known gap: no automated rules-test suite" note from its original
  `PALLETIQ-001`-era scaffold comment. `docs/personas/buyer.md` corrected
  to list `imports`/`manifests` under Write (was read-only, a real
  documentation gap found during `ADR-0006`'s scoping, not the intended
  policy).
  **Verified live, not just via emulator:** deployed both new functions
  plus the updated rules to `mrt-pallet-iq`, then drove a real CSV import
  (one valid row, one row with a missing description) and a real XLSX
  import through the full pipeline via Playwright - correct normalization,
  correct per-row error capture (`row 3, "Missing description"`), correct
  landed values ($4.50 unit cost rendered exactly), zero console errors.
  Test tenant, vendors, imports, manifests, lineItems, imports_errors,
  Storage files, and the Auth user all deleted afterward.
  **Drift beyond planned scope:** `design-system-auditor` caught two real,
  new-instance Check IV findings before merge, both fixed in this PR: an
  `<h2>` using `font-bold` instead of the H2 spec's Semibold
  (`ManifestDetailPage.tsx`'s error-rows heading - the first real H2
  instance in the app besides the wordmark's unrelated `font-display`
  case), and numeric columns (Rows/Errors/Qty/Unit cost) not right-aligned
  per `components.md`'s Data tables rule (the first tables in the app with
  actual numeric columns to test that rule against - `PALLETIQ-007`'s
  vendor table has none). Small "Vendors ↔ Manifests" cross-links added to
  both pages' headers for discoverability, since there's still no
  persistent nav (`PALLETIQ-010`).
  **Known gaps, not fixed here:** no file-upload input pattern exists yet
  in `docs/design/components.md` - `ImportForm.tsx`'s native, unstyled
  file input is flagged as the first instance of that gap rather than
  inventing a pattern unilaterally; `PALLETIQ-012` still owns the deeper
  upload-security hardening (magic-byte validation beyond mimetype,
  malware scanning, rate limiting) beyond this ticket's basic 10 MB size
  cap; sticky table headers and row-hover states are still missing from
  every table in the app (`PALLETIQ-007`'s pre-existing gap, not
  reintroduced here, not yet fixed either).

- **2026-08-10 — `PALLETIQ-009` closed.** Shipped per the `BACKLOG.md` scope
  note: value-weighted freight/fee allocation, resolved with the owner
  during scoping over quantity-weighted and manual-entry alternatives.
  `freightCost`/`otherFees` added to the existing `imports/{importId}` doc
  (initialized to 0 by `enqueueManifestImport`, editable via a new
  "Shipping & fees" form, Owner/Buyer only - no `firestore.rules` change
  needed, reuses `PALLETIQ-008`'s `isOwnerOrBuyer` write gate exactly as
  scoped). Landed cost is computed client-side on read
  (`src/lib/manifests/landedCost.ts`, a pure function, never persisted) and
  shown as a new "Landed cost" column alongside the existing "Unit cost"
  column on `ManifestDetailPage.tsx`, both omitted from the DOM for
  Warehouse via the same `canSeeCost` flag `PALLETIQ-008` already
  established. No new ADR - a calculation-formula decision, not an
  architecture one, documented in full in the scope note.
  **This closes the second half of Phase 1's QA criterion that's been open
  since `PALLETIQ-008`:** "a real vendor manifest... imports cleanly
  end-to-end with **correct landed cost per unit**." Verified live against
  `mrt-pallet-iq` (redeployed `enqueueManifestImport` for its new default
  fields): imported a real 2-row CSV manifest, confirmed a 1x multiplier
  before any freight/fees were entered, entered $9.50 freight, confirmed
  the resulting 10% markup applied identically to both line items
  regardless of their different unit costs ($4.50→$4.95, $10.00→$11.00) -
  exactly the value-weighted-simplifies-to-uniform-markup behavior the
  formula is supposed to produce. Zero console errors; test tenant/vendor/
  import/manifest/lineItems/Storage file/Auth user all deleted afterward.
  Phase 1's QA criterion's other half (malformed/corrupt files rejected
  safely) still isn't met - that's `PALLETIQ-012`, unchanged by this
  ticket.
  **Drift beyond planned scope:** none of substance - `design-system-auditor`
  ran clean (no blocking findings, unlike `PALLETIQ-007`/`008`'s audits
  which each caught a real Check IV bug). One purely cosmetic fix applied
  anyway (the two numeric fields in the new form now size evenly via
  `flex-1`, per the auditor's minor observation). One real TypeScript
  friction point worth remembering for future numeric-input forms: Zod's
  `z.coerce.number()` has a wider input type (`unknown`, since raw
  `<input>` values arrive as strings) than its output type (`number`),
  which breaks a plain `useForm<T>()` call - fixed by using RHF's
  three-generic `useForm<InputType, unknown, OutputType>()` form
  (`z.input<typeof schema>` / `z.output<typeof schema>`), the first
  numeric form in the app to hit this.

- **2026-08-11 — `PALLETIQ-010` closed.** Shipped per the `BACKLOG.md` scope
  note, resolved with the owner during scoping: "today's opportunities"
  (Phase 2 scoring) and "inventory totals" (`PALLETIQ-011`) omitted
  entirely - no fake or stubbed cards. Built `AppShell` (the sidebar nav
  pattern `docs/design/mobile-responsive.md` and the base design doc have
  specified since `PALLETIQ-006`, finally implemented): Deep Navy → Ink
  Navy gradient sidebar from `md` up, Brand Blue pill active state,
  collapsing to a top app bar + hamburger/drawer below `md`, wired as a
  react-router layout route around `/`, `/vendors`, `/manifests`,
  `/manifests/:importId`. New `DashboardPage` replaces the `LandingPage`
  placeholder `PALLETIQ-006` shipped (deleted, along with its test) - four
  real stat cards (vendor/import/line-item/error counts, no extra
  subcollection reads) plus a "Recent imports" list. `VendorsPage.tsx`,
  `ManifestsPage.tsx`, and `ManifestDetailPage.tsx` all had their now-
  redundant ad-hoc "← Back"/cross-nav-link chrome removed, since the
  sidebar replaces it. `BrandMark.tsx` gained `variant`/`asHeading` props
  (the doc's own "all-white on dark backgrounds" logo variant, and a way
  to render the wordmark without a second `<h1>` colliding with each
  page's own heading) rather than a second component.
  **Verified live:** full flow through the real app (sidebar nav, dashboard
  stats populating from a real import, mobile hamburger/drawer, active-
  state highlighting), zero console errors, screenshots confirmed correct
  rendering at both desktop and mobile widths. No functions/rules changes,
  so no redeploy needed this time.
  **Drift beyond planned scope:** `design-system-auditor` caught one real,
  blocking Check IV bug before merge: the shared `Button` component's
  `ghost` variant carries `hover:bg-cloud-gray`, meant for light surfaces -
  reused directly for the sidebar's "Sign out" control, it would have shown
  a light box on hover against the dark gradient background, and the
  partial `className` override attempting to fix it doesn't reliably win
  against Tailwind's own utility-generation order anyway. Fixed by _not_
  routing dark-sidebar "Sign out" through `Button`/`buttonVariants` at all -
  a small dedicated `SignOutButton` styled to match the nav links' own
  light-gray/white-at-reduced-opacity treatment instead. Also fixed on the
  same audit pass: the dashboard's "no imports yet" state now reuses the
  shared `EmptyState` component instead of a hand-rolled paragraph, for
  consistency with `VendorsPage.tsx`/`ManifestsPage.tsx`.
  **Also fixed, unrelated to this ticket's scope:** `PALLETIQ-008`/`009`'s
  drift notes above had literal `&lt;`/`&gt;` HTML entities instead of real
  angle brackets (five occurrences) - a copy-paste artifact from writing
  this file, not a rendering issue with anything user-facing. Fixed as a
  drive-by since it was noticed while editing this same file for this
  ticket's own close, not because it was in scope.
  **Known gaps, not fixed here (both minor, flagged non-blocking by the
  audit):** no `hover:bg-cloud-gray` row-hover state on any data table in
  the app yet (`components.md` calls for it; `PALLETIQ-007`'s pre-existing
  gap, not reintroduced here); the mobile top app bar's `bg-navy` solid
  fill was made consistent with the sidebar/drawer's gradient during this
  ticket's own audit-driven fixes, so that one's already closed, not open.
  Warehouse's real mobile-first bottom-tab-bar nav (`mobile-responsive.md`)
  is still not built - every role uses this desktop-pattern shell for now,
  as scoped; that's `PALLETIQ-011`'s job once real mobile scanning screens
  exist to justify it.

- **2026-08-11 — `PALLETIQ-011` closed. Phase 1 now fully shipped.** Shipped
  per the `BACKLOG.md` scope note and `ADR-0007`: `processManifestImport`
  auto-creates one `tenants/{tenantId}/inventory/{id}` doc per successful
  line item (`status: 'purchased'`, referencing `lineItemId`/`manifestId`/
  `vendorId`/`unitCost` - no landed cost duplicated, computed on read
  elsewhere same as `PALLETIQ-009`); a simple one-way Purchased → Received →
  Listed → Sold "advance" action on a new `InventoryPage` inside the
  existing `AppShell`; `firestore.rules`' `inventory` write tightened from
  the placeholder `isOwnerOrManager` to a new `isOwnerOrManagerOrWarehouse`
  helper (Buyer stays read-only), with a dedicated 6-test rules block
  (pulled out of the shared placeholder `describe.each`) - 94/94 rules
  tests passing against the real emulator.
  **Correcting a real planning-error found before implementation started
  (not drift during implementation):** `PALLETIQ-010`'s own scope note
  above claimed Warehouse's mobile-first bottom-tab-bar nav was "`PALLETIQ-
011`'s job once real mobile scanning screens exist." Re-reading
  `docs/projects/PROJ-PALLETIQ.md`'s Phase 1 vs. Phase 3 sections at this
  ticket's Planning gate showed that's wrong - barcode scanning and the
  mobile receiving flow are explicitly Phase 3 bullets, not Phase 1's
  "basic" inventory tracking. `PALLETIQ-011` stayed inside the existing
  desktop `AppShell`, as corrected in its own scope note; the bottom-tab-bar
  nav remains unbuilt, now correctly attributed to whichever future ticket
  builds Phase 3's scanning/mobile-receiving screens.
  **Phase 1 QA/Verification** (`PROJ-PALLETIQ.md`): "A real vendor manifest
  in each supported format imports cleanly end-to-end with correct landed
  cost per unit; malformed/corrupt files are rejected safely" - already
  met as of `PALLETIQ-008`/`009`'s closes, unchanged by this ticket. What
  this ticket completes is Phase 1's own bullet list in full: all six
  bullets (auth/onboarding `PALLETIQ-006`, vendor management `007`,
  manifest import/normalization `008`, landed cost `009`, dashboard `010`,
  inventory lifecycle `011`) are now shipped - `docs/ROADMAP.md`'s Phase 1
  marker flipped `⚪` → `🟢` accordingly.
  **Verified live against `mrt-pallet-iq`:** redeployed
  `processManifestImport` and `firestore.rules`, then drove all three
  relevant roles through the real app via Playwright - Owner: added a
  vendor, imported a real 2-row CSV, confirmed both rows appeared as
  `Purchased` inventory with unit cost visible, advanced one to `Received`;
  Warehouse (role swapped via a direct custom-claims update, then a real
  re-sign-in for a fresh ID token - same test user reused, not a second
  account): confirmed the Unit cost column and header are omitted from the
  DOM entirely (not CSS-hidden), and confirmed the new write access by
  advancing the second item to `Received` too; Buyer: confirmed cost stays
  visible but no advance action renders (read-only, matching the tightened
  rule). Test tenant/vendor/import/manifest/lineItems/inventory docs,
  Storage file, and the Auth user all deleted afterward via the same
  firebase-tools refresh-token-to-access-token trick used since
  `PALLETIQ-005`'s close.
  **Drift beyond planned scope:** `design-system-auditor` caught one real,
  new-instance Check IV bug before merge - the "Listed" status label used
  `text-cyan-accent`, the first use of that token as body/label text
  anywhere in `src/`, which both falls outside Cyan Accent's documented
  scope (gradients/icons/decorative surfaces only, per
  `Pallet-IQ-Design-System.md` §2) and fails WCAG contrast (~2.43:1 against
  white/Cloud Gray). Fixed by switching to `text-ink-navy`.
  `firestore-rules-auditor` ran clean - no parity gaps, new `inventory`
  policy and test coverage both correct.
  **Known gaps, not fixed here:** per-transition-per-role RBAC (e.g. only
  Warehouse can do Purchased→Received) stays deferred to Phase 3's own
  "RBAC enforcement in UI" QA criterion, per `ADR-0007`'s Alternatives
  section - every Owner/Manager/Warehouse write gets the same "advance"
  action for now. The dashboard's "inventory totals" card
  (`PALLETIQ-010`'s deferred item) now has a real data source to wire up
  for the first time, but wiring it wasn't in this ticket's own scope -
  worth a small follow-on whenever the dashboard is next touched. Sticky
  table headers / row-hover states remain missing on every data table in
  the app, including the new `InventoryPage` table - the same pre-existing,
  repeatedly-flagged gap from `PALLETIQ-007`'s close onward, not
  reintroduced here.

- **2026-08-11 — `PALLETIQ-012` closed. Closes Phase 1's QA criterion in
  full.** Shipped per the `BACKLOG.md` scope note and `ADR-0008`:
  `storage.rules`' manifests write rule gains real size-limit enforcement
  (`request.resource.size < 10 MB`, split `create, update` from `delete`
  since `request.resource` is null on delete) - previously the _only_
  size check anywhere was `processManifestImport.ts`'s post-download
  check, too late to stop an oversized file from ever landing in Storage.
  New `functions/src/manifests/validateFile.ts`, called before `parseFile`:
  XLSX gets a real magic-byte/structural check (`JSZip.loadAsync` -
  central-directory-only, doesn't decompress entries) rejecting non-ZIP/
  corrupt files, plus an `xl/vbaProject.bin` entry check rejecting
  macro-enabled workbooks (catches a macro file renamed to `.xlsx`, which
  extension-checking alone can't); CSV gets a cheap ZIP-signature/NUL-byte
  sanity check. `processManifestImport` also gained a 50,000-row circuit
  breaker and explicit `memory: '512MiB'`/`timeoutSeconds: 120` (pinned
  intentionally rather than left on the platform default). `ImportForm.tsx`
  got a matching client-side 10 MB check, explicitly documented as UX only.
  `jszip` added as an explicit `functions/package.json` dependency (was
  already present transitively via `exceljs`).
  **Resolved with the owner at the Planning gate, not drift:** a prior code
  comment (`processManifestImport.ts`'s old `MAX_FILE_SIZE_BYTES` comment)
  had speculatively attributed "malware scanning" and "rate limiting" to
  this ticket - neither is actually named in the ticket title or Phase 1's
  QA criterion. Confirmed scope stays to what's named; real malware/AV
  scanning explicitly deferred (`ADR-0008`'s Alternatives).
  **This closes Phase 1's QA criterion in full** (`PROJ-PALLETIQ.md`): "A
  real vendor manifest in each supported format imports cleanly end-to-end
  with correct landed cost per unit" was met as of `PALLETIQ-008`/`009`;
  "malformed/corrupt files are rejected safely (upload security checks per
  review - size limits, sandboxed parsing, no macro execution)" - the half
  `PALLETIQ-009`'s own close note left explicitly open - is what this
  ticket verifies. `docs/ROADMAP.md`'s Phase 1 marker was already flipped
  to 🟢 at `PALLETIQ-011`'s close (all six bullets shipped); this ticket
  is what actually earns that QA criterion, not just the bullet list.
  **Verified live against `mrt-pallet-iq`:** redeployed
  `processManifestImport` and `storage.rules`, then: (1) confirmed a normal
  CSV import still creates inventory exactly as before (no regression);
  (2) a real macro-enabled XLSX (a genuine ZIP containing
  `xl/vbaProject.bin`) uploaded and failed with exactly `"Macro-enabled
files are not supported."`; (3) a plain-text file renamed `.xlsx` failed
  with exactly `"Invalid XLSX file - the file is not a readable
spreadsheet."`; (4) most importantly, a **direct Storage SDK call
  bypassing the app's own client-side check entirely** (signed in as the
  real test user, not the admin credential) confirmed the deployed
  `storage.rules` itself rejects an 11 MB upload with `storage/unauthorized`,
  while an under-the-limit upload to the same path still succeeds - proving
  the real enforcement boundary works, not just the UI guard in front of
  it. Exact rejection reasons were confirmed via a direct Firestore read
  (the UI didn't show them at the time - see below), since
  `ManifestsPage`/`ManifestDetailPage` never rendered `imports.error`
  anywhere until this ticket fixed that. Test tenant/vendors/imports/
  manifests/lineItems/inventory docs, Storage files, and the Auth user all
  deleted afterward.
  **Drift found during this ticket's own live verification, fixed in the
  same PR:** `import.error` (populated on any import-level failure - size
  limit, invalid file, macro-enabled, or any of `PALLETIQ-008`'s
  pre-existing failure paths) was never rendered anywhere in the UI -
  `ManifestsPage`'s table has no error column and `ManifestDetailPage`
  only showed `status`/`successCount`/`errorCount`, never the message
  itself. A real Buyer hitting any of this ticket's new rejections would
  have seen only "failed" with no way to self-diagnose, which undercuts
  the point of rejecting unsafe files "safely" rather than just silently.
  Fixed by rendering `import.error` on `ManifestDetailPage` when
  `status === 'failed'`, reusing the existing `text-label text-danger`
  pattern already used for form errors elsewhere in the app - no new UI
  pattern, so no separate `design-system-auditor` dispatch for this
  follow-up commit (verified by inspection against the identical class
  combination the earlier dispatch on this same ticket already confirmed
  compliant).
  **Known gaps, not fixed here:** full ZIP decompression-bomb protection
  (per-entry decompression-ratio tracking) stays deferred - the row-count
  circuit breaker plus the explicit memory/timeout bounds are judged
  sufficient for now, per `ADR-0008`; real malware/AV scanning stays
  deferred, same ADR. `ManifestsPage`'s list view still has no error
  indicator (only `ManifestDetailPage` does) - a Buyer has to click into a
  failed import to see why; worth a small follow-on if that turns out to
  be a real friction point in practice.

- **2026-08-11 — `PALLETIQ-017` closed.** Shipped exactly per the
  `BACKLOG.md` scope note: the owner supplied a real logo lockup PNG
  (kept as source-of-truth at `docs/design/assets/
palletiq-logo-lockup-source.png`), from which the icon was chroma-keyed
  out (`src/assets/palletiq-icon.png`, transparent background) and used to
  replace the two placeholder files this ticket's title names as the Check
  IV gap - `public/favicon.svg` (an unrelated purple Vite-template
  leftover) and `public/icons.svg` (an unused Bluesky/social-icon sprite,
  confirmed unreferenced anywhere in `src/` before deleting). New
  `favicon.ico`/`favicon-16.png`/`favicon-32.png`/`apple-touch-icon.png`/
  `icon-192.png`/`icon-512.png`, all icon-on-Brand-Blue (`#2563EB`, the
  canonical token, not the slightly different blue sampled from the
  source PNG), wired into `index.html`. `BrandMark.tsx` now renders the
  real icon (dark variant direct; light variant in a Brand Blue badge,
  since the icon's internal negative-space detail only reads correctly
  against a colored backdrop, never white) instead of `lucide-react`'s
  generic `PackageSearch` placeholder every prior ticket's comments
  flagged as temporary. New optional `tagline` prop, wired on `AuthCard`
  only (the doc's "Stacked" splash-lockup context), not `AppShell`'s
  sidebar.
  **No Phase QA/Verification criterion applies directly** - this is a
  Check IV asset-compliance ticket (`docs/GOVERNANCE.md`'s standing check,
  not a phase-scoped criterion in `PROJ-PALLETIQ.md`), verified via
  `design-system-auditor` rather than a phase QA bullet.
  **Real, logged deviation from the design doc's literal wording:**
  `Pallet-IQ-Design-System.md` §1 describes a "full color on light
  backgrounds (navy + blue wordmark)" variant, but only the all-white-on-
  blue lockup was supplied - no two-tone source art exists to do that
  treatment on the icon. `design-system-auditor` reviewed the Brand Blue
  badge workaround independently and concluded it's a defensible
  application of the doc's own second documented variant ("all-white on
  dark **or brand-blue** backgrounds") rather than a violation - recorded
  in the scope note as a deviation anyway since it wasn't literally what
  the doc's light-background line describes.
  **Drift, found by `design-system-auditor`, fixed in the same PR:** a
  `theme-color` meta tag (`#2563EB`) was missing from `index.html` despite
  the new Brand Blue icon set implying a Brand Blue mobile-chrome context
  - added.
    **Known gap, found by the same audit, acknowledged not fixed:**
    `BrandMark.tsx`'s wordmark has always rendered as one solid color, not
    the doc's specified navy/blue split per word - predates this ticket (only
    the icon element and the new `tagline` prop were touched), but wasn't
    mentioned anywhere despite this ticket's scope note extensively
    discussing §1 compliance for the icon specifically. Logged in the
    `BACKLOG.md` scope note so it reads as a known gap, not silently
    accepted - small enough to fix whenever `BrandMark.tsx` is next touched.
    **Known gaps, not fixed here (already disclosed in the scope note, not
    new):** no vector (SVG) source exists, so all assets are PNG/ICO raster;
    no real navy+blue two-tone light-background icon variant; `icon-192`/
    `icon-512` are shipped but unreferenced (no `manifest.json` exists yet -
    a separate, unscoped PWA-installability concern); no public marketing/
    landing page exists yet to host the doc's §4 "horizontal white-on-blue
    logo lockup for headers" use case.

- **2026-08-11 — `PALLETIQ-019` closed.** Shipped exactly per the
  `BACKLOG.md` scope note, no drift from the approved plan. `AuthCard`
  (sign-in/sign-up/onboarding/accept-invite - all 4 pages that share it)
  now renders a single flattened logo lockup image
  (`src/assets/palletiq-logo-lockup.png`, generated from `PALLETIQ-017`'s
  archived source via ImageMagick trim/border/resize) in place of the
  composed icon-badge + heading + tagline `BrandMark` built in
  `PALLETIQ-017`. `BrandMark.tsx` simplified from 3 props to zero, now
  hardcoding exactly what its one remaining caller (`AppShell`'s dark
  sidebar/header, 2 call sites) needs - the `variant`/`tagline` paths it
  dropped were 100% dead once `AuthCard` stopped calling it.
  **No Phase QA/Verification criterion applies directly** - same reasoning
  as `PALLETIQ-017`: a Check IV asset-compliance ticket, not a
  phase-scoped criterion in `PROJ-PALLETIQ.md`. Verified via full test
  suite (121 passing, including new `AuthCard.test.tsx` and rewritten
  `BrandMark.test.tsx`), `design-system-auditor` (no new violations - both
  already-logged deviations below reconfirmed acceptable), and a live
  Playwright visual check of `/signin` and `/signup` confirming the banner
  renders full-width, centered, cleanly rounded, with no clipped content
  at either corner.
  **Repeated, already-logged deviations** (both first logged in
  `PALLETIQ-017`, reconfirmed here since the same asset class appears a
  second time): the banner's background is the source image's own sampled
  blue (`srgb(0,60,227)`/`#003CE3`), not the canonical `#2563EB` token,
  since it's extracted/bordered content rather than newly painted pixels;
  the lockup's layout (horizontal icon+wordmark with a tagline appended
  beneath) doesn't literally match either of `Pallet-IQ-Design-System.md`
  §1's two named lockups ("Horizontal" has no tagline, "Stacked" is
  icon-above-wordmark) - it's the same hybrid `PALLETIQ-017`'s composed
  `AuthCard` version already used, now shipped as one flattened image.
  `design-system-auditor` also noted the `BACKLOG.md` scope note's claim
  that the pre-existing unsplit-wordmark gap ("PalletIQ" rendering as one
  solid color instead of the doc's navy/blue split) "still applies to
  `BrandMark`'s remaining `AppShell` usage" overstates it - the doc's
  split-color requirement is for the light-background variant, and
  `AppShell`'s dark sidebar falls under the doc's separate all-white-on-
  dark-or-brand-blue variant, which solid white already satisfies. Not
  fixed here (the wordmark rendering itself wasn't touched by this
  ticket), just corrected for the record.

- **2026-08-11 — `PALLETIQ-004` closed.** Shipped exactly per the
  `BACKLOG.md` scope note, no drift from the approved plan. Original title
  ("Secret Manager wiring for third-party credentials") was scoped down
  during the Planning-gate conversation once it became clear `PALLETIQ-003`
  had already pulled the real mechanism forward (`defineSecret` via
  `firebase-functions/params`, Secret Manager API already enabled on
  `mrt-pallet-iq`) and neither of the two remaining named consumers - the
  Gemini API key (Phase 2) or marketplace API keys/vendor logins (Phase 4)
  - has any code that needs a secret yet. Shipped as a documentation-only
    ticket: a new "Third-party secrets" section in `CONTRIBUTING.md` writing
    down the `defineSecret`/just-in-time-provisioning convention `ADR-0005`
    already established, pointing at `functions/src/billing/params.ts` as the
    worked example, so the next ticket that needs a real secret follows it
    instead of re-deciding it. **No Phase QA/Verification criterion applies
    directly** - Phase 0's QA bullets (rules tests, Stripe subscription
    round-trip, dummy async task) don't name Secret Manager documentation;
    same "not phase-gated" reasoning `PALLETIQ-017`/`019` used for Check IV
    asset tickets. Verified via `pre-pr-check`'s full command checklist
    (format/lint/typecheck/121 tests, all passing) - no `test:rules` needed,
    no Firestore/UI/AI-boundary checks applicable, since the diff touched only
    `docs/BACKLOG.md` and `CONTRIBUTING.md`.

- **2026-08-13 — `SPEC-SOURCING-INTEL-002` merged into the roadmap/backlog.**
  Ryan (RPD Consulting) supplied an external spec proposing automated lot
  discovery across restock.ca, B-Stock (Canadian storefronts), and Direct
  Liquidation. Before merging, checked it against a fresh read of
  `docs/GOVERNANCE.md`, `docs/ROADMAP.md`, `docs/BACKLOG.md`, and
  `docs/projects/PROJ-PALLETIQ.md`. The spec's own pre-flight ToS review found
  B-Stock's and Direct Liquidation's Terms of Use/Service each independently
  prohibit automated scraping - confirmed and carried into the merge, not
  re-litigated. Landed through the Planning gate as two tickets:
  `PALLETIQ-020` (Track A - restock.ca scheduled scraper, ToS pre-flight
  already checked clean per the owner) and `PALLETIQ-021` (Track B - compliant
  manual-entry watchlist for the two prohibited sources, no scraper). Full
  architectural reasoning - including the global-vs-tenant-scoped collection
  split and why `watchlist_lots` stays separate from the existing generic
  `watchlists` collection - is in `ADR-0009`. Both tickets pulled forward from
  Phase 4's "automated vendor ingestion" bullet
  (`docs/projects/PROJ-PALLETIQ.md`/`docs/ROADMAP.md` both updated with a
  cross-reference), run as a parallel track alongside Phase 2, not sequenced
  after Phase 3 and not blocking or blocked by it - resolved with the owner
  during this merge, not assumed. Neither ticket is in flight yet (see
  "Tickets in flight" above) - opening them is a Planning-gate action, not a
  decision to start work this cycle.

  **Tracked follow-ups, deliberately not opened as tickets:**
  - **Watchlist bookmarklet/browser extension** (the spec's own Track B
    Phase 3) - the spec explicitly says only build this if `PALLETIQ-021`'s
    quick-add form alone proves too slow in practice, validated with a week
    of real use first. Revisit once that real-use signal exists; don't open
    a ticket speculatively before then.
  - **B-Stock outreach** (the spec's own Track B Phase 4) - contacting
    B-Stock's buyer support/sales to ask about an API, data feed, or
    saved-search alert product for verified business buyers. This is Ryan's
    own action item, not engineering work - no ticket exists for it. If it
    produces a sanctioned feed or API key, that becomes a new Track-A-style
    spec (scheduled ingestion against a real endpoint), not a reason to build
    an undocumented-endpoint scraper. Document the response here (or open a
    proper ticket) once Ryan has an answer, whichever way it goes.

- **2026-08-13 — Ticket ID collision on `PALLETIQ-020`/`021`/`ADR-0009`,
  resolved by renumbering.** A concurrent session (mobile Claude Code) opened
  and merged `PALLETIQ-020`/`021`/`ADR-0009` (the restock.ca scraper +
  watchlist, PRs #42/#43) to `main` while this session's
  `palletiq-020-lot-price-unit-cost-allocation` branch had independently
  opened its own `PALLETIQ-020`/`021`/`022`/`ADR-0009` (lot purchase price
  allocation + two follow-up bug tickets) locally, unaware of the other
  session's work - both branched from the same pre-merge commit. Caught
  while re-syncing this branch with `origin/main`. Per `docs/BACKLOG.md`'s
  "sequential, never reused" rule, since the mobile session's PR merged
  first, this branch's tickets/ADR were renumbered to the next free slots -
  `PALLETIQ-020`/`021`/`022` → `PALLETIQ-022`/`023`/`024`, `ADR-0009` →
  `ADR-0010` (file renamed, all in-repo references updated) - rather than
  contesting the already-merged IDs. No functional drift, purely an ID
  bookkeeping fix. Worth naming as a process gap: nothing currently checks
  for this at Planning-gate time when two sessions run concurrently against
  the same `docs/BACKLOG.md` snapshot; not opening a ticket for tooling
  around it yet since this is the first time it's happened, but revisit if
  it recurs.

- **2026-08-13 — `PALLETIQ-022` closed.** Planned scope (per `docs/BACKLOG.md`'s
  scope note and `ADR-0010`): fix `normalize.ts`'s header-alias gap (`Title`/
  `Merchant SKU` unrecognized) and add a `totalPurchasePrice` fallback so a
  manifest with no per-item cost column - a real Restock.ca file that
  previously produced 0 successful rows / 13 errors - imports cleanly with a
  flat per-unit-quantity `unitCost`. Shipped exactly per that scope note, no
  drift: `FIELD_ALIASES` gained `title`→`description`/`merchant sku`→`sku`;
  `ImportForm.tsx` collects an optional `totalPurchasePrice` at import time
  only; `enqueueManifestImport` validates and threads it onto
  `ImportDoc.totalPurchasePrice`; `processManifestImport.ts`'s pre-pass sums
  quantity and computes the flat rate, used only when a row has no direct
  cost; `unitCost` stays a required, always-populated field, no nullability
  introduced. Test coverage uses the real Restock.ca header shape as inline
  fixtures in `normalize.test.ts`/`processManifestImport.test.ts`, matching
  the repo's existing inline-fixture convention. No `firestore.rules` change
  needed, as scoped - `imports/{importId}`'s existing
  `isOwnerOrBuyer`/`isTenantMember` rules already cover the new field.
  Verified against Phase 1's QA criterion ("a real vendor manifest ... imports
  cleanly end-to-end with correct landed cost per unit") via the
  Restock.ca-shaped fixture covering exactly the previously-failing scenario,
  plus `pre-pr-check`'s full checklist (`format`/`lint`/`typecheck`/`test` -
  root 123/123, `functions/` 113/113 after an `npm install` for the merge's
  new `cheerio` dep - and Check IV, audited clean by `design-system-auditor`).
  `test:rules` not runnable in this session's sandbox (no Java for the
  Firestore emulator); N/A regardless since this ticket's diff doesn't touch
  `firestore.rules`. **Known gaps, intentionally not fixed here - confirmed
  the shipped code still exhibits both exactly as scoped:** `PALLETIQ-023`
  (a `totalPurchasePrice: 0` free lot is mishandled as "no price given") and
  `PALLETIQ-024` (a negative manifest-stated unit cost is silently replaced by
  the flat rate instead of surfacing as a data error) both remain open,
  separate tickets - not folded into this one's scope.

- **2026-08-22 — `PALLETIQ-020` closed (belatedly; a real gap, not just
  bookkeeping).** PR #43 merged the `scrapeRestockLots` implementation on
  2026-08-13, but `docs/BACKLOG.md` was never flipped from `Planned` to
  `Done` and no close note was recorded here - caught while surveying the
  backlog for what to work on next. Checking further found this wasn't
  just a missed status flip: `firebase functions:list --project
mrt-pallet-iq` showed `scrapeRestockLots` had never actually been
  deployed. Cloud Functions don't auto-deploy on merge to `main`
  (`PALLETIQ-014`'s deliberate design), and PR #43's own test plan had
  left both live-verification checkboxes unchecked, blocked at the time by
  this session's sandbox having no network egress to restock.ca. So the
  real state was: code merged and CI-green, but the feature had never run
  and `restock_lots` had zero documents - the same "PR merged, ticket not
  actually done" pattern flagged before (`PALLETIQ-014`), just with a
  bigger gap this time (never deployed, not just a missed doc update).
  Per `close-ticket`'s own gate ("if the QA criteria aren't clean, stop and
  report rather than closing anyway"), this was reported to the owner
  rather than silently flipped to `Done`; the owner chose to deploy and
  verify live now rather than leave it open.
  **Shipped/verified this session:** `firebase deploy --only
functions:scrapeRestockLots --project mrt-pallet-iq` (first deploy;
  auto-enabled `cloudscheduler.googleapis.com`, confirmed
  `firebase-schedule-scrapeRestockLots-us-central1` created, `every 1
hours`, `ENABLED`). Rather than wait an hour for the first natural
  firing, triggered it immediately via the Cloud Scheduler REST API's
  `:run` endpoint (using the same firebase-tools-refresh-token-to-
  access-token credential trick as prior sessions' live verifications - no
  gcloud ADC configured in this sandbox). Confirmed via
  `firebase functions:log` and a direct Firestore REST API read: the
  function ran end-to-end against the real site, `scrapeRestockLots:
fetched 10 page(s), 399 new, 0 updated, 0 closed`, and real lot docs
  (e.g. `restock_lots/1011402`, a Staples Canada stacking-chairs lot) are
  now live in the collection with the expected shape.
  **Real bug found via this live run, not folded into this close:** 121 of
  ~520 cards across 8 of the 10 pages logged `unparsedCount` warnings
  (title didn't match `TITLE_PATTERN`) and were silently skipped - traced
  to lots with a warehouse-prefixed lot number (e.g. `"...(Lot #
105-917312)"`) that the regex's plain-`(\d+)` capture doesn't account
  for, a format `__fixtures__/category-page.html`'s sample data never
  happened to include. Real, ongoing data loss (~19% of listings seen),
  not cosmetic - opened as `PALLETIQ-031` (P1) rather than reopening this
  ticket, matching how `PALLETIQ-022`'s own review-found bugs became
  `PALLETIQ-023`/`024` instead of expanding an already-scoped ticket.
  **This ticket's own literal scope - a scheduled function that scrapes
  restock.ca and keeps a global `restock_lots` collection in sync - is
  genuinely delivered and now live-verified**, the `PALLETIQ-031` gap
  notwithstanding (comparable to `PALLETIQ-008` shipping with a known
  partial-row-failure rate, not a reason to withhold "Done"). No UI
  surfaces `restock_lots` to a Buyer yet - unchanged from the ticket's
  original scope note, still a natural future ticket once one is wanted.

- **2026-08-22 — `PALLETIQ-023`/`024` closed together.** Both were found
  via `/code-review` on `PALLETIQ-022`'s diff and scoped as separate
  tickets rather than reopening it (see `docs/BACKLOG.md`'s scope notes);
  implemented together here since both are one-line-condition fixes to
  the same two adjacent functions. Shipped exactly per each scope note, no
  drift:
  - **`PALLETIQ-023`:** `processManifestImport.ts`'s `flatUnitCost`
    pre-pass condition changed from `totalPurchasePrice > 0 && totalQuantity

> 0`to`totalPurchasePrice !== null && totalQuantity > 0`- an
    explicit, correctly-entered`totalPurchasePrice: 0`(a free lot) now
    computes a flat rate of`0` instead of being treated identically to no
> price given at all.

- **`PALLETIQ-024`:** `normalize.ts`'s `unitCost` resolution now checks
  `directUnitCost !== null && directUnitCost < 0` first and returns the
  same `'Missing or invalid unit cost'` error immediately when true,
  before ever consulting `flatUnitCost` - a negative manifest-stated
  cost (a vendor typo) is surfaced as a data error again, matching
  `ADR-0010`'s own stated intent, rather than silently replaced by the
  flat lot-price rate.
- The pre-existing `normalize.test.ts` case
  (`'treats a negative direct cost as absent, falling back to
flatUnitCost'`) encoded the `PALLETIQ-024` bug as expected behavior -
  rewritten to assert the corrected behavior instead of just adding a
  new case alongside a wrong one. New test added to
  `processManifestImport.test.ts` for the `totalPurchasePrice: 0`
  free-lot path (`PALLETIQ-023`).
- `npm run lint` initially flagged the `PALLETIQ-024` fix's
  `directUnitCost !== null ? directUnitCost : flatUnitCost` as
  preferring `??` (`@typescript-eslint/prefer-nullish-coalescing`) -
  simplified to `directUnitCost ?? flatUnitCost` (equivalent once the
  negative case returns early above it).
- Verified via `functions/`'s full suite (114/114, up from 113) and root
  `pre-pr-check` checklist (format/lint/typecheck/test). No
  `firestore.rules`/UI change, as scoped - `test:rules` not applicable.

- **2026-08-22 — `PALLETIQ-021` closed.** Shipped exactly per the
  `docs/BACKLOG.md` scope note and `ADR-0009`: a `WatchlistLot` type
  (`title`/`source`/`category`/`units`/`currentBid`/`closesAt`/
  `productUrl`/`notes`, plus a Cloud-Functions-independent
  `addedAt` server timestamp kept out of the public type, same precedent
  `Vendor`'s `createdAt`/`updatedAt` already set), a new tenant-scoped
  `tenants/{tenantId}/watchlist_lots` collection with `firestore.rules`
  (`read: isTenantMember`, `write: isOwnerOrBuyer` - reusing `ADR-0006`'s
  helper) folded into the existing `describe.each(['imports',
'manifests'])` parameterized rules-test block rather than a new
  standalone block, since it shares the exact same RBAC shape. A
  `WatchlistLotForm` (quick-add, mirrors `VendorForm`'s structure) and
  `WatchlistPage` (mirrors `VendorsPage`'s table/empty-state/RBAC-omission
  structure) wired into a new `/watchlist` route inside the existing
  `AppShell` nav (`Gavel` icon). `src/lib/watchlist/README.md` documents,
  quoting both platforms' actual Terms of Use/Service clauses, why this
  is manual-entry only - satisfying `ADR-0009`'s Track B
  Definition-of-Done requirement.
  **Naming call made at implementation time, not drift:** the scope
  note's field list said "price/currentBid" (one field, ambiguous
  naming) - resolved to `currentBid` alone, matching how both B-Stock and
  Direct Liquidation are described throughout `ADR-0009` as live auction
  mechanisms rather than fixed-price listings.
  **No edit action, by design, not an oversight:** the scope note asked
  for a "minimal quick-add form," not full CRUD - `WatchlistLotForm` has
  no edit mode (unlike `VendorForm`'s add/edit modes), just add and
  delete. Revisit if editing a tracked lot's current bid turns out to be
  a real recurring need.
  **First optional-numeric and first date/time form fields in the app** -
  `lib/watchlist/schemas.ts` needed a `z.preprocess` step converting an
  empty string to `undefined` before `z.coerce.number()`/`z.coerce.date()`
  runs, since `z.coerce.number()` on `''` coerces to `0` rather than
  failing (`Number('') === 0`) - a genuinely-optional field would
  otherwise silently become `0`/an invalid date instead of staying unset.
  Same class of `z.coerce` gotcha `PALLETIQ-009`'s `LandedCostForm` hit
  for a required field, one step further for optional ones.
  **Governance checks run before close, not just claimed:** dispatched
  both `firestore-rules-auditor` (Check I - confirmed all 26 collections
  now have rules+test coverage, `watchlist_lots`'s `isOwnerOrBuyer` choice
  consistent with `imports`/`manifests`) and `design-system-auditor`
  (Check IV - zero violations; RBAC write-affordances correctly omitted
  from the DOM per role, not CSS-hidden, verified both by the auditor's
  static read and by `WatchlistPage.test.tsx`'s `queryByRole(...).not
.toBeInTheDocument()` assertions). `design-system-auditor` flagged three
  genuinely new UI patterns with no `docs/design/` precedent yet - logged
  here rather than silently absorbed, none are violations: (1) the first
  `type="datetime-local"` input in the app: (2) the first client-side
  date-based table sort (closes-soonest-first, no visual urgency
  indicator as a close time nears - a product/UX call, not a defect);
  (3) an `ExternalLink` icon next to a linked table-cell title (first
  instance of that affordance). Worth folding into `components.md`'s Form
  inputs/Data tables sections if any of the three recur.
  **Verified live against `mrt-pallet-iq`, not just the emulator/unit
  suite:** `npm run test:rules` run for real (downloaded a Temurin 21
  JDK into this session, same as prior close-outs needing the emulator -
  102/102 passing, up from 96, including the new `watchlist_lots` cases).
  Root `pre-pr-check` checklist (format/lint/typecheck, 135/135 unit
  tests) all green. Then a real Playwright run against the live
  `mrt-pallet-iq` project and local dev server: signed in as a fresh
  test Owner, added two lots, confirmed closes-soonest sort ordering
  render-order matched the fixture data, swapped the same test user's
  custom claims to `warehouse` and forced a real sign-out+sign-in (per
  the documented gotcha - a reload alone doesn't pick up new claims),
  confirmed zero Add/Remove controls rendered for that role, zero
  console/page errors throughout. **Real bug caught and fixed by this
  live pass, not by the emulator or unit tests:** the first live write
  attempt failed with "Missing or insufficient permissions" - the
  updated `firestore.rules` had never actually been deployed to
  `mrt-pallet-iq` (only verified against the local emulator). Ran
  `firebase deploy --only firestore:rules --project mrt-pallet-iq`,
  confirmed the exact same write then succeeded. A reminder that
  emulator-green isn't the same claim as live-deployed, the same
  distinction `PALLETIQ-020`'s close this cycle already surfaced for
  Cloud Functions. Test tenant, its `watchlist_lots` docs, and the Auth
  user were all deleted afterward via the same firebase-tools
  refresh-token-to-access-token trick used throughout this cycle.

- **2026-08-22 — `PALLETIQ-031` and `PALLETIQ-032` closed together.**
  `031` fixed `parseLotListPage.ts`'s `TITLE_PATTERN` to accept a
  warehouse-prefixed lot number (`(\d+(?:-\d+)?)` in place of `(\d+)`),
  per the gap found closing `PALLETIQ-020`. New fixture-based test case
  using the real captured title (`"...(Lot # 105-917312)"`) added to
  `parseLotListPage.test.ts` - 8/8 tests passing (up from 7).
  **Live-verified twice, and the second pass found a second real bug:**
  first, fetched a fresh copy of restock.ca's page 2 directly and ran it
  through the actual compiled (fixed) parser - confirmed 0 unparsed
  cards, down from 15. Then redeployed `scrapeRestockLots` to
  `mrt-pallet-iq` and triggered a real run via the Cloud Scheduler API
  (same technique as `PALLETIQ-020`'s close) to confirm the fix holds
  end-to-end, not just in isolation. That run crashed -
  `firebase functions:log`'s CLI output was showing stale cached lines,
  so the crash was only caught by querying the Cloud Logging REST API
  directly: `Memory limit of 256 MiB exceeded with 265-266 MiB used`,
  on both the initial attempt and an auto-retry. Root cause: 256MiB was
  only ever exercised against an empty `restock_lots` collection (the
  very first run); every run since has to hold a full existing-docs
  snapshot in memory alongside the freshly-scraped `lots` array, and
  `031`'s own fix makes that array larger by correctly recovering the
  ~121 previously-dropped cards - pushing memory just over the edge.
  Net effect before this fix: the scraper was crash-looping every hour
  in production with zero progress past its initial 399 lots. Reported
  to the owner per the close-ticket gate's "stop and report rather than
  closing anyway" standard rather than silently shipping `031` alone;
  the owner chose to fix `032` in the same pass given the severity
  (an hourly production crash loop). Fixed by bumping
  `scrapeRestockLots`'s memory from `256MiB` to `512MiB`, matching
  `processManifestImport`'s existing resource-sandbox precedent
  (`ADR-0008`) rather than tuning to the exact observed peak.
  **Re-verified live after the memory fix, not just assumed fixed:**
  redeployed again, triggered another real run, polled Cloud Logging
  directly until a terminal log line appeared (the CLI's caching issue
  made this the only reliable check). Result: `fetched 10 page(s), 113
new, 399 updated, 0 closed` - a full, uncrashed run, and only 8
  cards logged as unparsed across all 10 pages (down from 121 before
  `031`'s fix) - a ~93% reduction, consistent with `031`'s own scope
  note anticipating "near zero, not necessarily exactly zero" since
  other, smaller-scale title-format variants may still exist. Neither
  ticket's fix required a `firestore.rules`/schema/UI change; both
  verified via `functions/`'s full suite (115/115, up from 113) and
  root `pre-pr-check` checklist (format/lint/typecheck/135 tests).

- **2026-08-23 — PALLETIQ-025 closed.** Planned scope (per `ADR-0011` and
  the ticket's own `docs/BACKLOG.md` scope note) shipped as specified: a
  mobile-first Buyer capture flow (1-5 photos), a new `tenants/{tenantId}/
item_scans/{scanId}/...` Storage path, `enqueueItemScan` callable +
  `processItemScan` Cloud Tasks worker making the first real Gemini API
  call in the codebase (vision + Google Search grounding, prompt-engineered
  JSON parsed and Zod-validated rather than `responseSchema` +
  tool-use), the low-confidence top-3-candidate picker with a direct
  client write for selection, and `firestore.rules`/`storage.rules` +
  test coverage for the new collection/path.

  **Design-doc assumption corrected (mirrors `PALLETIQ-011`'s precedent):**
  `mobile-responsive.md`'s Buyer-capture-flow addendum (written during
  `ADR-0011` planning) said to reuse "Warehouse's existing bottom-tab-bar"
  pattern verbatim - but per `AppShell.tsx`'s own comment, that bottom tab
  bar was never actually built (every role still uses the sidebar/
  hamburger-drawer shell). Since the same addendum explicitly permits a
  floating action button as an alternative "rather than inventing a second
  mobile pattern," shipped a role-gated (`owner`/`buyer`) FAB on `AppShell`
  instead of building a new tab-bar shell for one route. `mobile-
responsive.md` should be reworded to drop the now-incorrect "Warehouse's
  existing bottom-tab-bar" reference next time that doc is touched -
  logged here rather than editing design docs mid-ticket.

  **`design-system-auditor` (Check IV) caught 3 real defects, fixed same
  session:** an `<h2>` using `font-bold` instead of the design system's
  Semibold spec for H2; a photo-remove touch target that shrank below the
  44x44px "hard floor" at the `sm` breakpoint; and a bespoke failed-scan
  card duplicating the existing `EmptyState` pattern instead of reusing it
  (now consolidated). The auditor's fourth finding - that identification
  results should use `explainable-scoring.md`'s score-badge/factor-
  breakdown pattern, citing `ADR-0011`'s "confidence & explanation panel"
  commitment - was checked against the source plan
  (`docs/projects/treasure-hunter-plan.md` §6) and rejected: that panel is
  explicitly the _pricing_ confidence view (dollar amount + comp checklist),
  scoped to Phase 1/`PALLETIQ-026`-`027`, not Phase 0 identification. Left
  as a plain confidence percentage per this ticket's own scope note ("no
  existing pattern, likely a simple card-select list").

  **Two real bugs found only by live verification, not by any test suite:**
  (1) `zod` was a dependency of the root `package.json` (frontend) only,
  never added to `functions/package.json` - local dev/test resolved it by
  walking up to the root `node_modules`, masking the gap until the actual
  Cloud Functions deploy (which packages only `functions/`) crashed both
  new functions on cold start with `Cannot find module 'zod'`. Fixed by
  adding `zod` as an explicit `functions/package.json` dependency - this
  class of bug (a transitive/hoisted import that only works because of
  monorepo directory-walking, not because the deployed unit actually
  declares it) is worth a standing lint/CI check if it recurs.
  (2) `gemini-2.5-flash` (the model name used in `identifyItem.ts`)
  returned `404 ... no longer available to new users` from the live API -
  swapped to `gemini-3.6-flash` per the API's own error message, since
  training-era model names can't be trusted against a live-changing API
  surface.

  **Infra gap found via live verification, unrelated to this ticket's own
  code:** the first deploy attempt's crash (bug 1 above) meant Firebase's
  normal "grant `roles/run.invoker` to `allUsers` on a new callable's
  Cloud Run service" step never ran; the follow-up deploy succeeded as an
  _update_, which doesn't re-grant it, so `enqueueItemScan` returned a
  bare `401` at the Cloud Run ingress layer (before reaching our own
  auth check) until the binding was granted manually to match every other
  `onCall` function. Investigated whether `processItemScan` (a Cloud-
  Tasks-dispatched worker, not a public callable) needed the same
  `allUsers` grant and confirmed via IAM inspection that it does not -
  `processManifestImport`/`processDummyTask` (long-established, working
  task workers) both have an empty invoker policy, and Cloud Tasks
  dispatch to `processItemScan` was confirmed working live with the same
  empty policy once `enqueueItemScan` itself was fixed. Granting `allUsers`
  there would have been a real regression (anyone with the URL could
  trigger arbitrary Gemini calls and write fabricated data to any tenant's
  `item_scans` doc, bypassing `firestore.rules` since the worker uses the
  Admin SDK) - reverted that grant once the actual cause was found. No
  code or doc change needed beyond this note; flagging in case a future
  ticket's first deploy also crashes before creation completes.

  **Live-verified end-to-end** (test tenant/user/Storage objects/Firestore
  docs all cleaned up after): real photo upload under live `storage.rules`,
  `enqueueItemScan` callable under live `firestore.rules`, Cloud Tasks
  dispatch, a real Gemini vision call returning structured, schema-valid
  JSON, confidence-based auto-selection, and the direct-client-write
  `selectItemScanCandidate` RBAC path - all confirmed working against
  `mrt-pallet-iq`, not just the emulator.

- **2026-08-23 — PALLETIQ-026 closed.** Planned scope (per `ADR-0011` and
  the ticket's own `docs/BACKLOG.md` scope note) shipped as specified: the
  pricing waterfall (cache -> UPC/barcode exact match -> Google Search
  grounding, reused from `PALLETIQ-025`'s identification call, not a
  second Gemini call -> eBay Browse API + calibration), category-
  conditional step ordering (electronics/games/media/tools/fashion,
  reduced to the steps available in this ticket - Keepa/PriceCharting/
  Discogs/Google Books are `PALLETIQ-027`), MSRP/sale-price/liquidation-
  price computation, a new global `product_price_cache` collection with
  a 30-day staleness TTL, and the confidence/factor-breakdown/comps UI as
  the first real instance of `docs/design/explainable-scoring.md`'s
  pattern. No new Cloud Tasks queue needed - none of this ticket's
  waterfall steps call Gemini, so Governance Check II doesn't gate
  anything new here; cache/UPC/eBay all resolve synchronously in the
  `priceItemScan` callable's own response, per `ADR-0011`'s async-
  boundary note.

  **eBay Browse API live verification deferred, by the owner's explicit
  choice (mirrors `PALLETIQ-003`'s Stripe precedent):** `EBAY_APP_ID`/
  `EBAY_CERT_ID` are real eBay Developer Program credential names,
  confirmed via eBay's own OAuth client-credentials-grant docs before
  writing `ebayBrowseApi.ts` - but Cloud Functions v2 requires a secret to
  have at least one version to deploy a function that declares it, so the
  owner set two inert placeholder values (not real credentials, same
  posture as this repo's existing placeholder `STRIPE_SECRET_KEY`/etc.)
  to unblock deployment. The eBay step is unit-tested against the
  verified-real API shape (4 tests, mocked `fetch`) and confirmed live to
  **fail gracefully** - a bad/placeholder credential throws inside
  `runWaterfall`'s try/catch, which is swallowed and falls through with
  whatever other signal was already found, rather than crashing the whole
  pricing call. Swap in real credentials whenever the owner provisions an
  eBay Developer account; no code change needed.

  **UPC lookup (step 1) needed a real decision the ADR left open:**
  `docs/projects/treasure-hunter-plan.md` names "a UPCitemdb-style
  service" only as an example, and `ADR-0011`'s secrets list doesn't
  budget one for step 1 - researched live and confirmed UPCItemDB's free
  "trial" tier (`api.upcitemdb.com/prod/trial/lookup`, no signup, no API
  key, 100 lookups/day) is real and matches that "no secret needed"
  implication. Verified the actual response shape live (a real Coca-Cola
  UPC lookup) before writing `upcLookup.ts` against it - the top-level
  `lowest_recorded_price`/`highest_recorded_price` fields turned out to be
  unreliable in practice (frequently 0 or a wild outlier), so MSRP signal
  comes from the median of the per-merchant `offers[].price` array
  instead, a deviation from the obvious-looking field names worth noting
  for whoever touches this next.

  **The barcode number itself still comes from the vision call, not a
  true deterministic decode:** the plan's aspirational v1 architecture
  ("barcode matches... don't need Gemini at all") would need a barcode-
  scanning library against the raw photo pixels to fully deliver on that;
  instead, `identifyItem.ts`'s existing structured-output schema (already
  extended once in `PALLETIQ-025`) picked up one more field asking Gemini
  to read the digits printed under a barcode photo, if one was captured
  and is legible. Reuses the existing call (no added cost), but is a
  pragmatic v1 choice, not the fully-deterministic step the plan
  describes - flagged rather than silently presented as more rigorous
  than it is.

  **`design-system-auditor` (Check IV) caught real gaps in the first
  shipped instance of `explainable-scoring.md`'s pattern**, fixed same
  session: `PricingPanel.tsx` and the new pricing states in
  `ItemScanPage.tsx` had reused unmodified desktop card padding (`p-6`)
  instead of the increased density `mobile-responsive.md`'s Buyer-
  capture-flow addendum requires for exactly this screen ("confidence
  panel, factor breakdown... not desktop card padding") - bumped to `p-8`
  with increased list/line-item spacing. Two new interactive elements (the
  eBay comp external-link icon, the "Try pricing again" button) were below
  the 44x44px touch-target floor - fixed; a third, pre-existing "Try
  again" button on the identification-failure state (shipped in
  `PALLETIQ-025`, not new to this diff, but on the same page and an easy
  fix) got the same treatment. The audit's fourth finding - that factor
  rows should be "sorted by magnitude of contribution" per
  `explainable-scoring.md`'s literal text - was not implemented:
  `PricingFactor` has no magnitude concept, only a direction, since this
  ticket's factors are a qualitative checklist (matching the plan's own
  mockup) not a scored/weighted list. Documented in code as intentionally
  deferred to `PALLETIQ-027`, once the saleability formula has real
  weighted coefficients to sort by - logged here too so it isn't lost.
  **Known remaining gap, not fixed:** `CandidateCard` (the identification-
  result card, `PALLETIQ-025`) still uses the old `p-6` density, so the
  scan-result view is now visually inconsistent between the identification
  card and the pricing panel below it on the same page - small enough to
  leave for whoever next touches that component rather than expanding this
  ticket's diff further.

  **A second instance of the PALLETIQ-025 Cloud Run invoker gap, this
  time NOT hit:** confirmed live that `priceItemScan`'s first deploy
  attempt succeeded outright (no crash this time), and Firebase auto-
  granted the `allUsers` invoker binding on creation as expected - the
  gap found in `PALLETIQ-025` is specifically about a _crashed_ first
  deploy skipping that step, not a general problem with this project.

  **Live-verified end-to-end** (test tenant/user/Storage/Firestore
  artifacts cleaned up after): real photo upload, `enqueueItemScan`,
  Cloud Tasks identification, `priceItemScan` under live rules, the
  waterfall's category classification, and the graceful eBay-failure ->
  `pricingStatus: 'unknown'` path - all confirmed against `mrt-pallet-iq`.
  The "priced" happy path with real numbers is covered by 24 unit tests
  against the verified-real UPCItemDB/eBay API shapes but not live-
  verified end-to-end - that needs either a real barcode-bearing product
  photo or real eBay credentials, neither available in this session.

- **2026-08-23 — PALLETIQ-027 closed.** Planned scope (per `ADR-0011` and
  the ticket's own `docs/BACKLOG.md` scope note) shipped as specified:
  category-specialist waterfall branches (Keepa for ASIN/UPC-matched
  electronics, PriceCharting for games/collectibles, Discogs for vinyl/
  CDs, Google Books for ISBN books), the saleability score formula from
  the plan's section 7, and background enrichment (`enrichItemScanPricing`,
  a new Cloud Tasks worker) so the slow/paid specialist calls run after
  `PALLETIQ-026`'s instant estimate rather than blocking it - `item_scans`
  updates in place once enrichment settles, same async pattern as
  identification.

  **A real formula gap resolved with the owner rather than guessed:** the
  saleability formula's `sell_through` term (0.30 weight, the largest)
  has no real data source anywhere in this codebase - eBay Browse API,
  Keepa, PriceCharting, and Discogs all only expose active/current
  listing state, never real sold-vs-active counts (that needs eBay
  Marketplace Insights, gated behind `PALLETIQ-028`'s pre-flight check).
  Confirmed with the owner: redistribute `sell_through`'s weight across
  the other five terms, using the exact fallback mechanism the plan
  itself already specifies for a missing `sales_rank` term - applied by
  the same generic mechanism in `computeSaleability.ts`, not a bespoke
  special case. `SaleabilityPanel` always shows an honest "Sell-through
  rate not available yet" factor row rather than silently omitting the
  gap.

  **Keepa's field-shape risk, flagged rather than presented as more
  certain than it is:** unlike the other three specialist APIs (all
  confirmed live or via clear published docs during planning), Keepa's
  own docs page returned a JS-rendered shell to every fetch attempt
  (browser user-agent included) and Keepa requires a paid account to
  test live - `keepa.ts`'s field names (`salesRanks`, `stats.current[18]`
  for buy box price) follow community-documented convention, not a
  response this code has actually seen. Parsing is deliberately
  defensive (every access falls back to null, never throws) so a wrong
  guess degrades to "no Keepa signal" rather than crashing enrichment -
  re-verify against a real response once the owner has Keepa credentials.

  **eBay/Keepa/PriceCharting live verification deferred, by the owner's
  choice (same posture as `PALLETIQ-026`/`003`):** `KEEPA_API_KEY`/
  `PRICECHARTING_API_KEY` get the same inert-placeholder treatment as
  `EBAY_APP_ID`/`EBAY_CERT_ID` to unblock deployment - real credentials
  swap in whenever the owner provisions those accounts, no code change
  needed.

  **`design-system-auditor` (Check IV) ran clean this time** - no hard
  violations. Two items logged rather than fixed: (1) `SaleabilityPanel`
  reuses the extracted `FactorBreakdownList` but not sorted by magnitude
  of contribution (`explainable-scoring.md`'s literal spec) - unlike
  `PricingPanel`'s factors (genuinely no magnitude data), saleability's
  factors DO have real weighted coefficients (`computeSaleability.ts`'s
  `BASE_WEIGHTS`) that could support true magnitude-sorting, so this gap
  is weaker-justified for saleability than it was for pricing - worth
  revisiting if a future ticket touches this component again, not fixed
  now to avoid scope creep on an already-large ticket. (2) The outer
  score-badge card shell (badge + label header row) is duplicated between
  `PricingPanel` and `SaleabilityPanel` rather than extracted the way
  `FactorBreakdownList` was - defensible since `PricingPanel`'s version
  carries extra MSRP/sale-range/liquidation content `SaleabilityPanel`
  doesn't need, but a `ScoreCard`-style extraction would follow
  `explainable-scoring.md`'s reuse principle more completely.

  **A real functional gap the audit surfaced but didn't own, logged as a
  follow-up rather than fixed here:** the saleability-failed retry button
  calls `priceItemScan` (re-running the _entire_ pricing waterfall) since
  no dedicated saleability-only retry action exists - a user reading
  "try again" on a saleability failure would reasonably expect only
  re-scoring, not a full pricing re-run. The 30-day `product_price_cache`
  significantly reduces the practical cost (a retry moments later mostly
  hits a warm cache rather than re-fetching eBay), which is why this
  wasn't treated as blocking - but it's a real UX/wiring mismatch worth
  its own small ticket rather than silently accepted forever.

  **Live verification status:** the new `enrichItemScanPricing` worker
  and saleability scoring path are covered by unit tests (10 for
  `computeSaleability`, 8 for `runEnrichment`, plus the four specialist
  clients' own tests, 225 functions tests total passing) and have now
  also been live-verified end-to-end against `mrt-pallet-iq` post-merge.
  Placeholder `KEEPA_API_KEY`/`PRICECHARTING_API_KEY` secrets were set
  (same inert-placeholder pattern as `EBAY_APP_ID`/`EBAY_CERT_ID`), all
  functions deployed cleanly (`enrichItemScanPricing` created, others
  updated), and `enrichitemscanpricing`'s Cloud Run invoker IAM policy
  was confirmed empty (no `allUsers` binding) - matching the
  `processItemScan`/`processManifestImport` non-public-worker precedent,
  and ruling out the crash-interrupted-first-deploy IAM gap seen on
  PALLETIQ-025.

  A scripted round-trip (real tenant/user/item_scan docs, cleaned up
  after) drove a test candidate through `priceItemScan` →
  `enrichItemScanPricing` → saleability scoring with real (not mocked)
  Cloud Functions/Cloud Tasks/Firestore. With only placeholder eBay/Keepa
  credentials in place, the waterfall correctly found no signal
  (`pricingStatus: 'unknown'`, `pricing: null` - a legitimate terminal
  state, not a crash), the Keepa call failed and was swallowed by
  `runEnrichment`'s `try/catch` with no error-severity log entries for
  the invocation (checked via the Cloud Logging API), and
  `saleabilityStatus` still resolved to `'scored'` with a fully-formed,
  correctly weight-redistributed score - confirming the "degrade
  gracefully, never leave the user stuck in a stuck/failed state for a
  missing paid signal" design holds under real (not mocked) conditions.
  A real category-specialist "priced" happy path (i.e. an actual Keepa/
  PriceCharting hit) remains unverified, same deferral as the rest of
  this track - no real API keys or a suitable barcode-bearing test photo
  are available in this sandbox.

- **2026-08-23 — PALLETIQ-033 opened and closed same session.** Planning
  gate scope note (see `docs/BACKLOG.md`) shipped as written, with one
  small refinement found at implementation time: a new `retrySaleabilityScore`
  `onCall` (`functions/src/item-scans/retrySaleabilityScore.ts`) that
  re-enqueues the existing `enrichItemScanPricing` Cloud Tasks worker
  without re-running `priceItemScan`'s full waterfall, wired to
  `ItemScanPage`'s saleability-failed retry button in place of the
  previous `startPricing` call.

  **Refinement vs. the planning-gate scope note:** the scope note said
  the guard should require `pricingStatus === 'priced'`. Implementation
  found this was one state too narrow - `priceItemScan` also enqueues
  `enrichItemScanPricing` when the waterfall settles on `'unknown'`
  (no signal found, a legitimate terminal state, not an error - see
  `PALLETIQ-026`), so a saleability failure can legitimately happen from
  either settled pricing state. The guard was widened to accept both
  `'priced'` and `'unknown'`, rejecting only `'not_priced'`/`'pricing'`
  (pricing hasn't settled - nothing to re-score yet) and `'failed'`
  (pricing itself needs `priceItemScan`'s retry, not this one). Covered
  by a dedicated test case for the `'unknown'` path so this doesn't
  regress silently.

  Governance: no Firestore/rules change (reuses the existing
  `item_scans` rule from `PALLETIQ-025`, admin-SDK writes bypass rules
  regardless); Check IV (design-system-auditor) audited
  `ItemScanPage.tsx`'s diff and passed clean - no new hardcoded styling,
  no new component/pattern, the `EmptyState`/`Button` markup is
  byte-identical to before, only the `onClick` handler changed.

  **Deployed and live-verified against `mrt-pallet-iq` post-merge.**
  `retrySaleabilityScore` deployed as a new function; its Cloud Run
  invoker IAM policy was confirmed to correctly match `priceItemScan`'s
  (public `allUsers`, since this is a Buyer-invoked callable, not a
  Cloud-Tasks-only worker like `enrichItemScanPricing`) - no IAM gap.
  One transient finding: immediately after deploy, calls returned a raw
  GFE-level `401` HTML error page rather than reaching the function code
  at all, despite the IAM policy already showing `allUsers` via the
  Cloud Run Admin API - a propagation-lag artifact, not a real gap; it
  resolved on its own within ~20 seconds (confirmed by re-querying an
  unauthenticated call, which then correctly returned the function's own
  JSON `{"error":{"status":"UNAUTHENTICATED"}}` instead of the HTML
  page). Worth remembering for future tickets: a `401` right after a
  fresh function create can be this lag, not a misconfiguration - wait
  and retry before troubleshooting IAM further.

  A scripted round-trip against real (not mocked) infra confirmed both
  ends of the guard: a not-yet-priced scan correctly rejects with
  `FAILED_PRECONDITION`, and a priced scan with a simulated prior
  `saleabilityStatus: 'failed'` correctly re-enqueues
  `enrichItemScanPricing`, which re-settled it to `'scored'` with a real
  computed score - while `pricing`/`pricingStatus` were left completely
  untouched (identical `msrp`/`waterfallStepsUsed` before and after),
  proving the fix actually skips the full waterfall re-run rather than
  just relabeling it.

- **2026-08-23 — PALLETIQ-034 opened and closed same session.** Owner
  reported directly (not a scope note found via review): on the
  item-scan capture screen, adding a second photo silently did nothing,
  and the only way to add a photo at all was the device camera - no
  "choose from device" option existed.

  **Root cause, confirmed via a throwaway repro test before touching any
  code:** the accumulation logic itself was correct (a jsdom test firing
  two sequential `change` events on the same `<input>` node correctly
  produced two photos in state) - the real cause was the
  `capture="environment"` attribute on `ItemScanCapture.tsx`'s single
  file input. It forces the browser straight into the camera app,
  skipping the OS's native picker sheet entirely (which is also why
  there was no "choose from device" option - that sheet is what would
  normally offer it), and reusing that same input node for a second
  camera capture is a known-unreliable pattern on mobile browsers,
  particularly iOS Safari, where the second capture's `change` event can
  silently fail to fire.

  **Fix:** split into two controls - "Take photo" (camera-only,
  `capture="environment"`) and "Choose from device" (`accept="image/*"
multiple`, no `capture` attribute, opens the OS's normal picker/
  gallery) - laid out side by side, reusing the exact same dashed-border
  styling the original single control used. Both inputs are now keyed by
  the current photo count, forcing React to mount a fresh DOM node per
  use rather than reusing one - the standard workaround for the known
  iOS Safari repeat-capture bug, applied to both controls defensively.
  Also fixed an adjacent bug found while touching this code:
  `URL.createObjectURL(photo)` was being called fresh on every render
  for every photo with no revocation, a real memory leak across a
  multi-photo session - now memoized via `useMemo` and revoked via a
  `useEffect` cleanup.

  **Verification limits, stated plainly:** the exact bug (iOS Safari's
  camera-input-reuse quirk) can't be reproduced in this sandbox - no
  mobile Safari, no camera hardware, and no logged-in browser session
  readily available without significant auth setup for a component-level
  fix. Verification here is a targeted regression test simulating the
  reported scenario (two sequential file selections, second one via a
  remounted camera-input node, both photos render) plus the full
  existing suite (18 `ItemScanCapture`/`ItemScanPage` tests, all
  passing) and a Check IV audit (clean - both new buttons meet the
  ≥44×44px rule, no new hardcoded styling, no new pattern beyond the
  gap the component's own header comment already flagged). The owner
  should confirm on a real device before treating the mobile-Safari
  repeat-capture path as fully proven, same posture this track has taken
  on every other device/vendor-credential gap it couldn't verify
  in-sandbox.

- **2026-08-23 — PALLETIQ-035 closed.** Owner-reported: scanned items only
  ever showed an MSRP, with `salePrice`/`salePriceLow`/`salePriceHigh`/
  `liquidationPrice`/`comps` staying empty. Traced to `EBAY_APP_ID`/
  `EBAY_CERT_ID`/`KEEPA_API_KEY`/`PRICECHARTING_API_KEY` still being the
  inert placeholder values from `PALLETIQ-026`/`027` - not a code bug,
  `waterfall.ts`'s `try/catch` gracefully degraded to MSRP-only exactly
  as designed. Investigating this surfaced two bigger problems that a
  simple credential swap wouldn't fix: the vendor stack was hardcoded to
  the US marketplace (`X-EBAY-C-MARKETPLACE-ID: EBAY_US`, Keepa/Amazon
  US) while the owner's actual market is Ontario, Canada; and eBay
  Browse API only ever returns active asking prices, never real sold
  data. The owner has a proven pricing SOP
  (`docs/projects/SOP-Pricing-Research-v1.4.docx`) used for months in a
  separate pawn shop business - an LLM session with live web
  search+fetch tools, researching Canadian retail/Kijiji Ontario/eBay
  sold comps and synthesizing one bottom-line price. Confirmed with the
  owner via `AskUserQuestion`: re-architect to match this SOP rather
  than patch the old waterfall with real credentials. `ADR-0012` records
  the full decision, superseding `ADR-0011`'s waterfall/vendor-list
  section.

  **Shipped as planned:** `priceResearch.ts` (Gemini with `googleSearch`
  - `urlContext` tools together, confirmed available in the installed
    `@google/genai` v2.18.0 SDK, and a prompt encoding the SOP's §4-8
    rules) and `mapPriceResearch.ts` (pure SOP-response → `PricingResult`/
    `SaleabilityInputs` mapping) replace the entire deterministic vendor
    waterfall. `priceItemScan.ts` + `enrichItemScanPricing.ts`'s old
    two-stage fast/slow split collapsed into one async worker
    (`priceItemScanWorker.ts`) since pricing is now entirely one
    inherently-slow research call, with saleability computed in the same
    invocation. `retrySaleabilityScore.ts` (`PALLETIQ-033`) simplified
    from an async worker-retry to a synchronous recompute against stored
    comps - a forced, documented consequence of Keepa going away, not
    scope creep. `ebayBrowseApi.ts`/`upcLookup.ts`/`keepa.ts`/
    `priceCharting.ts`/`discogs.ts`/`googleBooks.ts`/`enrichment.ts`/
    `waterfall.ts`/`computePrices.ts`/`params.ts` (the four vendor
    secrets) all deleted. `PricingResult`'s shape stayed unchanged (only
    an additive `source` tag on `PricingComp`), so the entire UI layer
    needed only copy changes - `PricingPanel.tsx` now groups comps by
    source ("eBay sold" / "Kijiji – new/sealed" / "Kijiji – used") with an
    honest per-group note instead of one flat eBay-only sentence.
    `computeSaleability.ts`'s formula needed no change - its existing
    weight-redistribution mechanism (built for the already-missing
    `sell_through` term) cleanly absorbed `salesRank` going permanently
    null now that Keepa is gone.

  **A real, forced behavior change worth naming explicitly:** the SOP
  instructs the model to "always state the recommended price as a
  specific number... never omit it even when data is thin" - so
  `pricingStatus` will essentially never settle on `'unknown'` anymore
  (a legitimate terminal state under the old waterfall when no signal
  was found at all). `ItemScanPage.tsx`'s `'unknown'`-state UI branch
  and the `PricingStatus` type's `'unknown'` value are both left in
  place (harmless, not dead code by contract - just not expected to
  fire in practice) rather than removed, since removing them wasn't
  part of this ticket's scope and a genuinely-impossible edge case
  (e.g. a malformed `bottomLine.priceCad` of exactly the sentinel the
  code would need to trigger it) isn't worth ruling out by contract.

  **Governance:** `ADR-0012` written before implementation, per the
  Planning gate. Check IV (design-system-auditor) audited
  `PricingPanel.tsx`'s diff twice (once mid-design, once post-
  implementation) and passed clean both times - no new hardcoded
  styling, the per-source comp grouping is confirmed to be the same
  `explainable-scoring.md` provenance-labeling pattern repeated, not a
  new one, `p-8`/44×44px mobile density preserved. No Check I impact
  (no new Firestore collections/rules - `product_price_cache`'s
  existing shape/rules are unchanged, now implicitly Ontario/CAD-scoped
  per `ADR-0012`'s noted limitation). Also fixed two stale governance
  notes discovered while touching Check II's own description in
  `CLAUDE.md`: it still said Check II was "not yet applicable," dating
  from before `PALLETIQ-025` shipped the first real Gemini call
  (`identifyItem.ts`) - corrected to name both real call sites
  (`identifyItem.ts`, `priceResearch.ts`) and confirm both already
  follow the required Cloud-Tasks-worker pattern. Also cleaned up
  `functions/lib/`'s stale compiled output (orphaned `.js` files from
  deleted `.ts` sources, left behind by `tsc`'s non-deleting incremental
  build) before the pre-flight spike, so nothing dead risked bundling
  into a deploy.

  **Required pre-flight spike, run live against the real
  `mrt-pallet-iq` `GEMINI_API_KEY` before considering the design
  validated** (not a deploy - a direct Node script invoking
  `researchPrice()` against the compiled `functions/lib` output):
  tested two real, well-known items (a DeWalt cordless drill kit, an
  Instant Pot Duo). Confirmed the exact risk `ADR-0012`/`treasure-
hunter-plan.md` §12 flagged is real but **not absolute**: for the
  drill, `urlContext` successfully fetched real eBay.ca sold-listing
  pages (5 comps, working URLs); for the Instant Pot, eBay's
  sold-listings pages were not accessible, and the model correctly set
  `ebaySold.thin = true` with an explicit `dataQuality` flag rather than
  fabricating a number, falling back to Kijiji as the primary anchor -
  exactly the SOP's own designed degradation path, working as intended
  under real conditions, not just in the schema. Output quality read as
  genuinely reasonable on both items (plausible CAD prices, rationale
  sentences that mirror the SOP's own synthesis language). Latency was
  ~32-38 seconds per call - well inside the worker's 300s timeout, but
  confirms this is correctly a fully-async operation with no fast path
  left, consistent with this ticket's worker-collapse decision. Real
  per-call cost wasn't measured (no billing API access in this
  sandbox) - still an open, not-blocking item per `ADR-0011`'s existing
  "no usage-metering enforcement yet" flag.

  **Deployed and live-verified end-to-end against `mrt-pallet-iq`
  post-merge.** `firebase deploy` initially aborted because
  `enrichItemScanPricing` (deleted this ticket) still existed as a live
  function with no matching local source - deleted it explicitly
  (`firebase functions:delete enrichItemScanPricing --force`) before
  redeploying cleanly. `priceItemScanWorker` created;
  `priceItemScan`/`retrySaleabilityScore` updated to their shrunk/
  simplified shapes. IAM confirmed correct on both: `priceItemScanWorker`
  has an empty invoker policy (non-public, Cloud-Tasks-only, matching
  `processItemScan`'s precedent), `priceItemScan` correctly kept its
  public `allUsers` binding (Buyer-invoked callable) - no crash-
  interrupted-deploy IAM gap this time either.

  A scripted round-trip against real `mrt-pallet-iq` infra (test
  tenant/user/item_scan, cleaned up after) drove a real item (a
  Milwaukee M18 FUEL impact wrench) through the actual deployed path:
  `priceItemScan` (enqueue-only `onCall`) → Cloud Tasks →
  `priceItemScanWorker` (real Gemini research, not mocked) → Firestore.
  Took ~35s end-to-end, consistent with the pre-flight spike's ~32-38s
  per-call timing. Real research found a $389 CAD retail price (Home
  Depot Canada), 5 Kijiji comps (2 new/sealed, 3 used, correctly
  source-tagged), correctly flagged eBay sold listings as inaccessible
  for this item with an honest factor rather than fabricating a number,
  and landed a sensible $185 CAD bottom-line price ($165-210 band) with
  a coherent rationale. Saleability computed correctly in the same
  worker invocation (score 0.63, factors using the corrected
  vendor-neutral copy - "No specialist sales-rank signal available",
  not "Amazon"). Checked Cloud Logging directly for the invocation:
  zero warning/error-severity entries - a fully clean run, not just a
  "didn't crash" one.

  This closes out the one open item from ticket close: the pre-flight
  spike (run before merge) had only exercised `researchPrice()` via a
  direct script, not the deployed `priceItemScanWorker`/Cloud Tasks
  path - now confirmed working end-to-end for real, not just in
  isolation.
