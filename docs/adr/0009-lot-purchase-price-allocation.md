# ADR-0009: Lot purchase price allocation for manifests with no per-item cost

**Status:** Proposed
**Date:** 2026-08-11

## Context

`PALLETIQ-008`'s manifest import assumes every line item's `unitCost` comes
directly from a column in the vendor's manifest. In practice, real
liquidation vendors (confirmed against a real Restock.ca manifest — headers
`UPC, Merchant SKU, Quantity, Title, MSRP, Extended`) often sell an entire
pallet/lot for one negotiated lump-sum price and only list retail reference
values (MSRP) per item, not what the buyer actually paid per SKU. Today, any
row lacking a directly-stated cost column fails normalization outright
("Missing or invalid unit cost"), so this entire class of real vendor
manifest currently imports as 0 successful rows / 100% errors.

Two lesser bugs compound this for the specific Restock.ca file: its
product-name column is literally titled "Title" and its SKU column
"Merchant SKU," neither of which the existing case-insensitive header-alias
list (`functions/src/manifests/normalize.ts`) recognizes, so every row also
fails on "Missing description" before the cost problem is ever reached.

## Decision

Add an optional **`totalPurchasePrice`** field, entered once per import
(analogous to `PALLETIQ-009`'s `freightCost`/`otherFees`), and derive a
**flat per-unit cost** — `totalPurchasePrice ÷ total quantity across the
import's successfully-parsed rows` — applied to any line item that has no
directly-stated cost in the manifest itself. A row with a real,
manifest-stated cost always keeps that value; the flat rate only fills the
gap for rows that have none. Confirmed directly with the owner: divide by
total _unit quantity_ (not row/SKU count) — e.g. a $100 lot of 1 scooter + 3
mowers (4 units) gives every unit, scooter or mower, a $25 unit cost.

Unlike `PALLETIQ-009`'s freight/fee allocation (computed on read, never
persisted, editable indefinitely after import), `totalPurchasePrice` is
collected **at import time**, on `ImportForm.tsx`, before the file is
parsed — not editable afterward. `unitCost` stays a required, always-
populated `number` on `LineItemDoc` (no schema nullability introduced); the
flat rate is computed once, server-side, in `processManifestImport.ts`,
before the normalization pass, and burned directly into both the
`lineItems` and `inventory` docs it creates, exactly like a real
manifest-stated cost would be.

Also fixes `normalize.ts`'s `FIELD_ALIASES`: adds `title` to the description
aliases and `merchant sku` to the sku aliases, matching this vendor's actual
header names.

## Alternatives considered

- **Compute-on-read, like landed cost.** Make `unitCost` nullable, store an
  `msrp`-weighted or flat-average multiplier, and resolve the effective unit
  cost wherever it's displayed (mirroring `PALLETIQ-009`'s un-persisted
  landed-cost pattern). Rejected: `inventory.unitCost` is copied directly
  into a persisted document at creation time (unlike landed cost, which is
  only ever computed for display) — supporting an editable-after-the-fact
  total purchase price would mean either a Cloud Function that rewrites
  every `inventory`/`lineItems` doc on every edit, or a client-side batch
  rewrite: the exact class of complexity `PALLETIQ-009` itself already
  rejected for a lower-stakes field. Collecting the price before parsing
  avoids that entirely — the value is known once, up front, and never needs
  reconciling after the fact.
- **MSRP-weighted allocation** (each item's share of the lot price
  proportional to its MSRP, not a flat per-unit split). Rejected per the
  owner's explicit direction: a flat per-unit split is what actually
  happened economically in the example given (a $100 lot of 4 items splits
  $25/unit regardless of any per-item retail-value difference), and it
  avoids introducing a new `msrp` field/concept the flat approach doesn't
  need at all.
- **Manual per-row cost entry after import** (buyer fixes each errored row
  by hand). Rejected per the owner's explicit direction to build lot-price
  allocation instead — tedious for a 13+ row manifest and doesn't generalize
  to larger pallets.

## Consequences

- `enqueueManifestImport`'s request payload and `ImportDoc` both gain an
  optional `totalPurchasePrice: number | null` field; `ImportForm.tsx`
  gains a matching optional input.
- `processManifestImport.ts` needs a pre-pass over parsed rows (sum quantity
  across rows with a valid description+quantity, regardless of cost) before
  its existing per-row normalization pass, to compute the flat rate once
  per import.
- A line item's `unitCost` no longer unambiguously means "the vendor
  manifest stated this exact figure" — it may be a computed lot-price
  average. No provenance flag is added to distinguish the two (out of scope
  here, per the owner's request); a future ticket that needs that
  distinction (e.g. Phase 2 scoring trusting manifest-stated cost more than
  an estimate) will need to add it, at the cost of a schema migration for
  historical line items that predate this field.
- If a buyer omits `totalPurchasePrice` on a manifest that turns out to
  need it, the import completes with per-row errors (unchanged existing
  failure UX) rather than a friendlier fix-and-retry flow — the buyer must
  re-upload as a new import with the field filled in. Acceptable given
  today's importer has no "edit and reprocess an existing import"
  mechanism at all.
- No `firestore.rules` change expected — `totalPurchasePrice` lives on the
  already `isOwnerOrBuyer`-write-gated `imports/{importId}` doc, same as
  `freightCost`/`otherFees`; confirmed at close via
  `firestore-rules-auditor`, not assumed.
