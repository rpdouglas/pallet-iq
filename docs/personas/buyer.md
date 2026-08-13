# Buyer

## Role

Sources and evaluates liquidation pallets/manifests and makes purchase
decisions. The primary consumer of PalletIQ's core value proposition —
buy/bid/negotiate/pass recommendations.

## Primary needs

- Fast, trustworthy buy/pass recommendations with explainable scoring
- ROI projections based on landed cost, not just purchase price
- Bid guidance (max-bid calculations from historical outcome data)
- Manifest comparison across vendors
- Visibility into product-level historical resale data (`product_intelligence`)

## Permission boundaries (RBAC)

Custom claim: `role: "buyer"`

- **Read:** vendors, imports, manifests, pallets, inventory (read-only),
  bids, favorites, watchlists, notes, tasks, `product_intelligence`
  (cross-tenant, anonymized), `restock_lots` (cross-tenant, scraped
  sourcing feed — see `ADR-0009`), `watchlist_lots`
- **Write:** `imports`, `manifests` (importing/uploading manifests - see
  `ADR-0006`; this is Buyer's core daily workflow, not an admin task like
  vendor management), own bids, favorites, watchlists, notes, pass/reject
  logging, `watchlist_lots` (manual sourcing watchlist entries - see
  `ADR-0009`; `restock_lots` itself is Cloud-Functions-write-only, no
  client, including Buyer, writes to it directly)
- **No access to:** `settings` (tenant config), `subscriptions` (billing),
  `api_keys`, `audit_logs`, team/user management

Purchase cost visibility is expected for this role (unlike Warehouse — see
Phase 3 QA requirement that warehouse staff cannot see purchase costs).
