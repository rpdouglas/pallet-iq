# Active Cycle

Template — fill in at the start of each cycle. Sits alongside
`docs/BACKLOG.md` (ticket detail) and `docs/ROADMAP.md` (phase-level
status). See `docs/GOVERNANCE.md` for the 3-phase gate model this cycle is
run against.

## Cycle goal

Get a real Firebase project provisioned and wired into the repo so Phase 0
tickets (PALLETIQ-002–005) have somewhere to actually deploy against.

## Tickets in flight

| ID           | Title                                                       | Status      | Notes                                                  |
| ------------ | ----------------------------------------------------------- | ----------- | ------------------------------------------------------ |
| PALLETIQ-013 | Provision Firebase project + wire real project ID into repo | In Progress | Waiting on project creation (owner has console access) |

## Blockers

- PALLETIQ-013 needs a Firebase/GCP project created via console or CLI by
  someone with Google account + billing access — not something this repo's
  automation can do on its own.

## Drift notes

_Recorded at ticket close per the governance model: where implementation
diverged from the plan, and why. Feed anything with lasting scope impact
back into `docs/BACKLOG.md` or `docs/ROADMAP.md`._
