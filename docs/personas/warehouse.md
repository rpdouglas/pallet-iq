# Warehouse

## Role

Receives, scans, and reconciles physical inventory against manifests.
Mobile-first persona (per the Phase 3 UX split: mobile-first for
warehouse, desktop-first for buying decisions).

## Primary needs

- Mobile scanning / barcode receiving flow
- Bin locations and multi-warehouse support
- Manifest-vs-received reconciliation (flagging quantity/condition
  discrepancies)
- Claims logging for vendor disputes (wrong condition, missing/damaged
  items)

## Permission boundaries (RBAC)

Custom claim: `role: "warehouse"`

- **Read:** manifests (line items, quantities — no cost fields), pallets,
  inventory, locations, claims, tasks assigned to them
- **Write:** inventory status transitions (Received, receiving
  reconciliation), claims, bin/location assignment, tasks
- **Explicitly denied:** purchase cost fields on any collection — enforced
  in both `firestore.rules` and the UI (governance Check III). This is a
  hard Phase 3 QA requirement: a warehouse-role user cannot view purchase
  cost fields via the UI or a direct Firestore query.
- **No access to:** vendors (pricing/terms), `settings`, `subscriptions`,
  `api_keys`, `audit_logs`, bids
