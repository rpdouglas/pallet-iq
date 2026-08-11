# ADR-0007: Inventory lifecycle tracking and auto-creation from line items

**Status:** Proposed
**Date:** 2026-08-11

## Context

`PALLETIQ-011` needs "basic inventory lifecycle tracking (Purchased →
Received → Listed → Sold)" - Phase 1's narrowed version of what
`docs/projects/PROJ-PALLETIQ.md`'s Phase 3 section later expands into
"full inventory workflow (+ Returned), barcode scanning, mobile receiving,
bin locations." That Phase 3/Phase 1 boundary matters for scoping this
ticket correctly: `PALLETIQ-010`'s own scope note assumed Warehouse's
mobile-first bottom-tab-bar nav (`docs/design/mobile-responsive.md`) would
be built as part of `PALLETIQ-011` "once real mobile scanning screens
exist" - but barcode scanning and mobile receiving are explicitly Phase 3
bullets, not Phase 1's "basic" one. That assumption was wrong; this ADR
corrects it. `PALLETIQ-011` stays inside the existing desktop `AppShell`
(`PALLETIQ-010`), not a new mobile-first surface.

Two real questions needed answers before implementation could start:

1. **Where do inventory records come from?** The data model
   (`docs/projects/PROJ-PALLETIQ.md`) lists `pallets` and `inventory` as
   separate collections, and `manifests/{id}/lineItems` (`PALLETIQ-008`)
   already holds normalized, successfully-imported purchase records. Does
   something need to explicitly "convert" a line item into inventory, or
   does a completed purchase (a line item that imported successfully) just
   _become_ trackable inventory automatically?
2. **Who can advance an item through the lifecycle?** The persona docs
   give three different roles a write need on `inventory` -
   `docs/personas/warehouse.md` ("Write: inventory status transitions
   (Received, receiving reconciliation)..."), `docs/personas/
store-manager.md` ("Write: inventory (listing/pricing/status
   transitions)..."), `docs/personas/owner-admin.md` ("Read/Write:
   everything") - each implying a _specific_ transition (Warehouse →
   Received; Manager → Listed/Sold). Should the UI/rules enforce which
   role can perform which specific transition, or is a simpler "these
   three roles can all write, Buyer can't" boundary the right scope for
   "basic" tracking?

## Decision

**Auto-creation, not manual conversion.** `processManifestImport`
(`PALLETIQ-008`'s Cloud Tasks worker) writes one `inventory` doc per
successful line item, in the same batch as the `lineItems` write, with
`status: 'purchased'`. A successfully-imported line item already
represents money spent on a real physical item - there's no meaningful
intermediate state where it's "purchased but not yet inventory." This
also means no new UI is needed just to get an item _into_ the lifecycle;
`PALLETIQ-011`'s UI only handles moving items _through_ it.
`inventory` docs reference their source (`lineItemId`, `manifestId`,
`vendorId`) rather than duplicating landed-cost calculation - landed cost
stays computed on read from the parent import's `freightCost`/`otherFees`
(`PALLETIQ-009`'s `src/lib/manifests/landedCost.ts`), not persisted here
either. `PALLETIQ-011`'s own UI doesn't surface landed cost at all
(`unitCost` only) to keep this ticket's scope to status tracking, not a
second landed-cost display surface.

**Permissive collection-level write, not per-transition RBAC.** `inventory`
write goes to Owner, Manager, and Warehouse (a new `isOwnerOrManagerOrWarehouse`
`firestore.rules` helper) - Buyer stays read-only, matching their explicit
persona boundary. The UI shows the same "advance to next status" action to
all three writer roles regardless of which specific transition the persona
docs associate with which role. Rationale: `docs/projects/PROJ-PALLETIQ.md`'s
own Phase 3 QA criterion is where fine-grained UI RBAC enforcement is
explicitly scoped ("RBAC enforcement in UI" is a Phase 3 bullet, not Phase 1) -
building granular per-transition-per-role enforcement now would be scope
creep ahead of the phase that actually calls for it. The one RBAC boundary
Phase 1 already enforces elsewhere - Warehouse can't see purchase cost
fields - stays enforced here too (`canSeeCost`, the same flag `PALLETIQ-008`/
`009` already established), since that one's cheap and already the pattern.

`pallets` stays untouched (still the `PALLETIQ-001`-era placeholder policy) -
nothing in this ticket's scope needs it; it's Phase 2 scoring-engine
territory.

## Alternatives considered

- **Manual "receive into inventory" action.** A Buyer/Owner explicitly
  marks specific line items as "received" to create the inventory record,
  rather than every successful import automatically populating inventory.
  More accurate for partial/staged receiving, but adds a UI step this
  ticket doesn't otherwise need and contradicts "basic" scope - real
  partial-receiving reconciliation is explicitly Phase 3's job
  ("manifest-vs-received reconciliation" per `docs/personas/warehouse.md`).
  Rejected for now; revisit when Phase 3's reconciliation flow is built,
  since that flow will need to distinguish "purchased" from "confirmed
  physically received" more precisely than this ADR's "purchased ==
  inventory exists" model does.
- **Per-transition RBAC (Warehouse can only do Purchased→Received; Manager
  only Received→Listed/Listed→Sold).** More faithful to the persona docs'
  literal wording. Rejected for this ticket per the Phase 3 QA-criterion
  reasoning above - not free to skip forever, just sequenced later,
  explicitly not silently dropped.
- **Persist landed cost on the inventory doc at creation time.** Avoids a
  cross-collection read when displaying inventory. Rejected: freight/fees
  can be edited after import (`PALLETIQ-009`), and a persisted snapshot
  would go stale with no recomputation path - same reasoning `PALLETIQ-009`
  already used to keep landed cost read-only-computed rather than stored.
  Moot for this ticket anyway, since `PALLETIQ-011`'s UI doesn't show
  landed cost at all.

## Consequences

- `processManifestImport` (functions) changes for the first time since
  `PALLETIQ-008`/`009` shipped it - needs a redeploy to take effect live,
  same as every prior functions change this project.
- `firestore.rules`' `inventory` block tightens from the placeholder
  `isOwnerOrManager` to `isOwnerOrManagerOrWarehouse` - a real behavior
  change (Warehouse write newly allowed, matching their actual persona
  need for the first time; Buyer write, already denied, stays denied).
- A new `/inventory` route joins the existing `AppShell` nav
  (`PALLETIQ-010`) - Dashboard, Vendors, Manifests, now Inventory. No new
  mobile-first surface; that's deferred to whichever ticket actually
  builds Phase 3's barcode/mobile-receiving flow.
- Every import from this point forward populates `inventory` automatically -
  worth remembering if a future ticket needs to distinguish "imported" from
  "confirmed received," since this ADR's model conflates them into a single
  `'purchased'` status that already exists the moment import completes.
- `docs/personas/warehouse.md`'s and `store-manager.md`'s per-transition
  RBAC wording is not fully enforced yet (see Alternatives) - flagged here
  so it isn't mistaken for an oversight when Phase 3 revisits it.
