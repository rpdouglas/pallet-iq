# ADR-0011: Treasure Hunter — item identification & pricing waterfall architecture

**Status:** Accepted
**Date:** 2026-08-22

## Context

An external feature master plan, `docs/projects/treasure-hunter-plan.md`
("Treasure Hunter," v2, August 2026, Ryan), proposes a photo-in/price-out
item appraisal capability: capture 2–5 photos of an item, have Gemini
identify it (vision + Google Search grounding + structured output), run the
identity down a cost-ordered waterfall of pricing sources (cache → UPC/Keepa
→ grounding → eBay Browse API + calibration → category specialists → paid
comps as a last resort), and surface MSRP / sale price / liquidation price /
a saleability score, with the reasoning and comps shown alongside every
number. The plan's own section 8 reframes the strategic goal: the
identification engine is the reusable core asset; pricing is its first
output; PalletIQ's own accumulated scan-and-outcome data is the long-term
moat.

Reviewed against `docs/ROADMAP.md`, `docs/BACKLOG.md`, and
`docs/projects/PROJ-PALLETIQ.md` per the Planning gate. Resolved with the
owner via `AskUserQuestion`: the plan itself doesn't pin down _when_ in
PalletIQ's existing workflow a user reaches for this, and that choice
changes phase placement, RBAC scope, and UI pattern materially. The owner
chose the **pre-purchase field scan** — a Buyer standing at a liquidation
site or auction inspecting an unmanifested/loose pallet, scanning items on
the spot to decide buy/bid/pass before money changes hands — over the
post-receiving "mystery item" workflow (closer to ListerLeo's own design,
per the plan's section 9) and the pre-listing pricing-tool workflow (Store
Manager-facing). Both of the latter are real and named in the plan's own
section 8 "Beyond pricing," sequenced here as later, separate tickets
against a different persona rather than folded into the first slice.

This is new architectural ground for PalletIQ on four axes simultaneously:

