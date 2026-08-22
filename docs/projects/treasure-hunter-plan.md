# Treasure Hunter

**Pallet IQ · Feature Master Plan · v2 · August 2026**

A photo-in, price-out appraisal feature: snap an item, let Gemini identify it, run it through a cost-aware pricing waterfall, and surface an MSRP / sale price / liquidation price / saleability score — with the reasoning shown, not just the number.

_Status: exploratory · Owner: Ryan · Scope: pricing pipeline + data sourcing + product architecture_

> **Merged into PalletIQ's backlog (2026-08-22):** this plan's architecture is
> adopted in [`ADR-0011`](../adr/0011-treasure-hunter-identification-and-pricing-architecture.md)
> and broken into `PALLETIQ-025`–`030` in [`docs/BACKLOG.md`](../BACKLOG.md),
> sequenced as a parallel track alongside Phase 2 per `docs/ROADMAP.md`. The
> owner chose the **pre-purchase field scan** (see ADR-0011's Context) as the
> first use case over the post-receiving/pre-listing alternatives this plan's
> section 8 also names — those remain real, later, separate-persona tickets.
> This file is kept as-is below as the source spec; PalletIQ's own docs are
> the source of truth for what's actually scoped and shipped from here.

### What changed in v2

- **Corrected:** eBay closed logged-out access to sold/completed listings in July 2026 — the "search-engine workaround" idea from an earlier review doesn't survive that, and it's reflected below.
- The pricing step is now a cost-ordered **waterfall** with a caching layer, not a flat fan-out to every source on every scan.
- Google Search grounding is promoted from an identification helper to a parallel pricing input.
- Added a confidence score and a plain-language explanation panel to every price, and an explicit "we're not sure" workflow for unidentifiable items.
- Saleability formula extended with listing saturation and (when available) Amazon sales rank; seasonality and category velocity are named but deliberately deferred until there's outcome data to calibrate them against.
- Reframed the strategic goal: the identification engine is the reusable core asset, pricing is its first output, and Pallet IQ's own accumulated scan-and-outcome data is the long-term moat.

---

## 1. The shape of it

Four stages, and the hard part is still entirely stage three — identification is a solved problem with today's vision models, but getting real market data is the part every competitor in this space is quietly working around.

1. **Capture** — User shoots or uploads 2–5 photos: overall shot, label/tag, barcode, and any damage.
2. **Identify** — Gemini reads the photos (and a barcode if visible) and returns a structured item ID, category, and condition grade — a record designed to outlive this one feature.
3. **Price** — The identity runs down a cost-ordered waterfall of sources — cache first, cheap sources next, paid ones only if still uncertain — until confidence is high enough to stop.
4. **Score** — MSRP, sale price, liquidation price, and a saleability score get computed and shown, with the reasoning and comps behind them.

The reason to lead with this shape rather than a feature list: it forces the decisions the rest of the design depends on. Stage 3 no longer assumes any single source is the backbone — nothing on the market, including eBay's own official channels, reliably hands over structured sold-price data for free, and that gap got harder, not easier, in the past month (see [Where prices come from](#3-where-prices-actually-come-from)). So the architecture has to expect thin or partial data as the normal case, not the exception.

---

## 2. Identifying the item

Two paths into the same result, chosen automatically by what's visible in the photos — plus a third path for when neither is confident enough.

**Barcode-first, vision as fallback.** ListerLeo, the closest direct competitor in the liquidation-pallet space, does exactly this: scan a UPC/EAN when one's visible and get an exact, high-confidence product match; fall back to AI photo identification only for the "mystery items" — damaged packaging, private label, no barcode. Worth copying the split, because barcode matches are cheap, deterministic, and don't need Gemini at all — a UPC lookup (UPCitemdb-style service, or an Amazon ASIN match via Keepa) gets you brand, model, and often MSRP directly.

**Vision path, for everything else.** Send Gemini all captured photos in one multimodal call and ask for structured JSON back — the Gemini API's structured-output mode lets you pin the response to a schema (item name, brand, model, category, condition grade, notable damage, a confidence score per field) instead of parsing free text. Two things make this stronger than a plain vision call:

- **Grounding with Google Search.** Gemini can be given a live search tool so the identification call isn't limited to what the model memorized in training — it can look up "what is this exact product" and pull a current MSRP mention or spec sheet from a retailer or manufacturer page into its answer. This is one of the highest-leverage pieces of this whole pipeline, and it earns its own section below rather than staying a footnote to identification.
- **Condition from pixels.** Ask explicitly for a condition grade (e.g. New / Like New / Good / Fair / Damaged-for-parts) with a one-line justification citing what it saw — scuffs, missing parts, torn packaging. This grade becomes the multiplier that turns a comp median into an actual sale-price estimate later.

**The third path: say so when it doesn't know.** The original plan gated a single low-confidence result behind an editable "here's our best guess" card. Better: when confidence is low, ask Gemini for its top three candidate matches instead of forcing one answer, and let the user pick or correct rather than silently accepting a possibly-wrong identity. A private-label item with no barcode and generic packaging is common enough on a pallet that this shouldn't be treated as an edge case — it's a normal branch of the flow.

One more design decision worth making now rather than later: the structured record this stage produces — brand, model, category, condition, dimensions, notable features — should be stored in full, not just the fields pricing happens to need today. That record is the reusable asset the rest of this plan builds on (see [Beyond pricing](#8-beyond-pricing)).

---

## 3. Where prices actually come from

Every platform below was checked for whether it has a real, self-serve way to pull sold or current price data into an app — not just whether a human could look prices up manually.

**Status key:** 🟢 usable now, official or clean · 🟡 usable, but gated, paid, or needs verifying · 🔴 no public path — avoid direct integration

| Source                                                      | Covers                                               | What it actually gets you                                                                                                                                                                                                                                                                                                                                                                                                                                             | Status                    |
| ----------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **Google Search grounding** _(via Gemini — promoted in v2)_ | Retail, manufacturer, and general web pricing signal | Not a comps engine, but a live, parallel pricing input: Gemini can surface a current Walmart, Best Buy, Target, or manufacturer listing, or a discontinued/variant notice, directly into the identification response. Free to run alongside the identification call. Best for MSRP and retail cross-checks; treat anything it surfaces about a specific sold price as a low-confidence lead, not a comp, especially now that eBay's own sold pages are gated (below). | 🟢 usable                 |
| **eBay Browse API** _(official)_                            | Everything on eBay                                   | Free, OAuth, open to any registered app — but **active listings only**. Good for "what's it asking right now," and, combined with a calibrated discount ratio, the basis for a workable sold-price estimate (see the waterfall below).                                                                                                                                                                                                                                | 🟢 open                   |
| **eBay Marketplace Insights API** _(official)_              | Everything on eBay                                   | The API actually built for this — ~90 days of sold-item data. Free, but multiple developers on eBay's own community forums describe it as limited-release and hard to get approved for as a new application. **As of July 2026, eBay also closed logged-out public access to sold/completed listing pages entirely** — a sign the door is tightening, not opening. Needs a direct check with eBay before this gets designed around.                                   | 🟡 gated                  |
| **Terapeak** _(official, in-dashboard)_                     | Everything on eBay                                   | Free with an eBay Store subscription, 3 years of aggregated trend data — but it's a human dashboard inside Seller Hub, not an API. Fine for spot-checking a formula by hand, useless for automating the feature.                                                                                                                                                                                                                                                      | 🟡 manual only            |
| **Third-party sold-comp vendors** (e.g. hosted comp APIs)   | Everything on eBay                                   | Paid ($9–79/mo tiers seen in the market), built by scraping eBay themselves and reselling access. Pragmatic shortcut, but it makes your pricing pipeline dependent on someone else's scraper staying alive — and the July 2026 login wall is exactly the kind of change that breaks a scraper overnight.                                                                                                                                                              | 🟡 paid, fragile upstream |
| **DIY scraping**                                            | Everything on eBay                                   | Technically possible, but almost certainly a Terms of Service violation at commercial scale, plus ongoing maintenance as markup and access rules change. Not a foundation to build a product on.                                                                                                                                                                                                                                                                      | 🔴 avoid                  |
| **Amazon via Keepa** (third-party, well-established)        | Anything with an ASIN                                | Token-metered API: price history, sales rank, and buy-box price per ASIN. Reliable and widely used by resellers already — strong for barcoded retail goods, which is a large share of pallet contents.                                                                                                                                                                                                                                                                | 🟢 usable                 |
| **PriceCharting API** _(official)_                          | Games, trading cards, comics, Funko, LEGO, coins     | Paid subscription plus per-call token, but clean official data with condition-graded pricing (loose/complete/new/graded). Narrow category, but very good within it.                                                                                                                                                                                                                                                                                                   | 🟢 usable                 |
| **Discogs API** _(official)_                                | Vinyl, CDs, music media                              | Free tier, marketplace stats (low/median/high) per release. Narrow but clean and official.                                                                                                                                                                                                                                                                                                                                                                            | 🟢 usable                 |
| **Google Books API** _(official)_                           | ISBN-barcoded books                                  | Free, official, gives title/edition/list-price metadata by ISBN. Combine with Keepa (most books also have an ASIN) for an actual price signal — Google Books alone is closer to a catalog than a pricing source.                                                                                                                                                                                                                                                      | 🟢 usable                 |
| **WorthPoint**                                              | Antiques, art, collectibles                          | Strong price-guide data and a history of doing data partnerships with auction platforms — but no clear self-serve public API surfaced in this research. Worth a direct partnership conversation rather than assuming self-serve access.                                                                                                                                                                                                                               | 🟡 inquire directly       |
| **StockX**                                                  | Sneakers, streetwear, watches                        | A developer portal exists but no public documentation of open self-serve access was found — most integrations seen in the wild are unofficial. Treat as unverified until confirmed directly with StockX.                                                                                                                                                                                                                                                              | 🟡 unverified             |
| **Poshmark, Mercari, Depop, Whatnot, Facebook Marketplace** | Fashion, general secondhand                          | No official public APIs for any of these. What exists is unofficial scrapers with real ToS exposure. If these categories matter to Pallet IQ's users, the right move is a paid, compliant data vendor rather than a DIY integration.                                                                                                                                                                                                                                  | 🔴 no public path         |

**The practical read, updated:** nothing here hands you a free, open, automatable feed of real eBay sold prices — and as of July 2026, eBay is actively closing off even the casual, logged-out ways of checking a sold price by hand. That's worth treating as a signal, not just an obstacle: the space is consolidating around paid, approved access, which makes the case for a multi-source strategy stronger, not weaker. Grounding, Browse-API-plus-calibration, and the category specialists below aren't a workaround for v1 — they're likely to remain the steadier foundation even after any Marketplace Insights application clears.

---

## 4. The pricing waterfall

Instead of fanning out to every source on every scan, each item runs down a cost-ordered sequence and stops as soon as confidence is high enough — which controls spend and latency at the same time.

| Step | Source                                       | Notes                                                                                                                                                                             | Cost           |
| ---- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 0    | **Cache lookup**                             | Keyed by UPC / ASIN / identification fingerprint. A hit returns instantly for free — and on a pallet full of repeat consumer goods, this is where most scans should actually end. | instant · free |
| 1    | **Barcode / UPC exact match**                | Deterministic brand, model, and often MSRP, with no vision call needed.                                                                                                           | cheap          |
| 2    | **Keepa**                                    | If an ASIN resolves: price history, sales rank, buy-box price.                                                                                                                    | low cost       |
| 3    | **Google Search grounding**                  | Retail / manufacturer cross-check for MSRP and current availability, run alongside identification.                                                                                | low cost       |
| 4    | **eBay Browse API + calibration**            | Active-listing asking prices, adjusted by a learned asking-to-sold discount ratio (see below).                                                                                    | free           |
| 5    | **Category specialist**                      | PriceCharting, Discogs, or Google Books, conditional on category — see the table below.                                                                                           | paid, targeted |
| 6    | **Paid comps vendor / Marketplace Insights** | Only reached when confidence is still low after everything cheaper — the most expensive step, used sparingly by construction.                                                     | expensive      |

Stop as soon as confidence crosses the threshold. A barcoded Instant Pot resolves at step 0 or 1; a damaged, label-less item may need every step — and if it's still low-confidence after all of them, it goes to the "unknown item" workflow instead of a guess.

**The order isn't the same for every category:**

| Category                             | Waterfall order (cheap → expensive)                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Electronics & appliances             | Cache → UPC/Keepa → Grounding → Browse API + calibration → paid vendor if still uncertain                                       |
| Games, cards, collectibles           | Cache → PriceCharting → Browse API + calibration → Grounding (WorthPoint / forum mentions as a soft signal)                     |
| Media (books, vinyl, CDs)            | Cache → ISBN/barcode → Discogs or Google Books → Keepa if an ASIN exists → Grounding                                            |
| Tools & home goods, often unbarcoded | Cache → UPC if present → Grounding (retail/manufacturer search) → Browse API + calibration → unknown-item fallback              |
| Fashion, sneakers, streetwear        | Cache → Grounding → (Phase 4 only) compliant paid vendor — no direct StockX/Poshmark/Mercari integration until one is confirmed |

This is also where duplicate-photo cost gets handled: sending all of an item's photos to Gemini in one multimodal call, rather than one call per photo, means the waterfall runs once per item, not once per angle.

---

## 5. MSRP, sale price, liquidation price

Three numbers, each answering a different question, derived from whatever the waterfall returned, with different discipline applied to each.

|                  | MSRP (~100%)                                                                                                                                                                                                                  | Sale price (~55–80%)                                                                                                                                                                                                                                                                                             | Liquidation price (~15–35%)                                                                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Answers**      | "What it cost new."                                                                                                                                                                                                           | "What you'd list it for."                                                                                                                                                                                                                                                                                        | "What moves it fast."                                                                                                                                                                                        |
| **Derived from** | Cross-referenced from Gemini's grounded retail lookup, Keepa's list-price field when an ASIN exists, and any manufacturer page grounding surfaced. Take the consensus; flag as estimated when sources disagree or none exist. | Median (or trimmed mean) of whatever comp signal the waterfall reached — sold comps if a paid source was used, or Browse-API asking prices scaled by the calibrated discount ratio otherwise — then scaled again by condition: roughly 90–100% of median for Like New, 70–85% for Good, 40–60% for Fair/Damaged. | A lower percentile (roughly 10th–25th) of the comp distribution rather than the median, further discounted by condition. A "days to sell" slider could push this number down further for a faster clear-out. |

**The asking-to-sold calibration, concretely:** pull the median asking price of active comps from the Browse API (free, open, no approval needed). Apply a discount ratio — a reasonable starting default is roughly 75–85% of median asking, borrowed from how the gap between list and sold prices is generally discussed in resale — to approximate a sold price. Log the actual outcome every time a Pallet IQ user reports what they really sold an item for, and use that growing dataset to replace the borrowed default with a number calibrated on Pallet IQ's own users. This is the single technique that gets most of the value of sold-comps data without needing anything gated.

All three percentages above are starting points, not fixed constants, and the same logic applies to all of them: they should get calibrated against Pallet IQ's own outcome data as soon as there's enough of it to trust.

---

## 6. Comps, confidence & trust

Two panels, shown together: what the market is actually doing, and why the app landed on the number it did.

### The recent-sales panel

**Illustrative mockup — not real data**

| Median sold | Range   | Sell-through | Comps (90d) |
| ----------- | ------- | ------------ | ----------- |
| $34         | $22–$61 | 68%          | 17          |

| Item                        | Condition | Sold price |
| --------------------------- | --------- | ---------- |
| Item — Good condition       | Good      | $38        |
| Item — Like New, sealed box | Like New  | $52        |
| Item — Used, minor wear     | Fair      | $24        |

Sample count, date range, and whether the figures are true sold comps or calibrated asking prices should always be shown next to the stats — a median from 3 comps means something very different from one built on 40, and an estimate is not the same claim as a sale.

Sell-through rate deserves special mention: it's _sold count ÷ (sold + currently active)_ over the same window, and it's arguably more useful than the price stats alone — it's a direct read on demand, and it feeds straight into the saleability score below.

### The confidence & explanation panel

**High confidence example**
`$67 · 91% confidence`

- ✓ 18 comps from Browse API + calibration
- ✓ Keepa list price matches within 5%
- ✓ Grounding found the manufacturer's page
- ✓ Condition: Good, minor box wear

**Low confidence example**
`$24 · 38% confidence`

- ✗ Only 2 comparable listings found
- ✗ No barcode — vision ID only
- ✗ High price variance across comps
- ✓ Condition: Fair, visible damage

Same UI component either way — the checklist is just the inputs the waterfall and the saleability formula already computed, surfaced instead of hidden. This is also where the "unknown item" workflow hands off: below a set threshold, show the top candidate matches instead of a number at all.

---

## 7. The saleability score

Worth keeping as two separate numbers rather than one, because they answer different questions and a high score on one doesn't imply the other.

**Saleability** asks "how easily and predictably does this sell" — a liquidity read, independent of what it cost the reseller. **Profitability / ROI** asks "is it worth buying at this price," which needs a cost-basis input from the user (per-item cost from the pallet manifest) that saleability doesn't. Keeping them separate avoids the trap where a highly saleable item with thin margins reads as a "good" score when it isn't, or a slow-moving item with a huge markup reads as "bad" when it's actually fine.

```
saleability = 0.30·sell_through + 0.20·(1−price_variance) + 0.20·condition
            + 0.15·(1−listing_saturation) + 0.10·sales_rank + 0.05·sample_confidence
```

- **sell_through** — Normalized 0–1 sell-through rate from the comp window — the strongest single demand signal available.
- **price_variance** — Inverted spread of prices. Tightly clustered comps mean a predictable price; wildly scattered ones mean negotiation-driven pricing, strong condition-dependence, or a contaminated comp set.
- **condition** — Gemini's condition grade, mapped to 0–1. Better condition sells faster and closer to the comp median.
- **listing_saturation** — How many active competing listings exist right now (from the Browse API, already free) — a live competition signal distinct from historical sell-through. New for v2, and nearly free to add.
- **sales_rank** — Amazon sales rank via Keepa, when an ASIN exists. Also new for v2 and effectively free once Keepa is wired up — when there's no ASIN match, this term's weight redistributes proportionally across the others rather than zeroing out the score.
- **sample_confidence** — Discounts the whole score when the comp sample is thin (e.g. under 5–10 comps) — a "great" score from 2 data points should read as tentative, not certain.

**Deliberately left out of v1: seasonality and category velocity.** Both are real signals and worth naming now so they're not forgotten — but they need a time series Pallet IQ doesn't have yet. Adding untuned weights for them today is more likely to introduce noise than insight. Better to log the raw data quietly from day one (scan date, category, eventual outcome) and turn these terms on once there's enough history to calibrate them against reality, the same way the asking-to-sold discount ratio above should evolve.

Treat every weight here as a first guess, not gospel. Once Pallet IQ has enough scans with real outcomes attached — did it actually sell, how fast, for how much — that outcome data becomes the thing that recalibrates all of this against reality, and eventually a proprietary comp source that doesn't depend on anyone else's API access.

---

## 8. Beyond pricing

The most important repositioning in this revision: the thing being built isn't a pricing tool that happens to use AI — it's an identification engine that pricing is the first output of.

Every downstream feature below reads from the same structured item record that stage 2 already has to produce — brand, model, category, condition, notable features, dimensions. None of it requires new identification work, only new uses of work that's already being done. That's the argument for storing the full record from day one (noted back in [Identifying the item](#2-identifying-the-item)) even if only pricing ships first.

Reusable outputs from the same core engine: pricing & saleability (core, ships first), listing titles, marketplace/category recommendations, keywords & SEO tags, shipping weight & dimension estimates, defect descriptions, bundle suggestions, cross-listing recommendations, a profitability/ROI calculator, and inventory aging alerts.

And underneath all of it, the compounding asset: every scan that gets a real outcome attached — listed at what price, sold for what price, after how many days — adds a row to a dataset no third-party API can sell anyone else. That's what eventually funds the calibration this plan leans on repeatedly (the asking-to-sold ratio, the saleability weights, the seasonality terms it currently defers) and, at real scale, could make Pallet IQ less dependent on Keepa, PriceCharting, or eBay than any competitor relying purely on outside data. Worth stating as an explicit product goal rather than letting it stay an implicit side effect of shipping the feature.

---

## 9. Who's already doing this

Worth trying a few of these firsthand before locking the design — two in particular sketch almost exactly the feature described here, just not together.

**Closest structural match — ListerLeo.** Built specifically for liquidation/pallet resellers: barcode scan for known items, AI photo fallback for "mystery" items, plus manifest reconciliation against the shipment. The photo-ID path returns a title, condition, and market-value estimate, though its comp sourcing isn't publicly documented.

**Closest pricing match — Underpriced AI.** Photo → sold comps across eBay, Poshmark, Mercari, Depop, StockX, watches, and category price guides, in 10–15 seconds. Pay-per-scan pricing ($4 packs, or $5/mo for 20 scans) is a useful reference point for what this costs to run per scan.

**Amazon-scanner category — ScoutIQ / BOLO.** Long-established barcode-scan-to-profit tools for Amazon FBA resellers. Not photo-ID or liquidation-pallet oriented, but the category Pallet IQ would be adjacent to if it leans into the "scan before you buy" moment.

**Single-purpose scanners — ResalePal, ReSell AI, ResaleScan, ThriftFlip.** A recent wave of narrow "photo in, resale value out" app-store apps. Generally lighter-weight than the two above — worth a quick look for UX patterns, not for pricing methodology.

**Adjacent tools — Nifty AI, StreetPricer, Zik Analytics, Terapeak.** Not direct competitors — listing generation, repricing, and trend-analytics tools respectively. Useful reference points for the "beyond pricing" features above, once the core identification engine exists.

---

## 10. A build order that avoids the trap

The trap being: blocking v1 on eBay sold-data access that may take weeks to approve, or never arrive at the tier needed.

**Phase 0 — Identification + the schema it lives in.** Gemini vision + grounding + structured output, no pricing yet. Confirm identification accuracy and the low-confidence / top-3-candidates workflow on real pallet-item photos. Design the stored record generously — this is the reuse decision from [Beyond pricing](#8-beyond-pricing), and it's far cheaper to make now than to retrofit later.

**Phase 1 — The open-source waterfall, with caching and confidence UI.** Cache layer, barcode/UPC lookup, Grounding as a parallel MSRP check, and the Browse API + calibrated discount ratio as the "recent sales" proxy — clearly labeled as calibrated, not sold, data. Confidence and explanation panels ship alongside the first price, not after. This is a bigger Phase 1 than the original plan, but the caching and early-exit logic are what keep it affordable, and shipping trust signals from day one is cheaper than retrofitting them after users have learned not to trust the number.

**Phase 2 — Category specialists + background enrichment.** Keepa, PriceCharting, Discogs, and Google Books wired into category-conditional waterfall branches; Amazon sales rank added to the saleability formula. Slow or paid steps move to background enrichment — show an instant estimate, refine it over the next minute, notify on update — now that the waterfall makes it clear which steps are actually slow.

**Phase 3 — Real eBay sold-comps, and the start of the flywheel.** Apply for Marketplace Insights API access in parallel with evaluating a paid comps vendor, informed by the July 2026 tightening as a signal to plan for either outcome. In parallel, start formally logging outcome data (listed price, sold price, days-to-sell) — this is where the proprietary comps database actually begins. Vector-embedding-based fuzzy matching for damaged/obscure items becomes worthwhile once the catalog is large enough to search against.

**Phase 4 — Fashion & sneaker categories, first "beyond pricing" features.** StockX, Poshmark, Mercari — only through a compliant paid data vendor or direct partnership, never DIY scraping. Also the point where listing-title generation and cross-listing recommendations become reasonable to build, since the identification schema has matured through three prior phases of real use.

---

## 11. Costs & guardrails

**This isn't free per scan, but the waterfall is the mitigation, not just an awareness item.** A Gemini vision+grounding call, plus any combination of Keepa tokens, PriceCharting calls, and a paid comps vendor, adds up per item — the cache-first, stop-when-confident design in [The pricing waterfall](#4-the-pricing-waterfall) is what keeps that bounded, since a caching hit and an early stop are both free. Still worth modeling cost-per-scan explicitly and considering a metered or subscription tier the way Underpriced AI does.

**Scraping is a legal question, not just a technical one.** Anywhere this plan says "no public path" — Mercari, Poshmark, Facebook Marketplace, most likely StockX — building a scraper anyway is a real Terms of Service risk at commercial scale, and eBay's July 2026 lockdown is a live reminder that platforms tighten these doors without warning. Worth a quick check with counsel before committing engineering time to any workaround in that category.

---

## 12. Open questions worth answering before this gets designed in detail

- Given eBay closed logged-out sold-listing access in July 2026, is that a sign they're pushing more developers toward paid or approved API access, or an unrelated tightening? Worth asking eBay Developer support directly, alongside the standing question of Marketplace Insights approval odds and timeline for a new application.
- Does StockX have any self-serve developer access in practice, or is the developer portal effectively partner-only? Worth checking directly if sneakers/streetwear are a meaningful share of Pallet IQ's typical pallet contents.
- Is a WorthPoint data partnership realistic at Pallet IQ's stage, given they've done similar integrations with auction platforms before?
- What share of a typical pallet is barcoded retail goods (where Keepa/UPC lookup does most of the work cheaply) versus loose/damaged/private-label items that need the full Gemini vision path? That ratio should drive which waterfall steps and which phase get the most polish first.
- How large a sample of known-outcome items is needed before the asking-to-sold calibration ratio and the saleability weights are trustworthy enough to act on? Worth designing Phase 1 with a deliberate, small calibration period in mind rather than assuming the borrowed defaults are good enough indefinitely.

---

### Sources consulted across v1 and v2 of this plan

- [ListerLeo — for liquidation resellers](https://listerleo.com/for/resellers)
- [Underpriced AI](https://underpricedai.com/)
- [Underpriced AI — AI pricing tools for resellers](https://underpricedai.com/blog/ai-pricing-tools-for-resellers)
- [eBay Marketplace Insights API docs](https://developer.ebay.com/api-docs/buy/marketplace_insights/resources/methods)
- [eBay Community — Marketplace Insights API access](https://community.ebay.com/forum/talk-to-your-fellow-developers-57970/topic/marketplace-insights-api-access-168586/)
- [SoldComps — eBay sold-data API alternatives](https://sold-comps.com/alternatives)
- [OpenWeb Ninja — How to get eBay sold and completed listings (2026)](https://www.openwebninja.com/blog/how-to-get-ebay-sold-and-completed-listings)
- [SearchDome — eBay sold listings login requirement (July 2026 change)](https://www.searchdome.com/ebay/help/ebay-sold-listings)
- [PriceCharting API documentation](https://www.pricecharting.com/api-documentation)
- [Keepa API documentation](https://keepa.com/api-docs/)
- [Discogs API documentation](https://www.discogs.com/developers)
- [WorthPoint](https://www.worthpoint.com/)
- [StockX Developer Portal](https://developer.stockx.com/)
- [Gemini API — Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search)
- [Gemini API — Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini API — Image understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
