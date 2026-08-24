# Roadmap

Status legend: ⚪ Planned · 🟡 In Progress · 🟢 Complete

Full scope, QA criteria, and rationale for each phase live in
[`docs/projects/PROJ-PALLETIQ.md`](./projects/PROJ-PALLETIQ.md). This file
tracks phase-level status only — update it at phase boundaries, not per
commit.

## ⚪ Phase 0 — Foundation Prerequisites (2–3 weeks)

Multi-tenant Firestore schema + rules, auth custom claims + RBAC
scaffolding, Stripe billing (Free/Pro), Secret Manager wiring, async AI
task pipeline scaffolding.

## 🟢 Phase 1 — Core Sourcing Loop (6–8 weeks)

Auth + tenant onboarding, vendor management (2–3 vendors, 1–2 manifest
formats), manifest import → normalization, landed cost calculator, basic
dashboard, basic inventory lifecycle (Purchased → Received → Listed →
Sold).

## ⚪ Phase 2 — Intelligence (8–10 weeks)

Async batched Gemini product analysis, explainable pallet scoring,
duplicate detection via embeddings, ROI reconciliation workflow, manifest
comparison UI, pass/reject logging, seed `product_intelligence`.

**Pull-forward in progress:** `PALLETIQ-025`/`026`/`027`
("Treasure Hunter" — a photo-in/price-out item identification and pricing
feature for the Buyer's pre-purchase field-scan workflow) are the first
real implementation of this phase's "Async batched Gemini product
analysis" bullet, running as a parallel track alongside the rest of Phase
2's pallet-level scoring work — neither blocks nor is blocked by the
other. `PALLETIQ-025`/`026`/`027` (item identification, pricing waterfall
v1, category-specialist pricing + saleability score) are all **Done** -
this pull-forward track is complete through Phase 2's slice of the work;
`028`/`029`/`030` continue it under Phase 4 (see below). `PALLETIQ-033`
(a small follow-up fixing a wiring gap `027`'s own Check IV audit
logged — the saleability-failed retry button was re-running the full
pricing waterfall instead of just re-scoring), `PALLETIQ-034` (an
owner-reported bug fix — a second capture photo silently failed to add
— plus a "choose from device" picker alongside the existing camera-only
capture), and `PALLETIQ-035` (replaced the deterministic multi-vendor
pricing waterfall — eBay Browse API/Keepa/PriceCharting/Discogs/Google
Books — with a single SOP-modeled Gemini live-research call, targeting
Ontario/Canada instead of the prior US-only vendor stack; see
`ADR-0012`), `PALLETIQ-036` (fixed a multi-photo capture hang caused
by uncompressed photo uploads, plus the first real implementation of
`docs/design/components.md`'s documented-but-unbuilt spinner pattern), and
`PALLETIQ-038` (split pricing research's single sequential Gemini call
into three concurrent legs plus a synthesis call, cutting worst-case
wall-clock and making a single failed leg degrade gracefully instead of
failing the whole price; see `ADR-0013`), and `PALLETIQ-037` (server-side
verification that Kijiji/eBay comp URLs actually resolve to their
claimed domain before a `PricingResult` is cached or stored, nulling a
failed comp's link rather than dropping the comp) are also all **Done**.
This pull-forward track's Treasure Hunter pricing-research slice
(`PALLETIQ-025`/`026`/`027`/`033`/`034`/`035`/`036`/`037`/`038`) is now
fully complete. See `ADR-0011` and `docs/projects/PROJ-PALLETIQ.md`'s
Phase 2 section for the full rationale, and `docs/BACKLOG.md` for scope.

## ⚪ Phase 3 — Operations (6–8 weeks)

Sales tracking, full inventory workflow (+ Returned), barcode scanning,
mobile receiving, bin locations, vendor scorecarding, aging inventory
alerts, RBAC enforcement in UI, accounting/POS integrations.

## ⚪ Phase 4 — Automation & Growth (8–12 weeks)

Automated vendor ingestion, pricing intelligence engine, cross-tenant
benchmarking, negotiation assistant, listing copy generation, marketplace
integrations, multi-tenant SaaS polish.

**Pull-forward in progress:** `PALLETIQ-020`/`021` (restock.ca scheduled
scraper + compliant manual watchlist for B-Stock/Direct Liquidation) and
`031`/`032` (two real bugs found via live verification - a dropped-lot
title-parsing gap and an hourly production OOM crash loop, both fixed) are
a narrow slice of "automated vendor ingestion" pulled forward from this
phase, tracked in `docs/BACKLOG.md` - all **Done**. `PALLETIQ-039` (the
`restock_lots` browse UI `PALLETIQ-020` itself deferred) and `040` (a
scraper category-field data-quality fix found via `039`'s own live
verification) are the same pull-forward, both **Done** as of this
update. `PALLETIQ-028`/
`029`/`030` (the later half of the "Treasure Hunter" item-identification
track — real eBay sold-comps/outcome-data flywheel, fashion/sneaker
categories, and the first "beyond pricing" listing-copy feature) are a
slice of this phase's "Pricing intelligence engine" and "Listing copy
generation" bullets pulled forward the same way (see `ADR-0011`;
`PALLETIQ-025`/`026`/`027`, the earlier half of the same track, are noted
under Phase 2 instead). All of these run as a parallel track alongside
Phase 2 — not blocking or blocked by it — so don't read this phase's ⚪
status as meaning no work has started; see `ADR-0009`/`ADR-0011` and
`docs/projects/PROJ-PALLETIQ.md`'s Phase 4 section for the full rationale.

## Deferred (unplanned phase)

Image analysis / pallet fill-level estimation, white-labeling + Enterprise
API access, offline mode, market forecasting / demand trend prediction.