1. **First real Gemini/Vertex AI SDK call in the codebase.** Governance
   Check II has been "not yet applicable" since `PALLETIQ-005` shipped only
   a dummy async task (`CLAUDE.md`'s own note). This is what makes it
   applicable for real.
2. **First feature integrating paid/rate-limited third-party pricing APIs**
   (Keepa, PriceCharting, Discogs, Google Books, eBay Browse API) — a new
   secret-provisioning surface beyond Stripe.
3. **First feature requiring the Buyer persona on a genuinely mobile-first,
   camera-driven surface.** `docs/design/mobile-responsive.md` currently
   scopes mobile-first exclusively to Warehouse and names "Buyer desktop
   dashboard target" as the `lg` breakpoint's primary consumer — a phone-
   in-hand field scan standing in a warehouse aisle can't be desktop-first.
4. **First real writer for `product_intelligence`** — the cross-tenant
   collection `PROJ-PALLETIQ.md` already modeled (Phase 1) as the
   platform's "core long-term moat," but which has had rules and tests
   since `PALLETIQ-001` and never a real writer.

## Decision

**Adopt the plan's four-stage shape (Capture → Identify → Price → Score)**,
phased into six tickets (`PALLETIQ-025`–`030`) mapped onto the plan's own
"build order that avoids the trap" (section 10), sequenced as a **pulled-
forward parallel track** alongside Roadmap Phase 2 (Intelligence) and
feeding Phase 4's already-named "Pricing intelligence engine" and "Listing
copy generation" bullets — the same pull-forward posture `ADR-0009` used for
the restock.ca scraper: not gated on Phase 2/3 completing first, since
nothing about item identification or pricing depends on pallet-level
scoring or barcode/mobile-receiving shipping first.

**New Firestore collections:**

- `tenants/{tenantId}/item_scans/{scanId}` (tenant-scoped) — the structured
  identification + pricing record per scan: photo refs, Gemini's structured
  identification output (brand/model/category/condition/dimensions/notable
  features, stored in full per the plan's section 2 reuse argument, not just
  the fields pricing needs today), confidence, the waterfall's pricing
  result, saleability score, and (from `PALLETIQ-028` onward) self-reported
  outcome fields. `read: isTenantMember`, `write: isOwnerOrBuyer` — reusing
  `ADR-0006`'s existing helper, the same shape as `imports`/`manifests`/
  `watchlist_lots`, matching the chosen Buyer-primary use case exactly.
- `product_price_cache` (global, cross-tenant) — keyed by UPC/ASIN/
  identification fingerprint, the waterfall's step-0 cache. Same "separate
  security domain" shape `ADR-0009` established for `restock_lots`/
  `product_intelligence`: a cached price for a given UPC isn't tenant-
  specific, so one cache serves every tenant rather than N duplicate
  writes. `read: isSignedIn()`, `write: if false` (Cloud Functions only).
- **No new collection for the outcome-data flywheel** (plan sections 5, 7,
  8). It writes into `product_intelligence` — the collection
  `PROJ-PALLETIQ.md` already modeled for exactly this purpose. `PALLETIQ-028`
  is what actually populates it for the first time, several phases earlier
  than the original Phase 2 "seed `product_intelligence`" bullet implied.
- New Cloud Storage path `tenants/{tenantId}/item_scans/{scanId}/...` for
  captured photos, mirroring `PALLETIQ-008`'s manifests storage path
  (size limits, same defense-in-depth posture as `ADR-0008`).

**Async AI boundary (Check II):** the Gemini vision+grounding call and any
external pricing-API call in the waterfall run through the existing Cloud
Tasks pipeline (`ai_tasks`, `PALLETIQ-005`/`ADR-0004`), extended with a new
task type — never inline on the capture request. The client gets an
immediate "scanning…" response and polls/listens for the `item_scans` doc
to update, exactly the pattern the plan's own section 10 recommends ("show
an instant estimate, refine it over the next minute, notify on update") and
exactly what Check II requires now that it has a real consumer. Deterministic,
non-AI waterfall steps (a cache hit, a UPC exact match) resolve synchronously
in the enqueue callable's own response when they hit — no need to round-trip
through the task queue for a cache hit.

**Design-system exception, decided now rather than discovered mid-
implementation:** `docs/design/mobile-responsive.md` gets a narrow,
explicitly-scoped addendum — the capture flow specifically (photo/barcode
capture and the resulting scan-result view) is mobile-first for Buyer,
reusing Warehouse's existing bottom-tab-bar / 44×44 touch-target / single-
column patterns verbatim rather than inventing new ones. Every other Buyer
surface (dashboard, vendors, manifests, inventory, watchlist) stays desktop-
first, unchanged.

**Secrets** (via `defineSecret`, provisioned just-in-time per ticket, per
`PALLETIQ-004`/`ADR-0005`'s convention — not upfront): `GEMINI_API_KEY`
(`PALLETIQ-025`; `PALLETIQ-004`'s own scope note already anticipated this as
a future consumer), `KEEPA_API_KEY`, `PRICECHARTING_API_KEY` (`PALLETIQ-027`),
`EBAY_APP_ID`/`EBAY_CERT_ID` (Browse API OAuth client credentials,
`PALLETIQ-026`). Discogs and Google Books' free/anonymous tiers need no
secret for v1.

**Explainable-scoring reuse, not a new pattern:** the confidence &
explanation panel (plan section 6) and the saleability score (section 7)
are built as instances of `docs/design/explainable-scoring.md`'s existing
score-badge + factor-breakdown + provenance-labeling pattern — that
addendum already specifies exactly the shape the plan independently arrives
at (down to "same UI component either way" for high/low confidence, and
labeling factors sourced from `product_intelligence` as a trust signal).

**Waterfall design, vendor list, and category-conditional ordering are
adopted as specified** in the plan's sections 3–4 without modification —
that per-vendor Terms-of-Service/API-access research is sound and doesn't
need re-litigating here.

## Alternatives considered

- **One large ticket instead of six phased ones.** Rejected — mirrors the
  plan's own stated reasoning (avoid blocking v1 on gated eBay access) and
  this repo's precedent of ticket-sized, independently-shippable slices
  (`PALLETIQ-008`/`009`/`011`/`012` each built on the last).
- **Scoping the first ticket to the post-receiving "mystery item" workflow**
  instead (closer to ListerLeo's design, and an easier RBAC/mobile story
  since Warehouse already has a mobile-first pattern). Put to the owner
  directly; the pre-purchase field scan was chosen as the higher-value,
  harder problem to solve first — logged so a future reader doesn't wonder
  why the "easier" path wasn't taken.
- **Keeping Buyer fully desktop-first**, shipping capture as an unoptimized
  mobile-browser afterthought. Rejected — a field scan used one-handed in a
  warehouse aisle is unusable as a shrunk desktop layout, and Warehouse's
  existing mobile pattern already solves this class of problem cheaply.
- **One unified `item_scans` schema covering identification, pricing, and
  outcome data from ticket one.** Rejected for the same reason `ADR-0009`
  rejected a single unified `sourcing_lots` collection — outcome data has
  no real consumer until `PALLETIQ-028`, and modeling it speculatively risks
  getting the shape wrong before real usage validates it.
- **Treating this entirely as Phase 4 scope** (since "pricing intelligence
  engine" is a literal Phase 4 bullet) and waiting for Phase 2/3 to
  complete first. Rejected — same pull-forward reasoning `ADR-0009` used:
  no real dependency runs in either direction, and waiting loses real
  buyer value for no architectural reason.

## Consequences

- Check II (async AI boundary) becomes real/applicable for the first time —
  `CLAUDE.md`'s "Not yet applicable" note for Check II needs updating once
  `PALLETIQ-025` ships.
- `docs/design/mobile-responsive.md` needs the Buyer-capture-flow addendum
  written before `PALLETIQ-025`'s UI work starts.
- `docs/personas/buyer.md` gains `item_scans` (read/write) and
  `product_price_cache` (read) to its permission lists.
- New ongoing per-scan cost (Gemini + metered third-party APIs) with no
  usage-metering _enforcement_ yet — `PALLETIQ-003`'s `incrementUsage` hook
  exists but nothing calls it. Flagged, not blocking: a real cost-control
  mechanism (rate limit, tier gate) will likely be needed before this
  reaches broad usage, tracked as a fold-forward note rather than a
  requirement for `PALLETIQ-025`/`026`.
- External vendor access is uneven and some of it may not clear at all —
  eBay Marketplace Insights approval odds, and StockX/WorthPoint self-serve
  access, are all unconfirmed per the plan's own section 12. `PALLETIQ-028`/
  `029` each carry an explicit pre-flight-check requirement before their own
  implementation starts, the same discipline `ADR-0009` applied to
  restock.ca/B-Stock/Direct Liquidation's Terms of Use — a ticket doesn't
  get scoped around access that never materializes.
- `product_intelligence` gets its first real writer several phases earlier
  than `PROJ-PALLETIQ.md`'s original "seed `product_intelligence`" timeline
  implied — reflected in this PR's `PROJ-PALLETIQ.md` update.
- The plan's own open questions (section 12) aren't resolved by this ADR —
  they're pre-flight checks the relevant tickets must complete before their
  own implementation starts, not a blocker to opening `PALLETIQ-025`/`026`
  now.
