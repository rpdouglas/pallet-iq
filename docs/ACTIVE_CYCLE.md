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

_(PALLETIQ-013 closed this update — see Drift notes. Nothing else currently
in flight.)_

## Blockers

- **Firebase Authentication has never been initialized on `mrt-pallet-iq`**
  (no config exists yet — confirmed via the Identity Toolkit Admin API). This
  blocks `PALLETIQ-002` (auth custom claims). Needs a one-time manual step in
  the Firebase console (Authentication → Get Started → enable Email/Password),
  since there's no API-only path that doesn't risk provisioning the wrong
  product tier — not something this repo's automation can do on its own.
- **Cloud Storage has never been provisioned on `mrt-pallet-iq`** (no bucket
  exists, confirmed via the Storage API, despite the web SDK config
  referencing a default bucket name). Blocks `PALLETIQ-018`. Also needs a
  manual console step (Storage → Get Started), matching Firestore's
  `northamerica-northeast1` location per the decision recorded below.

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
