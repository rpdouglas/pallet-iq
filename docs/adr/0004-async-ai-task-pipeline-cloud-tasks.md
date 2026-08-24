# ADR-0004: Async AI task pipeline uses Cloud Tasks, with a new `ai_tasks` collection

**Status:** Accepted
**Date:** 2026-08-08

## Context

Governance Check II (`docs/GOVERNANCE.md`) requires that no Gemini/Vertex AI
call ever happens inline on a user-facing request path — AI work must be
queued and results polled or pushed back to the client. Phase 0's spec
(`docs/projects/PROJ-PALLETIQ.md`) calls for "async AI task pipeline
scaffolding (Cloud Tasks/Pub-Sub) — even if only one Gemini call type exists
yet," with QA verification: "a dummy async task completes via the queue (not
inline)." No AI SDK calls exist in the codebase yet (that's Phase 2's "async
batched Gemini product analysis," `docs/ROADMAP.md`); this ticket builds only
the queueing mechanism and proves it end-to-end with a dummy task, not real
Gemini integration.

GCP offers two natural options for the queue itself: Cloud Tasks and
Pub/Sub, and the shape of the actual workload (single producer, single
consumer, one task = one external API call to a rate/quota-limited service)
needs a mechanism that can enforce dispatch concurrency against that
downstream limit without extra plumbing.

Separately, Check II's "results are polled or pushed back to the client"
language implies task state needs to be queryable somewhere the client can
read it — nothing in the existing schema (`firestore.rules`) currently
tracks the state of an in-flight async job.

## Decision

**Queue mechanism: Cloud Tasks**, not Pub/Sub. Cloud Tasks is a push-based
queue with per-queue rate limiting, controlled dispatch concurrency, and
built-in retry/backoff — that maps directly onto "don't exceed Gemini's rate
limit," which is the actual constraint this pipeline exists to respect. A
task is a single HTTP-dispatched unit of work, which matches the shape
Phase 2's real workload will have (one task per product/line-item to
analyze), unlike Pub/Sub's fan-out/fan-in model, which is built for multiple
independent consumers reacting to one event — not the case here.

**New Firestore collection: `tenants/{tenantId}/ai_tasks/{taskId}`**, tracking:

```
type: string        // "dummy" for this ticket; real task types arrive in Phase 2
status: string       // queued | processing | completed | failed
payload: map
result: map | null
error: string | null
createdAt: timestamp
updatedAt: timestamp
```

Rules: `read` gated by `isTenantMember(tenantId)` (any authenticated tenant
member can poll task status — matches the read posture of other operational
collections like `imports`/`pallets`); `write: if false` (Cloud Functions
only, mirroring `analytics_rollups`/`audit_logs` — a client can never
fabricate or tamper with task state). Requires a
`firestore.rules.test.ts` pair per governance Check I.

**Pipeline shape:** an HTTPS Callable (`enqueueDummyTask`, in
`functions/src/ai-tasks/`) creates the `ai_tasks` doc (`status: "queued"`)
and enqueues a Cloud Tasks task pointing at an HTTP-triggered worker
function (`processDummyTask`), passing the task's Firestore path. The
worker updates the doc to `status: "processing"`, does a trivial no-op
(no external API call — proving the async plumbing, not AI logic), then
writes `status: "completed"` + a dummy `result`. The worker endpoint is
authenticated via Cloud Tasks' OIDC token mechanism (a dedicated,
narrowly-scoped service account invokes it), not left open.

## Alternatives considered

- **Pub/Sub.** Rejected — no fan-out need exists (one enqueue, one worker,
  one result), and Pub/Sub push subscriptions don't give the same
  straightforward per-queue concurrency/rate-limit knobs Cloud Tasks does;
  achieving equivalent Gemini-rate-limit protection would mean building
  custom throttling in the subscriber for no structural benefit.
- **No task-tracking collection this ticket, prove the queue via logs
  only.** Simpler for Phase 0, but Phase 2's real pipeline needs exactly
  this polling mechanism ("results are polled or pushed back to the
  client" is a Check II requirement, not a nice-to-have) — deferring it
  means designing the same collection from scratch later instead of
  reusing scaffolding built now. Rejected in favor of building it once.
- **Firestore-triggered function instead of Cloud Tasks (write an `ai_tasks`
  doc, `onCreate` trigger processes it).** Simpler (no queue provisioning,
  no OIDC wiring), but gives up exactly the rate-limiting/concurrency
  control that's the whole reason Check II exists — a burst of writes would
  fan out to unlimited concurrent Gemini calls with no queue-level backpressure.
  Rejected.

## Consequences

- Requires provisioning a real Cloud Tasks queue in `mrt-pallet-iq` (GCP
  console or `gcloud tasks queues create`) and a dedicated service account
  scoped to invoke only the worker function — manual infra setup similar to
  the Storage bucket (`PALLETIQ-018`) and Hosting deploy service account
  (`PALLETIQ-015`) before it.
- The Firebase Emulator Suite has no Cloud Tasks emulator. Local
  integration testing of the actual enqueue → dispatch → worker round-trip
  isn't possible against an emulator the way Firestore/Storage/Auth are;
  the enqueue and worker logic get unit-tested in isolation (mocked Cloud
  Tasks client, mocked Admin SDK — same pattern as `PALLETIQ-002`'s
  callables), and the real queue is verified live in the GCP project, not
  via CI.
- `ai_tasks` becomes the 24th Firestore collection needing rules + a rules
  test pair (Check I) — `firestore-rules-auditor` will check it like any
  other collection.
- Phase 2's real Gemini task types build on this same `ai_tasks` shape and
  `processX` worker pattern rather than inventing their own — the `type`
  field exists specifically so real task types can be added without a
  schema change.

**Addendum (2026-08-24, found scoping `PALLETIQ-030`):** this last point
didn't hold in practice. Both real Gemini call sites built since this ADR
— `identifyItem.ts` (`PALLETIQ-025`, `processItemScan.ts` worker) and
`priceResearch.ts` (`PALLETIQ-035`, `priceItemScanWorker.ts`) — bypass
`ai_tasks` entirely: each writes its own dedicated status fields
(`status`/`pricingStatus`/`saleabilityStatus`, etc.) directly onto its own
feature's document (`item_scans`) via its own dedicated
`onTaskDispatched` worker, rather than creating an `ai_tasks` doc and
polling a shared `type` field. `ai_tasks` still exists and is still
correctly rules-tested (Check I), but its only real occupant is the
original `PALLETIQ-004` dummy task — it never became the shared substrate
this ADR predicted. **The core decision this ADR made — Cloud Tasks over
a Firestore-triggered function — is exactly what every real call site
follows**, so `Status` is flipped to `Accepted` accordingly; only the
"future task types share this collection" prediction was wrong. The
pattern that actually emerged (dedicated status fields + a dedicated
worker per feature, directly on that feature's own document) is the one
`PALLETIQ-030` follows too — see `ADR-0014`. Worth keeping `ai_tasks`
around for the dummy task and Check I test coverage rather than deleting
it, but treat "dedicated per-feature worker" as the real precedent for
any new Gemini call site, not this collection.
