# ADR-0009: Sourcing intelligence — restock.ca scraper + manual sourcing watchlist

**Status:** Accepted
**Date:** 2026-08-13

## Context

An external spec, `SPEC-SOURCING-INTEL-002` (Ryan, RPD Consulting;
supersedes `SPEC-RESTOCK-SCRAPER-001`), asked PalletIQ to add automated
lot-discovery coverage across three liquidation sources: restock.ca,
B-Stock's Canadian storefronts, and Direct Liquidation. Before writing any
scraping code, the spec's own pre-flight discipline required reading each
site's actual Terms of Use:

- restock.ca's terms/robots.txt were checked and came back clean —
  scraping its public, fixed-price category pages is permitted.
- **B-Stock's Terms of Use** (Section 3) explicitly prohibits "any robot,
  spider, scraper, data mining tool, data gathering or extraction tool, or
  any other automated means, to access, collect, copy or record the
  Services," and separately bars "benchmarking or competitive analysis."
- **Direct Liquidation's Terms of Service** independently prohibits "any
  robot, spider, data miner, wanderer, crawler or any other automatic or
  manual device or process to copy or monitor" its services — its own
  clause, not just an inherited B-Stock policy, even though Direct
  Liquidation appears to run on B-Stock's underlying auction platform.

Both B-Stock and Direct Liquidation also gate the data that actually
matters (current bid, full manifest, closing time) behind account login —
there's no meaningful public-page scrape available even if it were
permitted — and both are live auction mechanisms, a materially different
risk profile from restock.ca's static fixed-price listings (polling live
bid state risks interfering with the bidding engine and triggering
rate-based abuse detection).

This is new capability for PalletIQ: discovering purchasable lots _before_
a purchase decision. Nothing in the shipped Phase 1 flow (vendor CRUD →
manual manifest upload of goods already bought) or the planned Phase 2
(Intelligence — scoring manifests already imported) covers this
"browse what's available to buy" step. `docs/projects/PROJ-PALLETIQ.md`'s
Phase 4 already names "Automated vendor ingestion (API/email/watch
folders)" as a future bullet; this pulls a narrow, single-vendor slice of
that forward, tracked as `PALLETIQ-020`/`021`, running as a parallel track
alongside Phase 2 rather than sequenced after Phase 3 — neither blocks nor
depends on the other.

## Decision

**Split into two tracks, per source compliance, not convenience:**

- **Track A (restock.ca) — automated, scheduled scraper.** Permitted by
  the site's own terms, verified before any code was written.
- **Track B (B-Stock, Direct Liquidation) — compliant manual watchlist
  only.** No scraper, no scheduled fetch, no programmatic login to either
  site. A human pastes a listing URL and a few visible fields into
  PalletIQ; the app stores, organizes, and surfaces it exactly like a
  restock.ca lot, but every write is a human action.

**`restock_lots` is a global, cross-tenant collection, not per-tenant.**
It's the same public restock.ca data regardless of which tenant is
looking — one hourly scrape should serve every tenant, not write N
duplicate copies. This follows the same "separate security domain" shape
`product_intelligence` already established in `firestore.rules`/Check I:

```
match /restock_lots/{lotId} {
  allow read: if isSignedIn();   // any authenticated user, any tenant
  allow write: if false;         // Cloud Functions (Admin SDK) only
}
```

**`watchlist_lots` is tenant-scoped**, since each tenant's manually-tracked
lots and notes are genuinely their own data — same shape as `imports`/
`manifests`:

```
match /tenants/{tenantId}/watchlist_lots/{lotId} {
  allow read: if isTenantMember(tenantId);
  allow write: if isOwnerOrBuyer(tenantId);  // reuses ADR-0006's helper
}
```

Write is Owner+Buyer, not Owner-only — sourcing is Buyer's core daily job
per `docs/personas/buyer.md`, matching how `ADR-0006` scoped `imports`/
`manifests` write for the same reason. `watchlist_lots` stays a distinct
collection from the pre-existing generic `watchlists` (unused by any
shipped UI, different/unclear purpose) rather than repurposing it — folding
a well-defined, spec'd feature into an ambiguous placeholder collection
would make both harder to reason about later.

