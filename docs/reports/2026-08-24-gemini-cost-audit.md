# Gemini Cost Audit

**Date:** 2026-08-24
**Scope:** `functions/src/gemini/`, `functions/src/pricing/`, `functions/src/listing-copy/`,
`functions/src/item-scans/`, `functions/src/billing/`
**Sources:** direct reads of the files above, `docs/adr/0011`/`0012`/`0013`/`0015`,
`docs/BACKLOG.md`, `docs/ACTIVE_CYCLE.md`, and a live fetch of
[ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing)
on 2026-08-24. Every figure below traces back to one of these — none are estimated.

Requested after the owner flagged Gemini spend as higher than expected and asked
whether a personal Claude Pro subscription could help offset it.

## At a glance

|                                                                |                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| Gemini calls per single Buyer item scan (worst case, uncached) | **6**                                                   |
| Worst-case pricing calls on retry, due to a fixable bug        | **12×** (9 of them pure waste)                          |
| Usage metering actually enforced today                         | **$0** — the code exists, nothing calls it              |
| Times real $/call has been measured before this audit          | **Never** — on record in the team's own close-out notes |

## 1. Can the Claude Pro subscription help?

**Short answer: no, not directly.** A claude.ai Pro subscription and the Claude API
are separate products. Pro grants usage of Claude in the chat app (and, at higher
tiers, Claude Code); it does not grant API credits, a discount on API rates, or any
way to route PalletIQ's server-side calls through Claude "for free." Swapping any of
the three Gemini call sites over to Claude would require a **separate Anthropic API
key with its own independent, pay-per-token bill** — current rates run $3/$15 per
million input/output tokens for Sonnet 5, or $1/$5 for Haiku 4.5. That's a real cost
to weigh against Gemini's, not a lever that makes today's Gemini spend cheaper. It's
covered as a lower-priority, longer-term option in §5 — not a quick win.

## 2. How one scan spends money today

A Buyer's single "scan an item" action can trigger up to six Gemini calls, spread
across three independent call sites — each its own Cloud Tasks worker, each capable
of retrying up to three times on failure.

| Stage                    | File                                    | Model              | Calls | Tools enabled                         | Cached?               |
| ------------------------ | --------------------------------------- | ------------------ | ----- | ------------------------------------- | --------------------- |
| Item identification      | `gemini/identifyItem.ts:6`              | `gemini-3.6-flash` | 1     | Google Search grounding               | Never                 |
| Pricing research, 3 legs | `pricing/priceResearch.ts:294-298`      | `gemini-3.6-flash` | 3     | Google Search + URL context, each leg | Together, 30-day TTL  |
| Pricing synthesis        | `pricing/priceResearch.ts:319-324`      | `gemini-3.6-flash` | 1     | None — text-only over prior JSON      | With the 3 legs above |
| Listing copy             | `listing-copy/generateListingCopy.ts:7` | `gemini-3.6-flash` | 1     | None                                  | Never                 |

Pricing's 3 research legs + synthesis were one sequential call until `ADR-0013`
split them apart to cut latency — a deliberate, acknowledged _increase_ in call
volume (1 → 4) whose dollar impact was never measured at the time. The one real
brake in the system is `product_price_cache` (cross-tenant, 30-day TTL, keyed by
UPC or a brand/model fingerprint, `pricing/cacheKey.ts`): a cache hit skips all 4
pricing calls outright, dropping a scan to 2 Gemini calls total.

## 3. The two things nobody's measured

Everything else in this report is real but secondary. These two are where the
money is most likely going, and one of them is an outright bug.

### a. Grounding is billed per request, not per token — and the free tier is small

Verified live against Google's current pricing page: `gemini-3.6-flash` gives
5,000 free grounded requests per **month**, flat, then **$14 per 1,000** after
that. Four of a scan's six Gemini calls are grounded. The older `gemini-2.5-flash`
gives 1,500 free grounded requests per **day** — roughly 9× the monthly headroom —
at cheaper token rates too ($0.30/$2.50 vs. $0.75/$3.75 per million). The 3.6
line's token price is also scheduled to **double on 2027-01-01**, per an explicit
footnote on Google's own pricing page.

| Model                       | Input $/1M | Output $/1M | Free grounding         | Grounding overage |
| --------------------------- | ---------- | ----------- | ---------------------- | ----------------- |
| `gemini-3.6-flash` (in use) | $0.75*     | $3.75*      | 5,000/month            | $14/1,000         |
| `gemini-2.5-flash`          | $0.30      | $2.50       | 1,500/day (~45,000/mo) | $35/1,000         |

\* Doubles to $1.50/$7.50 on 2027-01-01.

### b. A retry after partial success re-pays for the part that already worked

