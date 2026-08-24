# Target-Vision Gap Analysis & Second-Liquidator Research

**Date:** 2026-08-24
**Scope:** `docs/projects/Pallet plan 2.docx` (the source document) compared against
`functions/src/`, `src/`, `docs/projects/PROJ-PALLETIQ.md`, `docs/ROADMAP.md`,
`docs/BACKLOG.md`, and this repo's ADRs; plus live research (`WebFetch`/`WebSearch`)
against ten pallet-liquidation websites.
**Requested by:** the owner, asking for a gap analysis against the shared document and
a recommendation for a second scraped lot-source (after restock.ca), picked from
whichever liquidator named in the document is easiest/cheapest to scrape.

## At a glance

|                                                                                |                                                                 |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| What the source document actually contains                                     | An outline/template for a future report — not filled-in content |
| Liquidators named in the document that qualify as a free restock.ca-equivalent | **0 of 6**                                                      |
| Additional liquidators checked after widening the search                       | 4 — **0 of those qualify either**                               |
| Capability gaps found that duplicate an already-planned ticket                 | Most of them — don't re-open                                    |
| Capability gaps found with genuinely no ticket yet                             | 4 (listed in §3)                                                |

## 0. What the source document actually is

`docs/projects/Pallet plan 2.docx` reads as an AI chat response proposing the
_outline_ a large "Technical Design Authority" package would have — not a filled-in
vision or architecture spec. Its 19 numbered sections ("1. Executive Summary,"
"9. Marketplace Connector Framework," "16. Gap Analysis," …) are almost entirely
one-line placeholders and "Example" blocks describing what each section _would_
contain, not real PalletIQ-specific content. Worth knowing before treating anything
in it as a firm spec.

The two sections with real, actionable content:

- **§3 Competitive Analysis** names six liquidation marketplaces to compare:
  B-Stock, Direct Liquidation, 888 Lots, Liquidation.com, BULQ, Via Trading.
- **§9/§10** sketch a target pipeline (Auction Discovery → Manifest Collection →
  Product Identity Resolution → Market Pricing → Demand Forecasting → Bid
  Optimization → Listing Automation → Business Intelligence) and a "Universal
  Manifest Schema" field list (marketplace, UPC, ASIN, brand, MPN, condition,
  MSRP, weight, category, image URL, …).

## 1. Capability comparison: target pipeline vs. what's actually built

Each area below: current state (with file paths), and whether a gap is already
covered by an existing ticket/ADR (so this report doesn't recommend duplicating
planned work).

**Manifest ingestion / normalization** — mature, shipped (`PALLETIQ-007/008/009/
012/022/023/024`, all Done). `functions/src/manifests/normalize.ts`'s
`FIELD_ALIASES` covers `sku`/`upc`/`description`/`quantity`/`unitCost`/`condition`/
`category` via header-alias matching, not per-vendor code branches. CSV/XLSX only
(`parseFile.ts`), 10MB/50,000-row limits. No gap ticket needed for format coverage;
genuinely open scope if more vendor formats/fields (weight, dimensions, ASIN, MSRP)
are ever wanted.

**Marketplace/lot-source connectors** — restock.ca-specific, not a reusable
abstraction. `functions/src/restock-scraper/` hardcodes `BASE_URL`/`CATEGORY_PATH`;
zero hits repo-wide for "connector"/"adapter" interface. `ADR-0009` sets binding
precedent for any future second source: mandatory per-source ToS/robots.txt
pre-flight before writing code, `cheerio` not a headless browser, sequential
polite fetching, and a global `restock_lots`-style collection (not per-tenant) for
public marketplace data. **No ticket exists for a generic connector interface —
genuinely new scope** (see §3).

**Pricing / market intelligence** — shipped (`PALLETIQ-035/038/045`). Three
concurrent Gemini calls (retail+open-box, Kijiji, eBay-sold), each grounded with
live web search — not direct API integrations with eBay/Amazon/Walmart (Walmart is
never queried at all). 30-day `product_price_cache`. `PROJ-PALLETIQ.md`'s stack
section still lists the old eBay/Keepa/PriceCharting stack — stale relative to
`ADR-0012`'s LLM-research pivot, worth a docs fix but not a new gap.
`PALLETIQ-028`/`029` (real eBay Marketplace Insights, fashion/sneaker vendor
access) are already Planned — don't duplicate.

**Product identity resolution** — a photo-in/price-out pipeline
(`functions/src/gemini/identifyItem.ts`), not a canonical-product database. UPC is
used only as a cache key, never as a lookup against real product master data.
Embeddings-based duplicate detection is named in `PROJ-PALLETIQ.md` and
`ROADMAP.md` but has **zero ticket** — genuinely new (§3).

**Opportunity/deal scoring** — item-level saleability scoring is fully built
(`functions/src/saleability/computeSaleability.ts`), but 2 of its 6 weighted
factors (`sell_through`, `sales_rank`) have no data source and permanently
redistribute their weight. Lot-level profitability scoring is **already planned**
— `PALLETIQ-042`/`ADR-0015` — don't duplicate. That spec covers margin/profit
only; broader factors (velocity/competition/demand) aren't in its current scope —
worth flagging if the target vision wants those specifically (§3).

**Inventory lifecycle management** — a basic 4-state status field
(`purchased → received → listed → sold`), auto-created from manifest import, no
sale price/date/channel/location/photos tracked. Everything beyond this is already
named at the phase level in `ROADMAP.md` Phase 3 — no new tickets needed, just not
yet broken into them.

