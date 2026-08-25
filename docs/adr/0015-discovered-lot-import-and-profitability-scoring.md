# ADR-0015: Discovered-lot import bridge + lot-level profitability scoring

**Status:** Accepted
**Date:** 2026-08-24

## Context

`PALLETIQ-039` shipped a read-only Discovered Lots page listing `restock_lots`
(global, cross-tenant, Cloud-Functions-write-only — `ADR-0009`) with an
external link out to each lot's `productUrl`/`manifestUrl`. Its own scope
note explicitly named and deferred the obvious next step: "convert a
discovered lot into a real purchase/import... a plausible future bridge, not
this ticket's scope." The owner now wants that bridge: an "Import" button on
a discovered lot that (1) pulls the lot's manifest into the tenant's own
inventory via the existing manifest-import pipeline, and (2) scores the
resulting lot for profitability using a research mechanism similar to the
Treasure Hunter single-item pricing pipeline (`ADR-0011`/`0012`/`0013`).

This crosses three boundaries none of PalletIQ's existing tickets have
crossed together:

1. **Global → tenant-scoped write.** `restock_lots` is deliberately global
   and read-only to clients (`ADR-0009`). Every downstream collection this
   feature writes to (`imports`, `manifests`, `manifests/{id}/lineItems`,
   `inventory`) is tenant-scoped. `ADR-0009`'s own Alternatives section
   flagged this exact crossing as a decision to make deliberately, not by
   surprise, once a real consumer showed up. This ticket is that consumer.
2. **Server-initiated fetch of an external URL.** Every existing manifest
   import (`ADR-0006`) assumes the client already has the raw file in hand
   and uploads it to Cloud Storage first. Nothing in the codebase fetches a
   third-party URL server-side today. `manifestUrl` is scraped from
   restock.ca's own lot detail pages by `fetchManifestLink.ts`, which its
   own inline comment flags as never verified against a real page, and whose
   regex accepts `.pdf` links alongside spreadsheet links — so the fetched
   resource's format is not guaranteed to be one the import pipeline (CSV/
   XLSX via `papaparse`/`exceljs`, `ADR-0006`) can parse. No PDF-parsing
   capability exists anywhere in the codebase.
3. **Text-only pricing research at lot scale**, not photo-driven single-item
   scan. The Treasure Hunter pipeline's shape is capture photo → Gemini
   vision identifies it → `priceResearch.ts` prices it (`ADR-0011`). A
   manifest line item already carries a text identification (title, UPC,
   category) with no photo — `priceResearch.ts`'s input, `ItemScanCandidate`
   (`functions/src/item-scans/types.ts`), is itself already just text
   fields (`itemName`, `brand`, `model`, `category`, ...), with no image
   dependency. So lot scoring can call the existing research call directly
   from manifest data, skipping the vision/identification stage entirely —
   but doing so for every line item of every import, unmetered, multiplies
   Gemini cost in a way single-item scanning (one scan, one buyer action)
   never has.

Reviewed against `docs/BACKLOG.md`, `docs/ROADMAP.md` (Phase 4 — "automated
vendor ingestion," "pricing intelligence engine" — both already-named
bullets this pulls forward, same posture `ADR-0009`/`ADR-0011` used), and
`docs/projects/PROJ-PALLETIQ.md`.

## Decision

**Split into two tickets, sequenced (the second depends on the first's
output), covered by one ADR since both share the same three boundary
crossings above:**

### 1. Import bridge (`PALLETIQ-041`)

- New Buyer/Owner-gated `onCall`, `enqueueDiscoveredLotImport(lotId)`.
  Validates the `restock_lots/{lotId}` doc exists, is `status: 'active'`,
  and has a non-null `manifestUrl`. Writes a `queued` `imports/{importId}`
  doc (new optional field `sourceRestockLotId`, for traceability back to the
  discovered lot — not a new collection) and enqueues a Cloud Tasks worker.
  Immediate return, no inline fetch — same shape as `enqueueManifestImport`.
