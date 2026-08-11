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