**Listing automation / demand forecasting / bid optimization / BI dashboards** —
none built beyond listing-copy _text generation_ (`PALLETIQ-030`, no marketplace
posting). Demand forecasting is **explicitly deferred by design** in both
`PROJ-PALLETIQ.md` and `ROADMAP.md` ("needs accumulated outcome history to be
trustworthy") — not an oversight. Marketplace posting integrations and BI/
benchmarking are named Phase 4 bullets, no tickets yet. One real drift: a `bids`
collection was named in Phase 1's original data model (bid history, max-bid calc)
but was never built or re-homed to a later phase — genuinely dropped, not deferred
on purpose (§3).

## 2. Second-liquidator research: none of the ten sites checked qualify

restock.ca's bar: public browsing, no login, real per-item manifest data, no cost,
plain server-rendered HTML, no ToS scraping ban. Checked all 6 named in the
document, then 4 more found by widening the search once all 6 disqualified.

**The 6 named in the document:**

| Site               | Public browse? | Real manifest data, no login? | Blocker                                                                                                                     |
| ------------------ | -------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| B-Stock            | —              | No                            | ToS explicitly bans scraping (`ADR-0009`, already known)                                                                    |
| Direct Liquidation | —              | No                            | ToS explicitly bans scraping (`ADR-0009`, already known)                                                                    |
| 888 Lots           | Yes            | No                            | ToS explicitly bans scraping ("deep-link, page-scrape, robot… spider"); manifests gated behind a resale-certificate account |
| Liquidation.com    | No             | No                            | 403 Forbidden on a plain fetch (anti-bot wall); same corporate family as B-Stock                                            |
| BULQ               | —              | —                             | Shut down — domain no longer resolves                                                                                       |
| Via Trading        | Partial        | No                            | Real manifest data lives behind a login-required "Load Center"                                                              |

**4 more, found widening the search (restock.ca-like fixed-price Canadian/US
liquidation storefronts):**

| Site                                      | Public browse?             | Real manifest data?                                                                               | Blocker                                                                                                        |
| ----------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Maple Liquidation (`mapleliquidation.ca`) | Yes, permissive robots.txt | **No** — "There is no manifest for this pallet" on every product checked (5/5)                    | Business model is photo-based "mystery pallets" — nothing to scrape even though scraping itself would be clean |
| Liquidation Deals (`liquidationdeals.ca`) | Yes, permissive robots.txt | **No** — identical "no manifest" text to Maple Liquidation (same underlying platform/template)    | Same as above                                                                                                  |
| Quicklotz (US)                            | Yes, permissive robots.txt | No — product pages show only category/quantity, no line items                                     | No manifest data regardless of ToS                                                                             |
| Discount Wholesalers Inc (US)             | Yes                        | Only aggregate lot-level fields (UPC/barcode/qty/price — single-SKU bulk lots, not mixed pallets) | ToS explicitly bans scraping (Shopify's own boilerplate "spider, crawl, or scrape" clause)                     |

**The pattern:** liquidation sites split into two clusters — B2B auction/wholesale
platforms with real manifests but a login/ToS/anti-bot gate, and consumer-facing
"mystery pallet" stores that are freely public but deliberately withhold itemized
manifests as a trust/marketing choice. restock.ca's combination of both public
_and_ manifested is not common; nothing checked matches it.

## 3. Genuinely new findings (no ticket anywhere yet)

1. **No generic marketplace-connector abstraction.** restock.ca's scraper is a
   one-off implementation with no shared interface anything else could plug into.
2. **Embeddings-based duplicate detection** is named in `PROJ-PALLETIQ.md` and
   `ROADMAP.md`'s Phase 2 bullets but has never been broken into a ticket.
3. **The `bids` collection** (bid history, max-bid calculation) was in Phase 1's
   original data model but was never built and never explicitly re-homed to a
   later phase — dropped, not deferred.
4. **Lot-level scoring factors beyond profitability** — velocity, competition,
   demand — aren't in `PALLETIQ-042`/`ADR-0015`'s current spec, which covers
   margin/profit only.

## 4. Second-liquidator options (no clean winner — pick one)

- **(a) Scrape a "public but unmanifested" store anyway** (Maple Liquidation or
  Liquidation Deals) for lot-_browsing_ only — title/category/price/condition/
  image, `hasManifest: false` throughout. `PALLETIQ-052`'s data model already
  handles this gracefully (lot still visible, no Import button). Would double as
  the forcing function for finding #1 above (build the connector interface while
  building the second scraper, instead of a second one-off module) and needs its
  own ToS/robots.txt re-verification immediately before any code, per `ADR-0009`.
- **(b) Track-B-style manual watchlist** (`ADR-0009`'s existing precedent for
  B-Stock/Direct Liquidation) for 888 Lots or Via Trading — real manifest data via
  a human pasting fields in, fully compliant, no scraper.
- **(c) Don't widen lot supply yet.** `PALLETIQ-042` (lot profitability scoring)
  already applies to every lot restock.ca produces today — scoring the supply
  already flowing in may be higher-value than adding more unscored supply.

**Recommendation: (c) first, (a) as a cheap follow-on** if lot-browsing breadth
alone is worth a second scraper module. (b)'s manual-entry cost doesn't clearly
beat just shipping `PALLETIQ-042`.

## Next steps

- Owner picks a direction from §4; a `PALLETIQ-NNN` ticket gets opened for it via
  the normal Planning gate (`open-ticket`) — not opened speculatively here.
- Findings #2 and #3 in §3 get folded into `docs/BACKLOG.md`/`docs/ROADMAP.md` as
  scope notes so they're not lost, without forcing them into tickets before
  there's a reason to prioritize them.
