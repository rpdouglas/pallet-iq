# Governance

PalletIQ uses docs-as-code governance: the state of the project lives in
`docs/`, not in tribal knowledge or chat history. This file documents the
workflow explicitly so it's discoverable by anyone (human or agent) picking
up work in this repo.

## The 3-phase gate model

Every ticket moves through three gates. None of them are skippable.

### 1. Planning

Before any code changes:

- The ticket exists in `docs/BACKLOG.md` with a Phase, Persona, and Priority.
- Scope is bounded — what's in, what's explicitly out.
- For anything touching Firestore schema, security rules, or RBAC
  boundaries, the plan states which collections/roles are affected.
- Architecturally significant decisions get an ADR (`docs/adr/`) before
  implementation starts, not after.

### 2. Autonomous execution

- Implementation proceeds against the agreed plan.
- Work stays inside the ticket's stated scope. Scope discovered mid-flight
  (a needed refactor, a missing rule, an untested collection) gets logged as
  drift, not silently absorbed.
- No collection ships without a corresponding `firestore.rules` block _and_
  a `firestore.rules.test.ts` case (**Check I** — see below). This applies
  at every phase, not just Phase 0.
- QA/Verification criteria from the ticket's project spec
  (`docs/projects/PROJ-*.md`) must pass before the ticket is considered done.

### 3. Ticket close with drift detection

- Compare what shipped against what was planned.
- **Drift** = anything that changed scope, approach, or assumptions from the
  original plan. Drift isn't a failure — it's expected on nontrivial work —
  but it must be written down.
- Record drift notes in `docs/ACTIVE_CYCLE.md` for the current cycle, and
  fold anything that changes future scope back into `docs/BACKLOG.md` or
  `docs/ROADMAP.md`.
- Update the ticket's status in `docs/BACKLOG.md` and, if it completes a
  phase, update the phase status in `docs/ROADMAP.md`.

## Governance checks

Standing checks that apply across every phase of `docs/projects/PROJ-PALLETIQ.md`:

- **Check I — Rules parity.** Every Firestore collection has explicit
  tenant-isolation (+ role-based, where relevant) rules in `firestore.rules`
  and at least one passing/failing pair of tests in
  `firestore.rules.test.ts` proving cross-tenant denial. A collection
  without both is not shippable.
- **Check II — Async AI boundary.** No Gemini/Vertex call happens inline on
  a user-facing request path. AI work is queued (Cloud Tasks/Pub-Sub) and
  results are polled or pushed back to the client.
- **Check III — RBAC in UI and rules.** A permission boundary enforced only
  in Firestore rules and not reflected in the UI (or vice versa) is
  incomplete. Both layers must agree.

## Document map

| File                             | Purpose                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| `docs/ROADMAP.md`                | Phase-level status (Phase 0–4), updated at phase boundaries    |
| `docs/BACKLOG.md`                | Ticket-level backlog across all phases                         |
| `docs/ACTIVE_CYCLE.md`           | Current cycle's goal, in-flight tickets, blockers, drift notes |
| `docs/projects/PROJ-PALLETIQ.md` | Canonical product spec — source of truth for scope             |
| `docs/personas/`                 | Role definitions and permission boundaries (RBAC input)        |
| `docs/adr/`                      | Architecture Decision Records                                  |
