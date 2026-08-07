# Backlog

Ticket IDs are `PALLETIQ-NNN`, allocated sequentially, never reused. Status
follows the 3-phase gate model in [`docs/GOVERNANCE.md`](./GOVERNANCE.md):
Planned → In Progress → Done. Priority is P0 (blocking) / P1 / P2.

| ID           | Title                                                                          | Persona     | Phase | Status      | Priority |
| ------------ | ------------------------------------------------------------------------------ | ----------- | ----- | ----------- | -------- |
| PALLETIQ-001 | Multi-tenant Firestore schema + security rules (with automated rules tests)    | Owner/Admin | 0     | Planned     | P0       |
| PALLETIQ-002 | Auth custom claims (`tenantId`, `role`) + RBAC scaffolding                     | Owner/Admin | 0     | Planned     | P0       |
| PALLETIQ-003 | Stripe billing integration (Free/Pro tiers, usage metering hooks)              | Owner/Admin | 0     | Planned     | P0       |
| PALLETIQ-004 | Secret Manager wiring for third-party credentials                              | Owner/Admin | 0     | Planned     | P1       |
| PALLETIQ-005 | Async AI task pipeline scaffolding (Cloud Tasks/Pub-Sub)                       | Buyer       | 0     | Planned     | P0       |
| PALLETIQ-006 | Authentication + tenant onboarding flow (incl. empty-state UX)                 | Owner/Admin | 1     | Planned     | P0       |
| PALLETIQ-007 | Vendor management for 2–3 vendors, 1–2 manifest formats (CSV + XLSX)           | Buyer       | 1     | Planned     | P0       |
| PALLETIQ-008 | Manifest import → data normalization → common product schema                   | Buyer       | 1     | Planned     | P0       |
| PALLETIQ-009 | Landed cost calculator (purchase price + freight/fees)                         | Buyer       | 1     | Planned     | P1       |
| PALLETIQ-010 | Basic dashboard (today's opportunities, recent imports, inventory totals)      | Buyer       | 1     | Planned     | P1       |
| PALLETIQ-011 | Basic inventory lifecycle tracking (Purchased → Received → Listed → Sold)      | Warehouse   | 1     | Planned     | P1       |
| PALLETIQ-012 | Manifest upload security hardening (size limits, sandboxed parsing, no macros) | Buyer       | 1     | Planned     | P0       |
| PALLETIQ-013 | Provision Firebase project + wire real project ID into repo config             | Owner/Admin | 0     | In Progress | P0       |
| PALLETIQ-014 | Cloud Functions package scaffold (functions/, deploy target, CI job)           | Owner/Admin | 0     | Planned     | P1       |
| PALLETIQ-015 | CI/CD deploy workflow for Firebase Hosting on merge to main                    | Owner/Admin | 0     | Planned     | P1       |
| PALLETIQ-016 | Wire design system into Tailwind v4 tokens, fonts, and icon library            | Owner/Admin | 0     | Planned     | P1       |

## Adding a ticket

New tickets go through the Planning gate first (see `docs/GOVERNANCE.md`)
before landing here with a Phase and Priority assigned.
