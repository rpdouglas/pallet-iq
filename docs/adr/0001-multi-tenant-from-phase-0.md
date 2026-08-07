# ADR-0001: Multi-tenancy is built in from Phase 0, not retrofitted

**Status:** Accepted
**Date:** 2026-08-07

## Context

PalletIQ is a SaaS product from day one — multiple buying organizations
(tenants) will use the same deployment, each with isolated data and
role-scoped access within their own team. The original project plan did
not call out multi-tenancy as an explicit early phase; a review pass added
Phase 0 specifically because retrofitting tenant isolation after
single-tenant assumptions get baked into the schema, queries, and UI is
materially more expensive than building it in from the start — every
collection, query, and security rule written against a single-tenant
assumption becomes a migration later.

## Decision

Every tenant-owned Firestore collection is scoped under
`tenants/{tenantId}/...` (or carries an indexed `tenantId` field) from the
very first commit that creates it. Firebase Auth custom claims
(`tenantId`, `role`) are established in Phase 0, before any feature work
begins, and every collection ships with `firestore.rules` enforcing
tenant isolation plus a corresponding test in `firestore.rules.test.ts`
(governance Check I). No collection is exempted, including collections
that feel "internal" (e.g. `analytics_rollups`, `audit_logs`).

The one deliberate exception is `product_intelligence`, which is
cross-tenant by design (pooled, anonymized outcome data) and lives in its
own security domain — read-only to authenticated tenant members, writable
only by trusted Cloud Functions.

## Alternatives considered

- **Single-tenant MVP, add tenancy later.** Faster initial build, but
  every collection, query, and UI assumption written against "there is
  only one customer" becomes a rewrite, not an addition. Rejected — this
  is exactly the retrofit cost the review flagged.
- **Soft multi-tenancy (tenantId field, no rules enforcement yet).**
  Defers the security rules work but leaves every collection
  unprotected in the interim, violating the "no collection ships without
  rules" requirement. Rejected.

## Consequences

- Phase 0 is slower than shipping a single-tenant proof of concept would
  be — RBAC scaffolding, rules, and rules tests are required before
  Phase 1 feature work starts.
- Every future collection added in Phase 1–4 has an established pattern to
  follow (`tenants/{tenantId}/...` + rules + rules test), rather than each
  phase inventing its own tenancy approach.
- `product_intelligence` requires ongoing discipline to keep genuinely
  anonymized — this is called out explicitly in Phase 4's QA verification
  (privacy audit on cross-tenant benchmark figures).
