# ADR-0012: Treasure Hunter pricing — LLM-driven live web research replaces the multi-vendor waterfall

**Status:** Accepted
**Date:** 2026-08-23

## Context

`ADR-0011` adopted a deterministic, multi-vendor pricing waterfall for the
Treasure Hunter item-scan feature: cache → UPC/Keepa → Gemini grounding →
eBay Browse API + calibration → category specialists (Keepa, PriceCharting,
Discogs, Google Books) → paid comps as a last resort, built across
`PALLETIQ-026`/`027`.

The owner reported that scanned items only ever show an MSRP —
`salePrice`/`salePriceLow`/`salePriceHigh`/`liquidationPrice`/`comps` stay
empty. Tracing this (`functions/src/pricing/waterfall.ts`) found that those
fields depend entirely on eBay Browse API comps, and `EBAY_APP_ID`/
`EBAY_CERT_ID` (plus `KEEPA_API_KEY`/`PRICECHARTING_API_KEY` for background
enrichment) are still the inert placeholder values set during
`PALLETIQ-026`/`027`. A `try/catch` swallows the resulting OAuth failure and
gracefully degrades to MSRP-only, exactly as designed — not a bug, an
unfinished credential dependency.

Investigating this surfaced two bigger problems with simply swapping in real
credentials:

1. **Market mismatch.** The current vendor stack is entirely US-oriented —
   `ebayBrowseApi.ts` hardcodes `X-EBAY-C-MARKETPLACE-ID: EBAY_US`, and
   Keepa's sales-rank signal is Amazon-US-specific. The owner's actual
   target market for this pricing feature is Ontario, Canada.
2. **eBay Browse API only returns active asking prices, not sold data** —
   `functions/src/pricing/types.ts` already documents this explicitly
   ("deliberately never labeled 'sold' anywhere in the UI"). Real sold-comp
   data needs eBay Marketplace Insights, which `ADR-0011`'s own consequences
   section flags as gated/unconfirmed access, deferred to `PALLETIQ-028`.

The owner has a Standard Operating Procedure
(`docs/projects/SOP-Pricing-Research-v1.4.docx`, "THE PAWN SHOP", Cornwall
Island, Ontario) used successfully for months in a separate pawn shop
business — an LLM session with live web search+fetch tools, researching a
Canadian retail price (Home Depot Canada / Canadian Tire / Amazon.ca),
Kijiji Ontario comps (new/sealed and used), eBay sold/completed listings
(USD→CAD converted when needed), and an open-box/clearance estimate,
synthesized into one bottom-line recommended price with a one-sentence
rationale. This SOP is, in the owner's own words, what prompted them to
build PalletIQ in the first place. It is a fundamentally different
architecture than the deterministic multi-vendor API waterfall PalletIQ
currently has: agentic LLM research vs. per-vendor API integrations, each
requiring its own credential/account and carrying its own access-approval
risk.

Confirmed via the installed `@google/genai` SDK (v2.18.0, already used in
`functions/src/gemini/identifyItem.ts` for identification) that its
`googleSearch` and `urlContext` tools can run together in a single
`generateContent` call — `urlContext` fetches a specific URL's actual
content, not just search snippets, directly matching the SOP's "search,
then `web_fetch` the direct page" workflow. `identifyItem.ts` currently only
uses `googleSearch`.

