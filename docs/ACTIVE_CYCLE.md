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

## Tickets in flight

_(PALLETIQ-013 and PALLETIQ-018 closed this update — see Drift notes. Nothing
currently in flight.)_

## Blockers

None currently open. Both prior blockers (Auth never initialized, Storage
never provisioned) were manually resolved via the Firebase console and are
now wired into the repo — see Drift notes.

**Note for `PALLETIQ-002`:** Auth is enabled with Email/Password only. If a
second sign-in method (e.g. Google) turns out to be needed, that's additional
console configuration, not something this repo's automation can add.

## Drift notes

_Recorded at ticket close per the governance model: where implementation
diverged from the plan, and why. Feed anything with lasting scope impact
back into `docs/BACKLOG.md` or `docs/ROADMAP.md`._

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
