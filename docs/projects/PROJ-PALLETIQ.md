# PROJ-PALLETIQ: PalletIQ — Liquidation Sourcing & Inventory Intelligence Platform

**Status:** ⚪ Planned
**Primary Persona:** All (Buyer, Warehouse Staff, Store Manager, Owner/Admin)
**Wave:** 1 (Foundation — see Roadmap)

---

## Objective

> Give liquidation buyers the same analytical tools large retailers use to evaluate inventory — answering "Should I buy this pallet?" with an explainable, data-backed recommendation before money changes hands.

PalletIQ ingests manifests from multiple liquidation vendors, normalizes them into one schema, enriches them with AI and historical outcome data, and produces a transparent buy/bid/negotiate/pass recommendation with projected ROI. It is designed from the outset as a multi-tenant SaaS product, not a single-user tool retrofitted later.

---

## Personas Involved

| Persona | Role | Primary Needs |
|---|---|---|
| **Buyer** | Sources and evaluates pallets/manifests, makes purchase decisions | Fast, trustworthy buy/pass recommendations; ROI projections; bid guidance |
| **Warehouse** | Receives, scans, and reconciles physical inventory | Mobile scanning, bin locations, manifest-vs-received reconciliation |
| **Store Manager** | Lists, prices, and sells inventory across channels | Pricing recommendations, aging alerts, channel routing |
| **Owner/Admin** | Manages team, vendors, budget, and subscription | Cash flow visibility, vendor scorecards, RBAC, billing |

---

## Architecture Goals

- Modular, cloud-native, **multi-tenant from Phase 1** (not retrofitted later)
- AI-first, but AI runs **asynchronously** off the import path, not inline per-request
- Explainable scoring — every AI recommendation shows its contributing factors
- Extensible vendor importer pattern — new vendor = new importer mapping to common schema
- Offline-capable only where it earns its complexity (deferred past MVP — see Deferred Features)

---

## Technology Stack

**Frontend**
- React 19, TypeScript, Vite
- Tailwind CSS v4
- TanStack Query, React Router v7
- React Hook Form, Zod

**Backend**
- Firebase Authentication (with custom claims for `tenantId` + role)
- Firestore (tenant-scoped collections + security rules from day one)
- Cloud Functions (including async task queue via Cloud Tasks/Pub-Sub for AI processing)
- Cloud Storage (manifest uploads, images)
- Firebase Hosting
- Cloud Scheduler
- **Secret Manager** — for third-party credentials (marketplace API keys, vendor logins) — *added per security review*
- **Stripe** — subscription billing and usage metering — *added per SaaS review*

**AI**
- Gemini API (async, batched, cached by UPC/ASIN)
- Vertex AI (future)
- Embeddings for semantic product matching and duplicate detection

---

## Firestore Data Model (Revised)

All tenant-owned collections scoped under `tenants/{tenantId}/...` or carry an indexed `tenantId` field enforced by security rules.

**Core (tenant-scoped):**
`vendors`, `imports`, `imports_errors`, `manifests` → `manifests/{id}/lineItems` (subcollection), `pallets`, `inventory`, `sales`, `analytics_rollups`, `favorites`, `watchlists`, `notes`, `tasks`, `settings`, `locations`, `bids`, `claims`

**New — added by this review:**
- `bids` — bid history, max-bid calculations, outcomes
- `claims` — vendor disputes (wrong condition, missing/damaged items)
- `locations` — multi-warehouse/store support
- `audit_logs` — access and financial-action logging
- `subscriptions` — Stripe billing state, usage counters
- `api_keys` — scoped, rotatable keys for Enterprise tier
- `imports_errors` — failed/partial row tracking for manifest parsing

**Global / cross-tenant (anonymized, separate security domain):**
- `product_intelligence` — pooled, anonymized outcome data (UPC/ASIN → historical resale price, sell-through time) across all tenants. This is the platform's core long-term moat and must be modeled from Phase 1 even if population starts small.

**Users:**
`users` — includes `tenantId` and `role` (Owner, Manager, Warehouse, Buyer) as custom claims mirrored into the doc for query convenience.

**Security rules requirement:** every collection above must have explicit tenant-isolation + role-based rules before Phase 1 exits QA. No collection ships without a corresponding rules test.

---

## Phase 0 — Foundation Prerequisites (2–3 weeks) *(new phase, added by review)*

Not present in the original plan; added because retrofitting these later is materially more expensive than building them first.

- Multi-tenant Firestore schema + security rules (with automated rules tests)
- Auth custom claims (`tenantId`, `role`) and RBAC scaffolding
- Stripe billing integration (Free/Pro tiers minimum; usage metering hooks)
- Secret Manager wiring for third-party credentials
- Async AI task pipeline scaffolding (Cloud Tasks/Pub-Sub) — even if only one Gemini call type exists yet

**QA / Verification:** Security rules unit tests pass for cross-tenant read/write denial; a test Stripe subscription can be created, upgraded, and canceled end-to-end; a dummy async task completes via the queue (not inline).

---

## Phase 1 — Core Sourcing Loop (6–8 weeks, narrowed MVP)

