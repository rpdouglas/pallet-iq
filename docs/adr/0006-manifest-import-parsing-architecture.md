# ADR-0006: Manifest import parsing architecture

**Status:** Proposed
**Date:** 2026-08-10

## Context

`PALLETIQ-008` needs to turn an uploaded vendor manifest (CSV or XLSX, per the
vendor's `manifestFormat` field from `PALLETIQ-007`) into normalized
`lineItems` docs under a common product schema, with per-row error tracking
(`imports_errors`) and job-level status (`imports`). `PALLETIQ-012` (a
separate, later ticket) owns deeper upload security hardening — size limits
enforcement, magic-byte/mimetype validation, sandboxed execution, macro
stripping. This ADR only covers where and how parsing happens, not that
hardening.

`docs/projects/PROJ-PALLETIQ.md`'s Phase 1 QA criterion frames malformed/
corrupt files as a real security concern ("malformed/corrupt files are
rejected safely... sandboxed parsing, no macro execution") — this framing
only makes sense if parsing happens on infrastructure shared across tenants.
Parsing entirely in the uploader's own browser tab wouldn't need "sandboxing"
in that sense (a malicious file would at worst affect that one user's own
session), so the doc's own language signals server-side parsing was the
intended shape, even though it never says so explicitly.

`PALLETIQ-005` already built a Cloud Tasks-based async processing pipeline
(`enqueueDummyTask`/`processDummyTask`, via `firebase-functions/v2/providers/tasks`'
`onTaskDispatched` + `getFunctions().taskQueue().enqueue()`) specifically so
work heavier than a simple Firestore write happens off the user-facing
request path. Manifest parsing - especially larger XLSX files - is exactly
this kind of work.

## Decision

Parsing happens server-side, reusing `PALLETIQ-005`'s existing Cloud Tasks
pipeline rather than introducing a new async mechanism:

1. Client uploads the raw file directly to Cloud Storage at
   `tenants/{tenantId}/manifests/{importId}/original.{csv|xlsx}` via the
   Firebase Storage SDK.
2. Client calls a new `enqueueManifestImport` HTTPS Callable
   (`{vendorId, storagePath, fileName}`), restricted to Owner/Buyer (see the
   RBAC note below). It creates the `imports/{importId}` doc
   (`status: 'queued'`) and enqueues a Cloud Task carrying
   `{importId, tenantId, vendorId, storagePath}`.
3. A `processManifestImport` task worker (OIDC-authenticated via Cloud
   Tasks, same pattern as `processDummyTask`) downloads the file from
   Storage, parses it with a format-specific parser chosen by the vendor's
   `manifestFormat`, normalizes each row into the common `LineItem` shape,
   writes successful rows to `manifests/{manifestId}/lineItems` and failed
   rows to `imports_errors`, and updates `imports/{importId}` to
   `'completed'` or `'failed'` with row/error counts.

Parsing libraries: `papaparse` for CSV (small, battle-tested, works
identically in Node and the browser). For XLSX: `exceljs`, not the `xlsx`
(SheetJS) npm package - SheetJS's npm-published builds have carried
unpatched prototype-pollution/ReDoS CVEs for extended periods (their
patched builds are only published via SheetJS's own CDN, not npm), which
is a bad fit for a project that already runs `npm audit --audit-level=high`
in CI. `exceljs` is actively maintained and has no equivalent open
advisories.

Common `LineItem` schema (the "common product schema" the ticket title
names): `sku?`, `upc?`, `description` (required), `quantity` (required,
coerced to a positive number), `unitCost` (required, coerced to a
non-negative number), `condition?`, `category?`. A row missing/failing to
coerce a required field becomes an `imports_errors` doc instead of a
`lineItems` doc - partial success, not all-or-nothing failure.

**RBAC, resolved with the owner during scoping:** `manifests`/`imports`/
`lineItems` write is tightened to Owner **and Buyer** (not the placeholder
`isOwnerOrManager`, and not Owner-only despite that being the more literal
reading of the current persona docs) - Buyer is the persona whose job
description is "sources and evaluates manifests," so day-to-day import
needs to work without Owner in the loop for every file. Manager and
Warehouse stay read-only, per their existing RBAC lists. `docs/personas/
buyer.md`'s explicit Write list is being corrected in the same PR to
include `imports`/`manifests` - it currently only lists read access, which
this decision found to be a documentation gap, not the intended policy.

Storage read on the _raw file_ at `tenants/{tenantId}/manifests/{importId}/
original.*` is restricted to Owner/Manager/Buyer (excluding Warehouse) -
the raw file has `unitCost` as a plain column, so it would bypass
`lineItems`' client-side cost-field omission for Warehouse (per
`docs/design/rbac-ui-patterns.md`) if left open. This only matters for the
raw file; `lineItems` docs themselves stay readable by every tenant member
with the UI omitting the cost field for Warehouse, matching the pattern
`PALLETIQ-007` already established for vendor pricing/terms.

## Alternatives considered

- **Parse client-side in the browser (no Cloud Function).** Simpler, no new
  Cloud Function/Task infrastructure. Rejected: doesn't match
  `PROJ-PALLETIQ.md`'s "sandboxed parsing" framing, means the client needs
  both CSV and XLSX parsing libraries in the bundle (larger client, and
  `exceljs`/similar aren't optimized for browser bundle size the way a
  Node-side dependency can be), and every tenant's browser becomes a
  different, unaudited parsing environment instead of one controlled
  server-side code path enforcing consistent validation.
- **Storage-triggered Cloud Function (`onObjectFinalized`) instead of an
  httpsCallable + Cloud Tasks.** Simpler in one sense (no explicit enqueue
  call), but loses the request/response cycle the UI needs to show "import
  started" immediately and surface enqueue-time validation errors (e.g. "no
  such vendor") synchronously rather than after the fact. Also introduces a
  second async trigger paradigm alongside `PALLETIQ-005`'s Cloud
  Tasks-based one for no real benefit. Rejected in favor of reusing the
  existing pattern.
- **`xlsx` (SheetJS) instead of `exceljs`.** Far more widely used and a
  smaller dependency, but its npm-published builds have known, long-
  unpatched CVEs (prototype pollution, ReDoS) - a poor fit for a project
  already running `npm audit --audit-level=high` in CI and treating upload
  security as a first-class concern (`PALLETIQ-012`). Rejected on security
  grounds, not popularity.
- **Owner-only write for manifests/imports (mirroring `PALLETIQ-007`'s
  vendors precedent exactly).** More consistent with the literal text of
  the current persona docs, and the simpler call. Rejected after checking
  with the owner: unlike vendor _administration_, manifest _import_ is
  Buyer's core daily workflow per their role description, and Owner-only
  write would make that workflow depend on Owner being available for every
  file. `docs/personas/buyer.md` is being corrected accordingly rather than
  treated as authoritative over this decision.

## Consequences

- Two new Cloud Functions (`enqueueManifestImport`, `processManifestImport`)
  join the four `PALLETIQ-002` callables and two `PALLETIQ-005` task
  functions already deployed - the Cloud Tasks queue infrastructure is
  reused, not duplicated.
- `functions/` gains two new runtime dependencies (`papaparse`,
  `exceljs`) plus their `@types/papaparse` dev dependency.
- Import status is necessarily asynchronous/eventually-consistent from the
  UI's perspective (`queued` → `processing` → `completed`/`failed`) - the
  UI needs to poll or re-fetch rather than assume a synchronous result,
  same shape as `PALLETIQ-005`'s dummy-task UX.
- `docs/personas/buyer.md` needs a real edit (not just a scope note) to add
  `imports`/`manifests` to its Write list, since `CLAUDE.md` treats the
  persona docs, `firestore.rules`, and `src/types/auth.ts` as one contract
  that must stay in sync.
- `storage.rules` needs a real, non-placeholder rule for the
  `tenants/{tenantId}/manifests/{importId}/...` path (role-gated read,
  Owner/Buyer write) instead of the current blanket "any tenant member"
  default - the first path-specific tightening of `storage.rules` since
  `PALLETIQ-001`, plus new `storage.rules.test.ts` coverage for it.
- `PALLETIQ-012` still has real work to do on top of this - this ADR
  covers the parsing architecture and basic sane limits (file size cap,
  extension/mimetype-matches-`manifestFormat` validation), not the full
  hardening scope (magic-byte validation beyond mimetype, malware
  scanning, rate limiting).
