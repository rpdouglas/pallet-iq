# Owner/Admin

## Role

Manages team, vendors, budget, and subscription. The tenant's highest
trust level — the only role with billing and RBAC administration access.

## Primary needs

- Cash flow visibility (purchase costs, landed cost, ROI across the tenant)
- Vendor scorecards (fulfillment accuracy, shipping speed, manifest
  honesty over time)
- RBAC administration — inviting/removing team members, assigning roles
- Billing (Stripe subscription state, usage metering, tier management)
- Audit log visibility for access and financial-action review

## Permission boundaries (RBAC)

Custom claim: `role: "owner"`

- **Read/Write:** everything within the tenant — vendors, imports,
  manifests, pallets, inventory, sales, bids, claims, locations, tasks,
  notes, favorites, watchlists
- **Owner-only:** `settings` (tenant configuration), `subscriptions`
  (Stripe billing state — writes are Cloud Functions/webhook-only even for
  owners), `api_keys` (Enterprise-tier scoped keys), `audit_logs` (read),
  user role assignment
- Only role permitted to remove or demote other tenant members

`subscriptions` writes are never client-side, even for Owner — Stripe
webhook events land via a trusted Cloud Function using the Admin SDK. See
`firestore.rules`.