Original plan aimed at broad vendor/format coverage; narrowed here to validate the core value loop faster.

- Authentication, tenant onboarding flow (including empty-state UX)
- Vendor management for **2–3 vendors** and **1–2 manifest formats** (e.g., CSV + XLSX) to prove the full pipeline before generalizing
- Manifest import → data normalization → common product schema
- Landed cost calculator (purchase price + freight/fees, not just purchase price) — *added per review*
- Basic dashboard (today's opportunities, recent imports, inventory totals)
- Basic inventory lifecycle tracking (Purchased → Received → Listed → Sold)

**QA / Verification:** A real vendor manifest in each supported format imports cleanly end-to-end with correct landed cost per unit; malformed/corrupt files are rejected safely (upload security checks per review — size limits, sandboxed parsing, no macro execution).

---

## Phase 2 — Intelligence (8–10 weeks)

- Async, batched Gemini product analysis (cached by UPC/ASIN — no duplicate re-analysis across imports)
- Explainable pallet scoring engine (factor breakdown UI, not a black-box number)
- Duplicate detection via embeddings
- Historical ROI tracking + reconciliation workflow: manifest-claimed vs. actually-received vs. actually-sold — *added per review, closes the AI feedback loop*
- Manifest comparison UI (side-by-side, not just AI-assistant text) — *added per review*
- Pass/reject logging with reason capture — *added per review, feeds AI training data*
- Seed `product_intelligence` cross-tenant collection (anonymized) from early outcome data

**QA / Verification:** Pallet score factor breakdown renders correctly for a sample pallet; reconciliation flags a discrepancy when received quantity differs from manifest; duplicate detection correctly flags a known duplicate pair in test data.

---

## Phase 3 — Operations (6–8 weeks)

- Sales tracking, full inventory workflow (add Returned status)
- Barcode scanning, mobile receiving flow (mobile-first for warehouse, desktop-first for buying decisions — explicit split per UX review)
- Bin locations, multi-location/warehouse support
- Vendor scorecarding (fulfillment accuracy, shipping speed, manifest honesty over time) — *added per review*
- Aging inventory alerts (unlisted/unsold past threshold → markdown suggestion) — *added per review*
- RBAC enforcement in UI (warehouse staff can't see purchase costs, etc.)
- Accounting/POS integrations: QuickBooks, ShipStation, Pirate Ship

**QA / Verification:** A warehouse-role user cannot view purchase cost fields in the UI or via direct Firestore query; an item aging past the configured threshold triggers an alert; vendor scorecard updates after a new sale/claim is recorded.

---

## Phase 4 — Automation & Growth (8–12 weeks)

- Automated vendor ingestion (API/email/watch folders)
- Pricing intelligence engine (marketplace price checks, cached/rate-limited, not live-per-request)
- Cross-tenant benchmarking features ("your ROI vs. similar sellers") using `product_intelligence`
- Negotiation assistant (counter-offer suggestions from vendor discount history) — *added per review*
- Listing copy generation (titles/descriptions from manifest + image data) — *added per review*
- Marketplace integrations: Shopify, Amazon Seller Central, eBay, Facebook Marketplace
- Multi-tenant SaaS polish: usage metering enforcement, tenant data export/portability

**QA / Verification:** Cross-tenant benchmark figure excludes any tenant-identifying data (privacy audit); pricing engine respects cached refresh interval and does not exceed marketplace rate limits under load test.

---

## Deferred Features (explicitly out of scope until a later, unplanned phase)

- Image analysis / pallet fill-level estimation from photos
- White-labeling and Enterprise API access (wait for validated Business-tier demand)
- Offline mode (adds sync-conflict complexity; defer until receiving workflow is stable)
- Market forecasting / demand trend prediction (needs accumulated outcome history to be trustworthy)

---

## Competitive Advantages (explicit strategy, not incidental)

1. **Anonymized cross-tenant outcome data** (`product_intelligence`) — the platform's strongest long-term moat; modeled from Phase 1, populated from Phase 2 onward.
2. **Explainable scoring** — factor-level transparency as a first-class UX requirement, not an afterthought.
3. **Vendor reliability scoring** — a data product with value beyond the core tool.
4. **Full lifecycle coverage** (source → decide → receive → sell → learn) vs. competitors that only solve manifest lookup.

---

## Risks & Mitigations Carried Forward from Review

| Risk | Mitigation |
|---|---|
| Retrofitting multi-tenancy later | Built into Phase 0, not deferred |
| Synchronous AI calls at import time don't scale | Async/batched/cached pipeline from Phase 0 scaffolding |
| Malicious manifest uploads (zip bombs, macros) | Sandboxed parsing, size limits, validation in Phase 1 |
| Unprotected Firestore collections | No collection ships without security rules + rules tests (governance Check I applies) |
| Billing absent despite pricing tiers | Stripe integrated in Phase 0, not Phase 4 |

---

*Note: This plan assumes the standard MRT project-spec conventions (Status / Primary Persona / Objective / Phase-based Implementation / QA-Verification, tenant-scoped Firestore collections validated against firestore.rules). If your actual template differs, share it and I'll reformat to match exactly.*
