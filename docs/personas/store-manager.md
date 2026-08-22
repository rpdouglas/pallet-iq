# Store Manager

## Role

Lists, prices, and sells inventory across channels. Owns the sell-side of
the lifecycle (Listed → Sold) and the pricing/aging signals that drive it.

## Primary needs

- Pricing recommendations
- Aging inventory alerts (unlisted/unsold past threshold → markdown
  suggestion)
- Channel routing across marketplace integrations (Shopify, Amazon Seller
  Central, eBay, Facebook Marketplace)
- Sales tracking and vendor scorecard visibility (to inform pricing
  decisions from vendor reliability data)

## Permission boundaries (RBAC)

Custom claim: `role: "manager"`

- **Read:** inventory, sales, pallets, manifests, vendors (incl.
  scorecards), analytics rollups, `product_intelligence`, `item_scans`
  (a Buyer's item-identification record, consumed for listing-copy
  generation — see `ADR-0011`, `PALLETIQ-030`)
- **Write:** inventory (listing/pricing/status transitions), sales,
  favorites, watchlists, notes, tasks
- **No access to:** `subscriptions` (billing), `api_keys`, tenant-level
  `settings` administration, `audit_logs` (read access may be granted per
  tenant policy — default denied)

Manager sits above Buyer and Warehouse in trust level but below Owner —
see `firestore.rules` `isOwnerOrManager()` vs `isOwner()` helpers.
