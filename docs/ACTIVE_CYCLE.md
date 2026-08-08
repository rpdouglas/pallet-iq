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

## Tickets in flight

_(PALLETIQ-013 and PALLETIQ-018 closed this update — see Drift notes. Nothing
currently in flight.)_

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
