---
name: close-ticket
description: Close a PalletIQ ticket through the Ticket-close gate - diffs shipped work against the ticket's planned scope, records drift in ACTIVE_CYCLE.md, folds lasting-impact changes back into BACKLOG.md/ROADMAP.md, and updates ticket/phase status. Use when a ticket is done or ready to close, or when asked to close out a specific PALLETIQ-NNN.
---

# Close ticket

Walks a ticket through the Ticket-close gate in `docs/GOVERNANCE.md`: "Compare what
shipped against what was planned. Drift ... must be written down. Record drift notes
in `docs/ACTIVE_CYCLE.md` ... Update the ticket's status in `docs/BACKLOG.md` and, if
it completes a phase, update the phase status in `docs/ROADMAP.md`."

## Steps

1. **Verify the gate criteria are met first.** Don't close a ticket that hasn't
   earned it:
   - Run the `pre-pr-check` skill if it hasn't already passed this session for the
     current change set.
   - Confirm the QA/Verification criteria for the ticket's phase, from
     `docs/projects/PROJ-PALLETIQ.md`, actually pass. Quote the relevant criteria and
     state explicitly how each was verified (test run, manual check, etc.) — don't
     just assert it passes.
     If either isn't clean, stop and report what's blocking, rather than closing anyway.

2. **Pull the original plan.** Find the ticket's row in `docs/BACKLOG.md` and its
   scope bullets (from when `open-ticket` opened it, or from the conversation/PR
   description if opened before this skill existed) plus any linked ADR.

3. **Diff shipped vs. planned.** Identify drift: anything that changed scope,
   approach, or assumptions from the original plan. Drift is expected on nontrivial
   work, not a failure — but it must be written down, not silently absorbed.

4. **Record drift notes** in `docs/ACTIVE_CYCLE.md`'s "Drift notes" section, one
   entry per ticket closed this way, referencing the ticket ID.

5. **Fold forward lasting impact.** Any drift item that changes future scope (a
   follow-up needed, a collection that turned out to need different rules, an
   assumption that affects a later phase) becomes a new/adjusted row in
   `docs/BACKLOG.md` and/or a note in `docs/ROADMAP.md`. Don't let scope-changing
   drift disappear into a note nobody reads again.

6. **Update status.** Flip the ticket's `Status` to `Done` in `docs/BACKLOG.md`. If
   this ticket was the last one open in its phase, update that phase's status marker
   (⚪/🟡/🟢) in `docs/ROADMAP.md`.

7. **Update `docs/ACTIVE_CYCLE.md`'s "Tickets in flight" table** — remove the closed
   ticket's row, or mark it done per that table's convention.

8. **Commit these doc updates on the same feature branch as the ticket's
   implementation** (steps 4–7 are all doc edits — `docs/ACTIVE_CYCLE.md`,
   `docs/BACKLOG.md`, `docs/ROADMAP.md`). They land on `main` through the same PR,
   not as a separate direct commit — per `CONTRIBUTING.md`, nothing commits straight
   to `main`. If the PR from `pre-pr-check` already merged before this bookkeeping was
   done, open a small follow-up PR for just these doc changes rather than pushing
   directly.

9. **Report a summary**: ticket ID, what shipped, drift recorded (if any), and any
   backlog/roadmap changes made as a result.
