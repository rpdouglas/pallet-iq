# ADR-0018: Source restock.ca manifest data from the embedded page table, not a fetchable file URL

**Status:** Proposed
**Date:** 2026-08-24

## Context

`PALLETIQ-020`/`ADR-0009` built the restock.ca scraper on the assumption
that each lot detail page links to a downloadable manifest file
(`fetchManifestLink.ts` looks for an `<a>` whose text/href mentions
"manifest" or ends in `.pdf`). `PALLETIQ-044` fixed a real bug in that
extraction (a false-positive match on restock.ca's own site-wide
`/furniture/unmanifested-furniture/` nav link), but running the fixed
logic against real production data revealed the underlying assumption
itself is wrong: **restock.ca has no downloadable manifest file
anywhere.**

Confirmed live across 4 different categories (Furniture, Small
Appliances, Bicycles, Propane Grills — not a one-page fluke, and not
theorized): every lot detail page embeds the manifest as a real HTML
table (`UPC` / `Merchant SKU` / `QTY` / `TITLE` / `MSRP` / `Extended`)
inside `<script type="text/template" id="manifest-template">`. A "Load
manifest" button reveals it and a client-side script exports it to XLSX
using `XLSX.utils.aoa_to_sheet` — entirely in the browser. No server URL
is ever requested for a file. One real example (lot `1012617`) had 11
genuine line items with real UPCs, SKUs, titles, and prices — this is
usable structured data, not a dead end, just not shaped the way the
existing pipeline expected to receive it.

## Decision

Parse the embedded table directly instead of looking for a link.
Concretely:

- The scraper (`scrapeRestockLots.ts`) already fetches each newly-
  discovered lot's detail page once, to look for a manifest link — it
  now parses the same response for the embedded table instead. No new
  network cost.
- Extracted rows are stored in a new `restock_lots/{lotId}/manifestItems`
  subcollection (raw `Record<string,string>`, original header names as
  keys), plus a `hasManifest: boolean` flag on the lot doc. The
  subcollection, not an embedded array field, keeps the main doc small —
  `DiscoveredLotsPage.tsx` fetches the entire active lot set client-side
  with no pagination (`PALLETIQ-050`), so bloating every list-fetched doc
  with a dozen-plus item rows would be a real payload cost; a boolean is
  free. This mirrors the existing `tenants/{id}/manifests/{id}/lineItems`
  subcollection shape already used elsewhere in the same pipeline.
- At import time, `importDiscoveredLotWorker.ts` reads that subcollection
  (no live external fetch at all anymore) and synthesizes a CSV via
  `papaparse` (`Papa.unparse`, already a `functions/` dependency), then
  hands off to `processManifestImport` completely unchanged. The table's
  columns already map onto `normalize.ts`'s existing `FIELD_ALIASES` with
  zero new aliases (`UPC`→`upc`, `Merchant SKU`→`sku`, `QTY`→`quantity`,
  `TITLE`→`description`); `MSRP`/`Extended` deliberately don't match any
  cost alias, which is correct — MSRP is retail value, not what the
  tenant pays, and `ADR-0010`'s `flatUnitCost` mechanism (already wired
  via `enqueueDiscoveredLotImport.ts`'s `totalPurchasePrice: lot.price`)
  already exists for exactly this "no per-item cost in the source data"
  shape.
- `fetchAndValidateManifest.ts` (host-allowlist + content-type/HTML-
  sniffing, added mid-`PALLETIQ-041` specifically to defend against a
  bad live fetch) is deleted — nothing fetches a manifest URL live
  anymore, so it has no remaining purpose.

## Alternatives considered

- **Render the page with a headless browser** to trigger the client-side
  "Load manifest"/XLSX-export flow and capture the result. Rejected —
  `ADR-0009` already rejected Puppeteer/Playwright inside a Cloud
  Function for cold-start/memory cost, and it's unnecessary here: the
  table is already present in the static HTML response, no JS execution
  needed to read it.
- **A separate, Discovered-Lots-specific line-item write path**, bypassing
  `processManifestImport` entirely and writing `lineItems`/`inventory`
  docs directly from the extracted table. Rejected — the CSV-synthesis
  approach reuses `normalizeRow`'s validation/aliasing and the existing
  batch inventory-creation logic, already tested, instead of duplicating
  it. The adapter (extract table → CSV text) is a few lines; the logic
  it would otherwise duplicate is not.
- **Keep `manifestUrl` as a field, just repoint it** at the lot's own
  `productUrl` as a "where to find manifest info" pointer, with the
  import worker fetching and parsing it live each time. Rejected — a
  live fetch on the import critical path is a real reliability
  dependency (restock.ca could be slow/down/rate-limiting) for data
  that's static and was already fetched once at scrape time; reading a
  Firestore subcollection is instant and can't fail for that reason.

## Consequences

- `restock_lots` schema change: `manifestUrl: string | null` →
  `hasManifest: boolean` + a new `manifestItems` subcollection. Requires
  a new `firestore.rules` block (governance Check I) — same posture as
  the parent doc (`isSignedIn()` read, Admin-SDK-only write) — and a
  passing/failing test pair.
- The ~513 lots already `active` in production don't self-correct
  (same reasoning `PALLETIQ-044` already ran into) — a one-time backfill
  re-fetches each lot's page under the new extraction logic. Unlike
  `PALLETIQ-044`'s aborted backfill (which would only have replaced one
  wrong value with `null`), this one actually restores the feature.
- `DiscoveredLotsPage.tsx`/`LotCard.tsx`'s small manifest-icon link (next
  to the lot title) is removed, not repointed — there's no second URL to
  distinguish from the title link anymore.
- If restock.ca changes its manifest-table markup (id, column names, or
  moves to fully client-side rendering with no static fallback), this
  breaks the same way the old link-based extraction did — fails soft
  (`hasManifest: false`, no rows), not a hard scraper failure, per the
  same "core lot data is unaffected either way" posture `PALLETIQ-020`'s
  original design already established.