- New `onTaskDispatched` worker fetches `manifestUrl` server-side.
  **SSRF-safe by construction, not by validation-after-the-fact**: the
  fetch target is only ever read from the `restock_lots` doc's own
  `manifestUrl` field (never client-supplied), and the worker allowlists
  the restock.ca host before fetching. Checks `Content-Type` (and magic
  bytes, not just the URL's extension) against the CSV/XLSX types the
  existing parser accepts, and enforces the same size cap `ADR-0008`
  already set for client uploads. **PDF (or any other unsupported format)
  fails the import immediately with an explicit "manifest not available in
  a supported format" status** — no PDF-parsing capability is built in this
  ticket. Accepted content is uploaded to the tenant's existing manifest
  Storage path (`tenants/{tenantId}/manifests/{importId}/original.*`), then
  handed to the **existing, unmodified** `processManifestImport.ts`.
- **Vendor requirement solved by auto-provisioning, not a schema change.**
  `enqueueManifestImport` hard-requires `tenants/{tenantId}/vendors/{id}`
  with a `manifestFormat`. The worker idempotently creates (get-or-create,
  keyed by a fixed doc ID e.g. `restock-ca`) a per-tenant
  `vendors/restock-ca` doc — name "Restock.ca (auto-imported)",
  `manifestFormat: 'csv'` — the first time a tenant imports any restock.ca
  lot. `manifestFormat: 'csv'` is safe to hardcode: `PALLETIQ-022` already
  confirmed restock.ca's real manifest shape is CSV
  (`UPC, Merchant SKU, Quantity, Title, MSRP, Extended`), and this ticket
  rejects non-CSV/XLSX content before it ever reaches the vendor lookup.
- **`totalPurchasePrice` sourced automatically from `restock_lots.price`**,
  passed into `processManifestImport.ts` unchanged — `ADR-0010`'s existing
  flat-rate-per-unit allocation mechanism already solves "this lot has no
  per-item cost," and `restock_lots.price` (the lot's listed total price)
  is exactly the value that mechanism expects. No new allocation logic.
- No UI beyond the button + status affordance (queued/processing/completed/
  failed, mirroring `item_scans`' existing status pattern) on
  `DiscoveredLotsPage.tsx`.

### 2. Lot profitability scoring (`PALLETIQ-042`, depends on `041`)

- New Buyer/Owner-gated `onCall`, `enqueueLotProfitabilityScore(importId)`,
  callable once an import (from either `041` or a regular manual upload) has
  `status: 'completed'`. Enqueues a Cloud Tasks worker — never inline,
  per Check II.
- Worker reads the import's `lineItems`, **deduplicates by SKU/UPC** (not
  one research call per unit — a 40-unit lot of 5 distinct SKUs runs 5
  research calls, not 40), and for each distinct line item builds an
  `ItemScanCandidate`-shaped value directly from manifest fields
  (`title` → `itemName`, `category`, condition defaulted since manifests
  don't grade condition — flagged as a real limitation, not silently
  guessed) — **no Gemini vision call, no photo**. Calls the existing
  `priceResearch.ts` unchanged, one call per distinct SKU.
- Aggregates: projected resale value (Σ `bottomLine.priceCad × quantity`
  per SKU, from each SKU's research result) against landed cost (Σ
  `unitCost × quantity`, reusing `PALLETIQ-009`'s existing landed-cost
  calculation, not a new one) → a lot-level profitability score/margin.
  Writes the result to the `imports/{importId}` doc (or a new
  `imports/{importId}/profitability` subdoc if the result payload is large
  enough to warrant one — left to the ticket's own implementation).
- **UI reuses `docs/design/explainable-scoring.md`'s existing score-badge +
  factor-breakdown + provenance-labeling pattern** (the same pattern
  `ADR-0011`'s saleability score already instantiates) — not a new pattern.
- **Per-import SKU research cap flagged as an open question, not resolved
  here**: an unusually large manifest (hundreds of distinct SKUs) could run
  hundreds of Gemini research calls from a single button click. This ticket
  should decide a cap or sampling strategy before shipping, but the decision
  itself doesn't change this ADR's shape — noted so it isn't discovered
  mid-implementation.

**RBAC for both:** Buyer/Owner write, reusing `isOwnerOrBuyer` — same
persona already responsible for `imports`/`manifests`/`item_scans`.

## Alternatives considered

- **Client-side fetch of `manifestUrl`, routed through the existing
  `ImportForm.tsx` upload flow, with no new server-side fetch capability.**
  Rejected — restock.ca's file host almost certainly doesn't set CORS
  headers permitting a browser-side fetch from PalletIQ's origin, and even
  if it did, it reintroduces the manual "download then re-upload" step the
  button exists to remove.
- **Building PDF-parsing support in this same ticket**, since `manifestUrl`
  may point to a PDF. Rejected for v1 — no PDF-parsing library exists in
  the codebase, `fetchManifestLink.ts` was never verified against a real
  restock.ca page so the actual PDF-vs-spreadsheet split in practice is
  unknown, and an explicit "unsupported format" failure is honest and cheap
  compared to guessing at OCR/PDF-table-extraction scope prematurely.
  Revisit as a follow-up ticket once real usage shows how often it's hit.
- **A new `tenants/{tenantId}/vendors/{vendorId}` field or relaxed schema
  making `vendors` optional on `imports`**, instead of auto-provisioning a
  synthetic vendor doc. Rejected — auto-provisioning reuses
  `processManifestImport.ts` completely unmodified and keeps "every import
  has a vendor" a true invariant instead of introducing a null-vendor edge
  case every other vendor-reading callsite would need to handle.
- **Running the full Treasure Hunter capture → identify → price pipeline**
  (including a synthetic/placeholder "photo") per line item. Rejected —
  manifest line items already carry a text identification; inventing a fake
  photo step to reuse `identifyItem.ts`'s vision call would be pure waste
  and add latency/cost for information already in hand.
- **Scoring every unit individually rather than deduplicating by SKU.**
  Rejected on cost grounds alone — no accuracy benefit, since identical SKUs
  research to the same price.
- **One combined ticket instead of two.** Rejected — mirrors this repo's
  own precedent (`ADR-0011`'s six-ticket split, `ADR-0009`'s two-track
  split): the import bridge is independently valuable and shippable before
  scoring exists, and scoring depends on the bridge's output, not the other
  way around, so sequencing them as separate tickets lets `041` ship and be
  verified before `042`'s cost/aggregation questions are finalized.

## Consequences

- First feature where Cloud Functions code fetches content from a
  third-party URL rather than only receiving client-uploaded files —
  `ADR-0008`'s size-limit/format-validation posture extends here, but this
  is a new trust boundary (unvalidated remote content, not a validated
  client upload) worth naming explicitly for future readers rather than
  treating as "just another file."
- `imports/{importId}` gains an optional `sourceRestockLotId` field;
  `tenants/{tenantId}/vendors/restock-ca` becomes a real, auto-created doc
  the first time any tenant uses this feature — both additive, no migration
  needed for existing data.
- `docs/personas/buyer.md` will need its permission list extended to note
  Buyer can trigger `enqueueDiscoveredLotImport`/`enqueueLotProfitabilityScore`
  — deferred to each ticket's own close-out (per this repo's existing
  pattern of updating persona docs when the feature ships, not at ADR time).
- Per-import Gemini research cost is now driven by manifest SKU-count, not a
  single buyer action — `PALLETIQ-042` needs to land with the cap/sampling
  decision made, not deferred again; flagged here so `close-ticket` on `042`
  checks for it explicitly. **Resolved at close:** a fixed 20-distinct-SKU
  cap per import, highest-value SKUs researched first
  (`functions/src/manifests/lotProfitability.ts`'s `SKU_RESEARCH_CAP`) — 80
  Gemini calls max for one profitability-score action, leaving headroom
  under `PALLETIQ-046`'s 100-call/month free-plan cap. Unresearched SKUs
  still count toward landed cost but contribute $0 to projected resale
  value, understating margin conservatively rather than guessing — surfaced
  explicitly in the score's factor breakdown, not a silent gap.
- No `firestore.rules` change is anticipated beyond what `isOwnerOrBuyer`
  already covers on `imports`/`manifests`/`vendors` — confirmed at each
  ticket's close via `firestore-rules-auditor`, not assumed here.
- `PALLETIQ-039`'s deferred "unified sourcing view" question (`ADR-0009`)
  remains open and out of scope for both tickets — this bridges one
  discovered lot into one import on explicit buyer action; it does not
  merge `restock_lots` and tenant data into any shared read model.