Confirmed by reading `pricing/priceResearch.ts` and
`item-scans/priceItemScanWorker.ts` directly: the 3 pricing research legs already
fail gracefully to empty defaults (`Promise.allSettled` + `settleLeg`,
`priceResearch.ts:294-306`) — but the 4th synthesis call has no fallback and
throws by design (`priceResearch.ts:315-318`, "there's no bottom line without
it"). Because `product_price_cache` is only written after full success
(`priceItemScanWorker.ts:99-102`), and every Gemini-calling worker re-throws to
let Cloud Tasks retry (`retryConfig: { maxAttempts: 3 }` on all three), one flaky
synthesis call discards 3 already-paid grounded research calls and reruns all 4
from scratch — **worst case, 12 Gemini calls for one logical price, 9 of them
pure waste.** This is a bug, not a tradeoff — fixing it is close to free money.

## 4. Everything else worth knowing

- **No generation config is set anywhere** — no temperature, no output-token
  ceiling, no structured-output mode. All three call sites run on SDK defaults
  and validate plain-text JSON with hand-written Zod schemas.
- **Usage metering exists and is wired to nothing.** `billing/incrementUsage.ts`
  already atomically bumps a per-tenant usage counter — built for exactly this
  purpose (PALLETIQ-003/ADR-0005) — but has zero callers anywhere in the
  codebase. A free-tier tenant and a pro-tier tenant get identical, unmetered
  Gemini access today; the only real throttle anywhere is a global concurrency
  cap on each Cloud Tasks queue, which protects Gemini's own rate limit, not
  your wallet.
- **The next feature on the roadmap could be the biggest risk yet.** Lot
  profitability scoring (`PALLETIQ-042`, not yet built) prices every distinct
  SKU in an imported manifest — `ADR-0015` already flags that an uncapped
  import with hundreds of SKUs could trigger _hundreds_ of Gemini calls from
  one click, and the cap decision has never been made.
- **One worker's memory setting is an outlier.** `priceItemScanWorker.ts` — the
  heaviest, longest-running (300s timeout), most Gemini-call-dense of the three
  — has no explicit `memory` override and defaults to the platform floor
  (256MiB), unlike siblings (`processItemScan.ts`, `processManifestImport.ts`)
  deliberately bumped to 512MiB after past out-of-memory incidents.
- **Nobody has ever actually looked.** No billing export, no budget alert, no
  per-call-site logging exists today. `docs/ACTIVE_CYCLE.md`'s PALLETIQ-035
  close-out notes admit as much directly: "Real per-call cost wasn't measured
  (no billing API access in this sandbox)."

## 5. What to do about it

Ordered by how soon it should happen, not by how interesting it is. Do P0 before
touching anything else — you can't prioritize what you can't see.

### P0 — do now, near-zero risk, no design work needed

| Fix                                  | What                                                                                                                                                                                                                                                 | Files                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Turn on billing visibility           | Enable GCP's detailed billing export to BigQuery + a budget alert. Console configuration, ~10 minutes, no code.                                                                                                                                      | —                                                                                              |
| Log every Gemini call with structure | One log line after each call recording call site, whether it was grounded, and the token counts Gemini already returns. The only way to see which pricing leg is actually expensive — the billing export can't attribute to code.                    | `gemini/identifyItem.ts`, `pricing/priceResearch.ts`, `listing-copy/generateListingCopy.ts`    |
| Fix the retry-amplification bug      | Persist each pricing leg's result as soon as it's computed, not just the final all-or-nothing cache doc. On retry, only rerun what's missing plus the cheap synthesis step. Cuts the worst case from 12 calls to 6, common case from 8-12 down to 4. | `pricing/priceResearch.ts`, `item-scans/priceItemScanWorker.ts`, `item-scans/priceItemScan.ts` |

### P1 — this cycle, moderate design, still low risk

| Fix                                           | What                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Wire up the usage counter that already exists | Call `incrementUsage()` from all three Gemini call sites, keyed by month for an automatic reset with no new scheduled job.                                                                                                                                                                                                                                               |
| Evaluate switching to `gemini-2.5-flash`      | Likely the single highest-value lever available: cheaper tokens, ~9× more free grounding headroom, no scheduled price increase. Validate identification/pricing quality against ~20-30 real past scans before committing — an accuracy question for the product's core value prop, not a blind swap. `generateListingCopy.ts` is the safest one to try first (no tools). |
| Add a free-tier cap                           | A simple per-plan monthly ceiling, checked before a scan is even enqueued — fail fast with a clear message. A hardcoded constant is enough for now.                                                                                                                                                                                                                      |

### P2 — larger investment, worth its own design pass

| Fix                                               | What                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cap SKU research before lot scoring ships         | Bake a hard per-import ceiling and a plan-tier cap into `PALLETIQ-042` from day one.                                                                                                                                                                                                         |
| Match the pricing worker's memory to its siblings | Cheap insurance against a crash mid-pipeline, which would itself trigger the retry cost above. Confirm with real memory-utilization data once billing visibility is live.                                                                                                                    |
| Look into prompt caching — later, not now         | Worth a short spike once P0's logging shows real prompt sizes per call site. The SOP instruction blocks repeat almost verbatim across calls (the right shape for caching), but may be too small to clear Gemini's minimum cacheable size — don't schedule implementation work around it yet. |

## 6. Summary

| Priority | Fix                               | Effort         | Confidence                |
| -------- | --------------------------------- | -------------- | ------------------------- |
| P0       | Billing export + budget alert     | console only   | high                      |
| P0       | Structured per-call usage logging | small          | high                      |
| P0       | Fix pricing retry-amplification   | small–medium   | high                      |
| P1       | Wire up `incrementUsage()`        | small          | high                      |
| P1       | Evaluate `gemini-2.5-flash`       | medium         | medium — needs validation |
| P1       | Free-tier usage cap               | small–medium   | high                      |
| P2       | Cap SKU research (lot scoring)    | design + small | high                      |
| P2       | Pricing worker memory bump        | trivial        | low–medium                |
| P2       | Prompt-caching feasibility spike  | flagged        | unknown                   |

Do the two P0 logging items before the P1 model evaluation — otherwise a model
switch's actual dollar impact stays exactly as invisible as everything else in
this report started out.

---

_No code was changed and no tickets were opened as part of this audit — this is
an analysis-only deliverable. See `docs/BACKLOG.md`'s `open-ticket` flow to turn
any item above into a tracked ticket._
