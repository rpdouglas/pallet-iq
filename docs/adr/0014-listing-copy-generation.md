# ADR-0014: Listing copy generation from item_scans records

**Status:** Proposed
**Date:** 2026-08-24

## Context

`docs/projects/treasure-hunter-plan.md` §8 ("Beyond pricing") frames listing
title/description generation as the first feature to reuse the structured
item record `identifyItem.ts` already produces (brand, model, category,
condition, notable features, dimensions) plus the pricing/saleability data
`priceResearch.ts`/`computeSaleability.ts` already compute — "none of it
requires new identification work, only new uses of work that's already
being done." `docs/personas/store-manager.md` already documents this
exact design intent, added ahead of implementation: Manager gets **read**
access to `item_scans` — "a Buyer's item-identification record, consumed
for listing-copy generation — see ADR-0011, PALLETIQ-030."

Three things about the current codebase shape this decision:

- **No UI surface exists for a Manager to see `item_scans` at all.**
  `ItemScanPage.tsx` (`/scan`) is `RequireRole roles={['owner', 'buyer']}`-
  gated — Manager has no route to it. Manager's only existing UI surface
  is `InventoryPage.tsx` (shared with Owner/Warehouse), for status
  transitions on already-purchased inventory.
- **`item_scans` and `InventoryItem` are separate, unlinked pipelines.**
  `item_scans` is the Buyer's pre-purchase evaluation record (photo →
  identify → price, before any purchase decision). `InventoryItem` comes
  from manifest imports (`processManifestImport.ts`), a wholly separate
  data-entry path, after a purchase is already made. Nothing in the
  codebase today links a specific `item_scans` doc to the `InventoryItem`
  it may have influenced buying.
- **This would be the third real Gemini call site**, after
  `identifyItem.ts` (vision + grounding, item identification) and
  `priceResearch.ts` (live pricing research). Both existing sites run only
  inside an `onTaskDispatched` Cloud Tasks worker, never inline on an
  `onCall` — the pattern Governance Check II requires and `ADR-0004`
  established.

## Decision

**A new async worker, following the exact Check II pattern the two
existing Gemini call sites already use.** A new `enqueueListingCopy`
`onCall` (Owner/Manager only — `isOwnerOrManager`, `ADR-0003`'s existing
helper, matching `InventoryPage.tsx`'s own write-role set and Manager's
documented ownership of the Listed → Sold lifecycle) enqueues a new
`generateListingCopy` Cloud Tasks worker. That worker makes a **text-only**
Gemini call — no vision, no photos re-sent — using the already-identified
candidate fields plus the stored `PricingResult`/`SaleabilityResult` as
its prompt input, and writes the result back onto the `item_scans` doc:

```ts
listingCopyStatus: 'not_generated' | 'generating' | 'generated' | 'failed'
listingCopy: { title: string; description: string } | null
listingCopyError: string | null
```

**A new Manager-facing page** (route TBD at implementation, e.g.
`/scanned-items`) — read-only browse of the tenant's `completed` +
`priced` `item_scans`, reusing the existing Data table pattern (same one
`WatchlistPage.tsx`/`DiscoveredLotsPage.tsx` already established), with a
"Generate listing copy" action per row. No `firestore.rules` change needed
for the read side — `item_scans`' existing `read: isTenantMember(tenantId)`
rule already covers Manager. The new write path (`listingCopyStatus`/
`listingCopy`/`listingCopyError`, set by the Cloud Tasks worker via the
Admin SDK) needs no client-side write rule either — same shape as every
other Cloud-Tasks-only-write field on this doc (`pricingStatus`,
`saleabilityStatus`, etc.).

## Alternatives considered

- **Deterministic string templating instead of a Gemini call.** Rejected —
  real marketplace listing copy needs natural, sales-appropriate language
  a template can't produce well, and the plan's own framing treats this as
  a genuine reuse of the identification _engine_, not just its stored
  fields.
- **Running the Gemini call inline in the `onCall`, skipping Cloud
  Tasks.** Rejected outright — breaks the Check II precedent both
  existing Gemini call sites already established, for no real benefit; a
  text-only generation call is not meaningfully cheaper or faster than
  the vision/research calls that already justified the async pattern.
- **Linking `item_scans` to `InventoryItem` first**, so listing copy
  generates from the actually-purchased item rather than the pre-purchase
  scan record. Rejected as out of scope here — that linkage doesn't exist
  anywhere in the codebase today, and designing it (how does a Buyer's
  scan get matched to the specific `InventoryItem` a later, separate
  manifest import creates for what might be the same physical item?) is
  its own real architectural decision. `docs/personas/store-manager.md`
  already anticipated this exact tension by specifying Manager reads
  `item_scans` directly — following that existing precedent rather than
  reopening it here.
- **Extending `InventoryPage.tsx` instead of a new page.** Rejected —
  `item_scans` and `InventoryItem` are different collections with
  different fields and lifecycles; forcing them into one table would need
  heavy conditional rendering and doesn't match the persona doc's clear
  framing of this as an `item_scans`-native feature.

## Consequences

- **Corrects two stale assumptions in `PALLETIQ-030`'s original
  Planning-gate scope note** (written 2026-08-22, before `PALLETIQ-025`/
  `035` actually shipped): it said this would "extend the existing
  `ai_tasks` pipeline with a new task type" and surface the result "on
  the inventory item [the scan is] associated with." Neither holds — see
  `ADR-0004`'s own 2026-08-24 addendum for why `ai_tasks` was never
  actually adopted by a real Gemini call site, and the Context section
  above for why no `item_scans`-to-`InventoryItem` link exists to surface
  through.
- **Third real Gemini call site.** `CLAUDE.md`'s own governance notes
  already flag this as the trigger point for finally building the
  `async-ai-boundary-auditor` subagent (deferred until now: "worth
  building once a third AI call site lands or manual review starts
  missing things"). Should be raised as a backlog/drift item when
  `PALLETIQ-030` closes, not silently left stale again.
- **First Manager-only UI page.** First real exercise of governance Check
  III (RBAC in UI and rules) specifically for the Manager role — no
  Manager-gated route has existed before this.
- `ItemScanDoc` grows three more optional fields. No migration needed —
  Firestore is schemaless, and existing scans simply won't have them
  until/unless a Manager generates copy for them; nothing needs
  backfilling.
- **Does not solve** the deferred `item_scans` ↔ `InventoryItem` linkage
  question — a real gap for whoever eventually builds the plan's own
  named future feature, "a profitability/ROI calculator" (`treasure-
hunter-plan.md` §8), which would need exactly that link to work.
