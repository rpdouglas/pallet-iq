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
other. `PALLETIQ-025` (item identification) is **Done**; `026`/`027`
(pricing waterfall + saleability score) are still Planned. See `ADR-0011`
and `docs/projects/PROJ-PALLETIQ.md`'s Phase 2 section for the full
rationale, and `docs/BACKLOG.md` for scope.

## ⚪ Phase 3 — Operations (6–8 weeks)

Sales tracking, full inventory workflow (+ Returned), barcode scanning,
mobile receiving, bin locations, vendor scorecarding, aging inventory
alerts, RBAC enforcement in UI, accounting/POS integrations.

## ⚪ Phase 4 — Automation & Growth (8–12 weeks)

Automated vendor ingestion, pricing intelligence engine, cross-tenant
benchmarking, negotiation assistant, listing copy generation, marketplace
integrations, multi-tenant SaaS polish.

**Pull-forward in progress (Planned):** `PALLETIQ-020`/`021` (restock.ca
scheduled scraper + compliant manual watchlist for B-Stock/Direct
Liquidation) are a narrow slice of "automated vendor ingestion" pulled
forward from this phase, tracked in `docs/BACKLOG.md`. `PALLETIQ-028`/
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