**Known risk, not resolved by this ADR — resolved by a live pre-flight
spike during `PALLETIQ-035`'s implementation:** `docs/projects/
treasure-hunter-plan.md` §12 notes eBay closed _logged-out_ sold-listing
access in July 2026. An anonymous `urlContext` fetch may not be able to
load eBay's sold-listings pages at all. The new design's schema/prompt
builds in the SOP's own fallback for this (`ebaySold.thin`/
`dataQuality.flags` — "flag when data is thin rather than force a number")
rather than assuming the fetch will succeed.

## Decision

**Replace the deterministic multi-vendor pricing waterfall with a single
Gemini-driven live web research call, modeled directly on the SOP's general
pathway (§3–9), targeting Ontario/Canada and CAD pricing.**

A new `functions/src/pricing/priceResearch.ts` calls Gemini with
`tools: [{ googleSearch: {} }, { urlContext: {} }]` and a prompt encoding
the SOP's data-source priority (retail → Kijiji new/used → eBay sold →
open-box) and synthesis rules (eBay sold as primary anchor when available,
Kijiji new/sealed as fallback anchor, retail sets a hard ceiling, a 15–40%
below-retail deal band, used Kijiji sets the floor, weight recent/
Eastern-Ontario-relevant listings, always state a specific bottom-line
number). Its Zod-validated response mirrors the SOP's §8 Output Format
(retail price+source, Kijiji new/used comps, eBay sold comps with a
sample-size-or-thin flag, open-box estimate, bottom-line price+rationale).
A new `functions/src/pricing/mapPriceResearch.ts` maps this onto the
**existing, unchanged** `PricingResult` interface (only an additive
`source` field on the nested `PricingComp`) — the entire UI layer
(`PricingPanel.tsx`, `ItemScanPage.tsx`, `SaleabilityPanel.tsx`) needs no
structural change, only copy generalized away from eBay-only language.

**Vendor integrations removed entirely**: eBay Browse API, UPCItemDB,
Keepa, PriceCharting, Discogs, Google Books, and their category-conditional
step ordering (`categoryProfile.ts`'s `classifyCategoryProfile` — the SOP
doesn't category-branch beyond its own out-of-scope regulated-goods
addenda). **New secrets list: `GEMINI_API_KEY` only** — already provisioned
for identification, no new secret work needed. `EBAY_APP_ID`/`EBAY_CERT_ID`/
`KEEPA_API_KEY`/`PRICECHARTING_API_KEY` are removed from the codebase's
secret declarations (their Secret Manager entries may stay orphaned
harmlessly).

**Worker architecture collapses to one async task.** The prior two-stage
split (`priceItemScan.ts` running fast deterministic steps inline,
`enrichItemScanPricing.ts` running slow/paid steps in the background) was
justified specifically by Keepa's sales-rank lookup being a separate slow
call. That justification no longer holds — pricing is now _entirely_ one
inherently-slow, multi-source Gemini research call. `priceItemScan.ts`
shrinks to an enqueue-only `onCall` (auth/RBAC + state validation +
`taskQueue(...).enqueue(...)`); a new `priceItemScanWorker.ts`
(`onTaskDispatched`) does the research call, maps the result, and computes
the saleability score in the same invocation — saleability no longer needs
its own async round-trip, since its Keepa-sourced `salesRank` term is gone
and its remaining inputs (`priceVariance`/`listingCount`/`sampleSize`) all
come from the same research response. As a direct, forced consequence,
`retrySaleabilityScore.ts` (`PALLETIQ-033`) simplifies from an async
worker-retry to a synchronous recompute against already-stored comps — a
revision of that ticket's shipped design, not new scope creep, called out
explicitly here and in `PALLETIQ-035`'s close-out notes.

**Confidence is computed deterministically server-side**, not trusted from
the LLM's own self-rating. The model reports structured facts (sample
sizes, thin-data flags, which sections returned data); a small server-side
function derives a 0–1 confidence from those facts, the same spirit as the
old `stepConfidence()`. This is a real buy/pass money decision — an
auditable, code-owned calculation is safer than an LLM's self-assessed
confidence, consistent with how `identifyItem`'s own LLM-reported
confidence is only ever used for candidate _ranking_ (lower stakes), not
shown to the user as a trust signal as-is.

**Known, accepted limitation:** `product_price_cache` stays a single
global, cross-tenant, region-agnostic cache keyed by UPC/fingerprint — it
is now implicitly Ontario/CAD-specific, since every cached price reflects
Canadian sourcing. This is fine while the target market is Canada-only
(matches today's status quo of a region-unaware cache key), but would need
a region-aware cache key if PalletIQ ever serves a non-Canadian tenant.
Not addressed now — flagged for future reconsideration.

## Alternatives considered

- **Keep the deterministic waterfall and just provision real eBay/Keepa/
  PriceCharting credentials.** The cheapest fix for the immediate symptom,
  but rejected — it doesn't address either underlying problem: the vendor
  stack stays hardcoded to the US marketplace (wrong market for the
  owner's actual business), and eBay Browse API still only returns active
  asking prices, never real sold data, regardless of credential validity.
- **A hybrid approach**: keep the existing UPC-lookup/Gemini-grounding fast
  path for an instant MSRP-only estimate, and only replace the eBay-comps
  step with SOP-style LLM research for the deeper price. Considered and
  rejected in favor of full replacement, per the owner's explicit choice —
  a fast-but-effectively-incomplete instant guess (which is exactly
  today's MSRP-only production behavior) isn't more valuable than a
  correct, complete price that takes longer to research. The existing
  "instant estimate, refine over the next minute" UX principle from the
  plan's section 10 was designed around cheap deterministic steps existing
  at all; once none of them survive this replacement, there's no cheap
  first pass left to preserve.
- **Treating this as a `PALLETIQ-028`-style vendor-access pre-flight-gated
  ticket** (wait for eBay Marketplace Insights approval before doing
  anything). Rejected — the SOP already demonstrates a working alternative
  that doesn't depend on that approval at all, and gating this fix on an
  unconfirmed, possibly-never-materializing vendor approval (the same risk
  `ADR-0011`'s own consequences section already flagged) would leave
  pricing broken indefinitely for no architectural reason.

## Consequences

- **Explicitly superseded from `ADR-0011`**: the paragraph "Waterfall
  design, vendor list, and category-conditional ordering are adopted as
  specified... without modification" — fully superseded, this is precisely
  the design being replaced. The secrets list (`KEEPA_API_KEY`/
  `PRICECHARTING_API_KEY`/`EBAY_APP_ID`/`EBAY_CERT_ID`) is superseded down
  to `GEMINI_API_KEY` only. The consequences bullet on external
  vendor-access risk (eBay Marketplace Insights approval odds, StockX/
  WorthPoint viability) is superseded by the new `urlContext`-fetchability
  risk (this ADR's Context section) for the pricing feature specifically —
  `PALLETIQ-028`/`029`'s own pre-flight-check requirements for their
  separate scope (outcome-data flywheel, fashion/sneaker categories) are
  untouched.
- **Explicitly NOT superseded, confirmed intact**: the four-stage shape
  (Capture → Identify → Price → Score — Price and Score are recommended to
  co-locate into one task dispatch as an implementation detail, not a
  stage removal); the async AI boundary (Check II) treatment (if anything
  this change makes pricing _more_ consistent with Check II, moving from
  partially-synchronous to fully-asynchronous); the Firestore collections
  (`item_scans`, `product_price_cache`, `product_intelligence`) and their
  rules, unchanged; the explainable-scoring UI reuse pattern
  (`PricingPanel`/`SaleabilityPanel` keep their existing shape); the
  pre-purchase field-scan persona choice, RBAC scope, and mobile-first
  design-system exception.
- Per-scan cost shape changes from "Gemini + several metered third-party
  APIs" to "Gemini only," but likely a heavier per-call Gemini cost given
  multi-source live research (search + multiple page fetches) replaces
  what used to be several cheap/free API calls. `ADR-0011`'s "no usage-
  metering enforcement yet" flag stands unchanged — still not blocking,
  still worth a future metering conversation.
- Deleting the category-conditional waterfall (`classifyCategoryProfile`/
  `classifyMediaSubtype`) means category no longer drives _which_ pricing
  steps run — every item goes through the same SOP-modeled research
  regardless of category. `computeCacheKey`'s barcode/fingerprint logic is
  unaffected and kept as-is.
- A real, unresolved technical risk (eBay's July 2026 logged-out
  sold-listing access closure) is carried forward into implementation as a
  required live pre-flight spike rather than resolved here — consistent
  with the discipline `ADR-0011` already required of `PALLETIQ-028`/`029`
  for their own uncertain vendor access, applied here to `urlContext`
  instead of a new vendor API relationship.
