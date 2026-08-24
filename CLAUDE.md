# CLAUDE.md

Guidance for Claude Code sessions working in this repo.

## Governance

PalletIQ uses docs-as-code governance — see [`docs/GOVERNANCE.md`](docs/GOVERNANCE.md)
for the full model. Read it before starting any ticket-scoped work. Summary:

Every ticket moves through three gates, none skippable: **Planning** (ticket in
`docs/BACKLOG.md` with Phase/Persona/Priority, scope bounded in/out, ADR first if
architecturally significant) → **Autonomous execution** (stay in scope; anything
discovered mid-flight is drift, logged not absorbed; the ticket's phase
QA/Verification criteria in `docs/projects/PROJ-PALLETIQ.md` must pass) →
**Ticket close** (diff shipped vs. planned, record drift in `docs/ACTIVE_CYCLE.md`,
fold lasting-impact changes back into `docs/BACKLOG.md`/`docs/ROADMAP.md`).

Three standing checks apply across every phase:

- **Check I — Rules parity.** Every Firestore collection needs an explicit
  tenant-isolation (+role-based where relevant) block in `firestore.rules` AND at
  least one passing/failing test pair in `firestore.rules.test.ts` proving
  cross-tenant denial. **Known live gap:** `firestore.rules` defines ~20 collections
  but `firestore.rules.test.ts` currently has only 6 tests (4 tenant-isolation + 2
  `product_intelligence`) — most collections don't have their own pair yet.
- **Check II — Async AI boundary.** No Gemini/Vertex call happens inline on a
  user-facing request path; AI work is queued (Cloud Tasks/Pub-Sub) and polled/pushed
  back. Applicable and enforced since `PALLETIQ-025`: all three real Gemini call
  sites (`functions/src/gemini/identifyItem.ts`, item identification;
  `functions/src/pricing/priceResearch.ts`, `PALLETIQ-035`'s SOP-modeled pricing
  research; `functions/src/listing-copy/generateListingCopy.ts`, `PALLETIQ-030`'s
  listing-copy generation) only ever run inside `onTaskDispatched` Cloud Tasks
  workers (`processItemScan.ts`, `priceItemScanWorker.ts`, `listingCopyWorker.ts`)
  — never inline in an `onCall`. This note went stale for a few tickets after
  `PALLETIQ-025` first shipped a real Gemini call; corrected during `PALLETIQ-035`'s
  close-out rather than left inaccurate. Now enforced by the `async-ai-boundary-auditor`
  subagent (built at `PALLETIQ-030`) rather than manual review alone.
- **Check III — RBAC in UI and rules.** A permission boundary enforced only in
  Firestore rules and not reflected in the UI (or vice versa) is incomplete. Not yet
  applicable — no role-gated UI exists yet (pre PALLETIQ-002/006).
- **Check IV — Design system adherence.** UI code follows `docs/design/` tokens and
  patterns — no unapproved hardcoded colors/fonts, denied-role fields omitted from
  the DOM (not CSS-hidden), new components reuse a documented pattern before
  inventing a new one. See ADR-0002. **Known live gap:** `src/App.tsx` already uses
  default Tailwind slate colors instead of any design-system token — no token
  system exists yet for compliant code to use (tracked as `PALLETIQ-016`).

## Document map

| File                             | Purpose                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| `docs/ROADMAP.md`                | Phase-level status (Phase 0–4)                                 |
| `docs/BACKLOG.md`                | Ticket-level backlog across all phases                         |
| `docs/ACTIVE_CYCLE.md`           | Current cycle's goal, in-flight tickets, blockers, drift notes |
| `docs/projects/PROJ-PALLETIQ.md` | Canonical product spec — source of truth for scope             |
| `docs/personas/`                 | Role definitions and permission boundaries (RBAC input)        |
| `docs/adr/`                      | Architecture Decision Records                                  |
| `docs/design/`                   | Design system + addenda — source of truth for UI (Check IV)    |

## Conventions

- **Never commit or push directly to `main`.** Always work on a feature
  branch (`git checkout -b palletiq-NNN-short-slug`) and land changes via PR
  — see [`CONTRIBUTING.md`](CONTRIBUTING.md#branching). This applies to every
  change, including docs-only edits like backlog/roadmap updates. A session
  hook (`.claude/hooks/git-branch-guard.py`) blocks direct `git commit`/`git
push` to `main`/`master` as a guardrail, but don't rely on it — branch
  first, as a matter of habit, not because the hook will catch it.
- Ticket IDs are `PALLETIQ-NNN`, allocated sequentially, never reused — check
  `docs/BACKLOG.md` for the highest existing ID before minting a new one.
- Roles are `owner | manager | warehouse | buyer` (`src/types/auth.ts`). This type,
  the role helpers in `firestore.rules` (`hasRole`/`isOwnerOrManager`/`isOwner`), and
  `docs/personas/*.md` are one contract — keep them in sync, don't edit one in
  isolation.

## Skills

- **`open-ticket`** — walk a new ticket through the Planning gate.
- **`new-adr`** — scaffold a new Architecture Decision Record.
- **`pre-pr-check`** — run the CONTRIBUTING.md checklist plus governance Checks
  I/II/III/IV before opening a PR or closing a ticket. Hands off to
  `close-ticket` (if applicable) before pushing, so closing docs land in the
  same PR as the implementation.
- **`close-ticket`** — walk a ticket through the Ticket-close gate. Runs
  _before_ the PR is pushed/opened, not after it merges.

## Subagents

- **`firestore-rules-auditor`** — audits Check I (rules/tests parity). Invoke after
  any change to `firestore.rules`, `firestore.rules.test.ts`, or code introducing a
  new Firestore collection.
- **`design-system-auditor`** — audits Check IV (design system adherence). Invoke
  after any change under `src/` touching components, pages, or styles.
- **`async-ai-boundary-auditor`** — audits Check II (async AI boundary). Built at
  `PALLETIQ-030` once a third real Gemini call site landed (`identifyItem.ts`,
  `priceResearch.ts`, `generateListingCopy.ts`). Traces every Gemini/Vertex call
  site to its enclosing exported Cloud Function and confirms it's a Cloud-Tasks-
  dispatched worker, never a direct `onCall`/`onRequest`. Invoke after any change
  introducing or touching a Gemini/Vertex call site.

`rbac-parity-auditor` (Check III) is not built yet. It now has a real trigger
condition too — role-gated UI exists as of `PALLETIQ-011` (inventory) and
`PALLETIQ-030` (the first Manager-only page) — but manual review has been
sufficient so far; worth building once a third role-gated surface lands or manual
review starts missing things, same bar `async-ai-boundary-auditor` just cleared.
