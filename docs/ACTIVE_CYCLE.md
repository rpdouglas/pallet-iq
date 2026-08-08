# Active Cycle

Template — fill in at the start of each cycle. Sits alongside
`docs/BACKLOG.md` (ticket detail) and `docs/ROADMAP.md` (phase-level
status). See `docs/GOVERNANCE.md` for the 3-phase gate model this cycle is
run against.

## Cycle goal

Get a real Firebase project provisioned and wired into the repo so Phase 0
tickets (PALLETIQ-002–005) have somewhere to actually deploy against.
(Unchanged this update — still blocked, see Blockers.)

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

## Tickets in flight

| ID           | Title                                                       | Status      | Notes                                                  |
| ------------ | ----------------------------------------------------------- | ----------- | ------------------------------------------------------ |
| PALLETIQ-013 | Provision Firebase project + wire real project ID into repo | In Progress | Waiting on project creation (owner has console access) |

## Blockers

- PALLETIQ-013 needs a Firebase/GCP project created via console or CLI by
  someone with Google account + billing access — not something this repo's
  automation can do on its own.
- GitHub branch protection on `main` (require PR + CI status checks, no
  required approvals) is documented in `CONTRIBUTING.md` but not yet applied —
  needs a personal access token with `administration:write`, which the
  Codespaces default token doesn't have. Until applied, PR#2's hook is the
  only thing preventing a direct push to `main`.

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
