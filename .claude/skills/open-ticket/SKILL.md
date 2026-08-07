---
name: open-ticket
description: Open a new PalletIQ ticket through the Planning gate - assigns the next PALLETIQ-NNN ID, records Phase/Persona/Priority, bounds scope in/out, flags Firestore/RBAC impact, and triggers an ADR if the decision is architecturally significant. Use when starting new ticket-worthy work or when asked to add/open/plan a ticket.
---

# Open ticket

Walks a new ticket through the Planning gate in `docs/GOVERNANCE.md`: "Before any
code changes: the ticket exists in `docs/BACKLOG.md` with a Phase, Persona, and
Priority. Scope is bounded — what's in, what's explicitly out. For anything touching
Firestore schema, security rules, or RBAC boundaries, the plan states which
collections/roles are affected. Architecturally significant decisions get an ADR
before implementation starts, not after."

## Steps

1. **Mint the ID.** Read `docs/BACKLOG.md`, find the highest existing `PALLETIQ-NNN`,
   use the next number. IDs are never reused, even for abandoned tickets.

2. **Confirm the basics.** Title (concise, imperative); Persona — one of Buyer,
   Warehouse, Store Manager, Owner/Admin, cross-checked against `docs/personas/`;
   Phase — cross-checked against `docs/ROADMAP.md` and the relevant phase section in
   `docs/projects/PROJ-PALLETIQ.md`; Priority — P0 (blocking) / P1 / P2. If any of
   these is ambiguous, ask rather than guessing.

3. **Bound the scope.** Write explicit in-scope and out-of-scope bullets. This is the
   baseline the `close-ticket` skill will later diff shipped work against, so be
   concrete enough that "did this stay in scope?" has an obvious answer later.

4. **Flag Firestore/RBAC impact.** If the ticket touches Firestore schema, security
   rules, or RBAC boundaries, name the specific collections and roles affected. This
   is what `firestore-rules-auditor` will later check for parity.

5. **ADR check.** If the ticket involves an architecturally significant decision
   (new data model shape, a tradeoff with real alternatives, something future work
   will build on), invoke the `new-adr` skill now and get the ADR written *before*
   proceeding — per the governance model, the ADR must land before implementation
   starts, not be backfilled after. Link the resulting ADR path in the ticket entry.
   Most tickets won't need this — don't force one.

6. **Append to `docs/BACKLOG.md`.** Add a new row to the table: `| PALLETIQ-NNN |
   Title | Persona | Phase | Planned | Priority |`. Keep the table's existing column
   formatting.

7. **Stop there.** Do not add the ticket to `docs/ACTIVE_CYCLE.md`'s "Tickets in
   flight" table — moving a ticket into the active cycle is a separate, deliberate
   decision, not an automatic side effect of opening it. Mention this to the user if
   they seem to expect it to start immediately.
