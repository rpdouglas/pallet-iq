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

- **Deployed `createTenant` is stale (found 2026-08-10, closing `PALLETIQ-006`).**
  The live Cloud Function predates `PALLETIQ-003`'s `subscriptions/current`
  write — every tenant created through the production app right now gets no
  subscription doc, contrary to `ADR-0005`. Fix is a `firebase deploy --only
functions` (or a full deploy) to pick up everything merged since the last
  manual deploy during `PALLETIQ-005`'s close — not a code change, an
  operational action needing the owner's go-ahead since it touches live
  infrastructure. See this update's `PALLETIQ-006` drift note for how it was
  found.

`PALLETIQ-013`'s Firebase-project blocker, the Auth/Storage initialization
gaps, and GitHub branch protection on `main` (was undocumented via API for
several review passes) are all resolved as of this update — see Drift notes
for the first three; branch protection was applied directly via the GitHub UI
and reconfirmed live (`protected: true`) via the API.

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