**Scraping library: `cheerio`, not a headless browser.** restock.ca's
category pages are server-rendered per the spec — there's no JS-rendered
content to justify Puppeteer/Playwright's cold-start and memory cost inside
a Cloud Function. (Root `package.json`'s `@playwright/test` is E2E test
tooling for verifying the PalletIQ UI itself, unrelated and not reusable
here.)

**Scheduling: `onSchedule`** (Firebase Functions v2's native Cloud
Scheduler trigger), the first use of this trigger type in the codebase.
Mirrors `ADR-0004`'s choice of `onTaskDispatched` over manually wiring
Cloud Tasks — prefer the Firebase-native integration (auto-provisions on
deploy) over hand-rolled `@google-cloud/scheduler` client code.

## Alternatives considered

- **Build a scraper for all three sources and rely on account-holder
  "fair use."** Rejected outright — both B-Stock's and Direct
  Liquidation's terms are unambiguous, and breach risks account
  termination for the real buyer account this data would come from, plus
  exposure under B-Stock's ToS Section 7 indemnification clause. Per the
  original spec's own standard: "if [a prohibition] exists, stop and
  surface it — do not proceed with scheduling."
- **Skip Track B entirely since automation isn't available.** Rejected —
  a compliant manual-entry watchlist still gives real value (a single
  place to track auctions instead of a browser tab graveyard) without any
  ToS exposure, and keeps the door open to Track A-style automation later
  if B-Stock's own outreach (Section B.3 of the spec) produces a
  sanctioned API/feed.
- **Per-tenant `restock_lots` (`tenants/{tenantId}/restock_lots`),
  matching every other collection's tenant-isolation pattern.** Simpler to
  reason about under Check I's standard shape, but means the scraper
  writes the same public listing N times (once per tenant) for no benefit
  — nothing about a restock.ca lot is tenant-specific until a tenant
  chooses to act on it. Rejected in favor of the `product_intelligence`
  precedent: global data, Cloud-Functions-only write, open read to any
  authenticated user.
- **One unified `sourcing_lots` collection with a `source` +
  `ingestionMethod` field**, instead of two separate collections. Left
  open per the spec's own B.6 — no UI needs to list "all current
  opportunities" across both sources yet, and `restock_lots`/
  `watchlist_lots` have genuinely different security domains (global vs.
  tenant-scoped), so unifying now would mean modeling a cross-cutting
  read/write policy with no real consumer to validate it against.
  Revisit if/when a real "all opportunities" UI is scoped — not a
  speculative abstraction today.
- **Headless browser (Puppeteer/Playwright) for Track A.** Rejected —
  restock.ca needs no JS execution to scrape, and a full browser in a
  Cloud Function adds real cold-start/memory cost with no corresponding
  benefit.

## Consequences

- First `onSchedule`-triggered Cloud Function in the codebase — a new
  trigger paradigm alongside the existing `onCall`/`onTaskDispatched`
  ones, following the same `functions/src/<feature>/` folder convention
  (`functions/src/restock-scraper/`).
- `functions/` gains a new runtime dependency (`cheerio`) for HTML
  parsing.
- `restock_lots` is the second collection (after `product_intelligence`)
  to live outside the standard `tenants/{tenantId}/...` tenant-isolation
  shape — `firestore.rules.test.ts` needs a distinct test pattern for it
  (any authenticated user across tenants can read; write is always denied
  to clients), not the shared `describe.each` tenant-isolation block most
  other collections use.
- `docs/personas/buyer.md` gains `restock_lots` (read) and `watchlist_lots`
  (read/write) to its permission lists, consistent with `CLAUDE.md`'s
  requirement that persona docs, `firestore.rules`, and `src/types/auth.ts`
  stay in sync.
- No UI exists yet to surface either collection to a Buyer — that's each
  ticket's own scope (`PALLETIQ-020`/`021`), not a follow-on.
- The restock.ca ToS/robots.txt pre-flight check is a point-in-time
  finding, not a permanent guarantee — if restock.ca's terms change in the
  future, this scraper needs to be re-evaluated against the new terms, the
  same discipline that produced Track B's split in the first place.
- Track B's Definition of Done requires an in-repo README documenting
  _why_ it's manual-entry (quoting the ToS clauses above) so a future
  contributor doesn't "fix" this by adding a scraper — `PALLETIQ-021`
  carries that requirement forward.
