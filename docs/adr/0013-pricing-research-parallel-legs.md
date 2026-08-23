# ADR-0013: Pricing research splits into parallel Gemini legs to cut wall-clock latency

**Status:** Proposed
**Date:** 2026-08-23

## Context

`ADR-0012` replaced the deterministic pricing waterfall with a single
Gemini call (`functions/src/pricing/priceResearch.ts`'s `researchPrice()`,
`tools: [{ googleSearch: {} }, { urlContext: {} }]`) that works through the
owner's SOP in one model turn: retail price → Kijiji new/sealed → Kijiji
used → eBay sold/completed → open-box estimate → a synthesized bottom-line
price. Each step involves its own search-then-fetch tool round trips inside
that single turn. `priceItemScanWorker.ts` budgets up to 300s for the whole
call, and the owner reports that in practice pricing "takes a long time and
sometimes doesn't even return anything" — the top real friction point on
the scan-to-price flow. (A separate bug — the frontend not polling while
`pricingStatus === 'pricing'`, making the wait feel worse than it is — was
found and fixed directly in this same session, not part of this ADR.)

Because all five SOP steps run sequentially inside one model turn, none of
them overlap: total wall-clock time is roughly the sum of every step's
search+fetch latency, not the max of any one of them. Kijiji (two sub-
searches) and eBay sold (search + multiple listing-page fetches, often the
slowest step per the SOP's own framing of it as "the single best signal")
are independent of each other and of the retail lookup — there is no
SOP-level reason they need to run in series.

One real dependency exists: the SOP's open-box/clearance step falls back to
"calculate roughly 15-25% below retail" when no direct open-box listing is
found, so it needs the retail leg's result to compute that fallback if the
two run separately.

The single-call design also means an all-or-nothing failure mode: if
`extractJsonObject`/Zod validation fails anywhere (e.g. one section of the
model's JSON is malformed), the entire price fails and Cloud Tasks retries
the whole thing from scratch — even if the model had, in effect, already
found a usable retail price and Kijiji comps.

## Decision

**Split `researchPrice()` into three concurrent Gemini calls plus one
lightweight synthesis call, run via `Promise.allSettled`:**

1. **Retail + open-box leg** — steps 1 and 4 of the SOP, bundled together
   because open-box's calculated fallback needs retail's number. Uses
   `googleSearch` + `urlContext`.
2. **Kijiji leg** — new/sealed and used comps together (same site, same
   search session). Uses `googleSearch` + `urlContext`.
3. **eBay sold leg** — sold/completed listings only, unchanged fallback
   behavior when logged-out access is unavailable (`ebaySold.thin`).
   Uses `googleSearch` + `urlContext`.

All three run concurrently via `Promise.allSettled`, each validated against
its own narrower Zod schema (a subset of today's
`priceResearchResponseSchema`, split along the same lines).

4. **Synthesis leg** — a fourth, tools-free Gemini call that takes the three
   legs' _merged, structured_ JSON results (whichever succeeded) as plain
   text input and applies the SOP's existing synthesis rules (eBay sold as
   primary anchor, Kijiji new/sealed as fallback anchor, retail as a
   ceiling, 15-40% below-retail deal band, used-Kijiji floor, recency/
   geography weighting) to produce `bottomLine.{priceCad,low,high,
rationale}`. This call is fast — no search/fetch tools, small input/output —
   and runs only after the three research legs settle, so it sits on the
   critical path but adds comparatively little to it.

Worst-case wall-clock time changes from **sum of 5 sequential steps** to
**max(retail+openBox, kijiji, ebaySold) + synthesis** — a meaningful cut
whenever the three research legs' durations are of comparable magnitude,
which the SOP's own step descriptions suggest they usually are.

**Partial-leg-failure policy**: `Promise.allSettled` means one leg's
rejection (a Gemini API error, a schema-validation failure, a timeout) no
longer sinks the whole price. A failed leg is treated the same way the SOP
already treats a leg that found nothing — its fields come back
null/empty/thin — plus a new `dataQuality.flags` entry naming which leg
failed and why, so the UI's existing thin-data messaging (`PricingPanel.tsx`
already renders `dataQuality.flags` as down-direction factors) covers this
without a UI change. Synthesis still runs and still must produce a
bottom-line number, per the SOP's existing "always state a specific number,
never refuse" rule — same posture as today, just now also covering
"a leg errored" as another reason data might be thin.

**No change to `computeCacheKey`, `product_price_cache`, or the cached
`PricingResult` shape.** The cache key is derived from the candidate's
identity (UPC/fingerprint), not from how many Gemini calls produced the
result; a cache hit continues to skip all four calls entirely, same as
today skips the one call. `mapPriceResearch.ts` continues to consume one
merged `PriceResearchResponse` — only how that object gets assembled
changes (four call results merged in code, instead of one call returning it
whole).

**Retry behavior**: `priceItemScanWorker.ts`'s existing `onTaskDispatched`
retry (`maxAttempts: 3`) is unchanged and still applies to the worker
invocation as a whole; the per-leg `Promise.allSettled` failure handling
above is a finer-grained layer underneath that, not a replacement for it.

## Alternatives considered

- **Do nothing / keep the single sequential call.** Rejected — doesn't
  address the reported latency, which is the actual problem being solved.
- **Reduce the SOP's research scope (fewer sources, fewer comps per
  source) to make the single call faster.** Rejected — explicitly out of
  `PALLETIQ-038`'s scope; degrades the pricing signal's quality/trustworthiness
  for a latency win that parallelization can achieve without that tradeoff.
- **Fully independent 4-way split (retail, open-box, Kijiji, eBay all as
  separate concurrent legs, no bundling).** Rejected — open-box's
  "calculated" fallback needs retail's number. Making it fully independent
  would mean either duplicating the retail search inside the open-box leg
  (wasted Gemini calls/tokens for no benefit) or threading retail's result
  into open-box's prompt as an input (a sequencing dependency between two
  "concurrent" calls, which defeats the purpose and adds complexity for a
  step that is typically cheap/fast anyway).
- **Progressive/partial rendering** (show the retail leg's result to the
  Buyer as soon as it resolves, stream in Kijiji/eBay as they arrive,
  rather than waiting for all legs + synthesis before writing `pricing` to
  Firestore). Deferred, not rejected outright — `ItemScanDoc.pricingStatus`
  is a single-shot `not_priced → pricing → priced/failed` state machine;
  true progressive rendering would need a per-leg status shape, a bigger
  change than this ticket's latency-only scope, and the session's separate
  polling-bug fix already ensures the Buyer sees a live "still working"
  state throughout, which covers the "can't tell it's running" complaint
  without this additional complexity.
- **Switch to a faster/cheaper Gemini model for the research legs instead
  of (or in addition to) parallelizing.** Not decided here — an orthogonal
  lever, worth profiling once real per-leg latency data exists from this
  change, but conflating a model swap with a call-structure change would
  make it harder to attribute any latency win to either cause.

## Consequences

- **Gemini call count roughly triples** for an uncached price (1 call → 3
  parallel research calls + 1 synthesis call = 4). Each research call does
  less work per call (fewer sequential tool round-trips within itself), so
  total token/tool cost is expected to be comparable rather than additive,
  but the fixed per-call latency/cost floor (model init, request overhead)
  is paid four times instead of once — an accepted cost for the latency win.
- **New Zod schemas needed**: one per research leg's partial response shape,
  plus a schema for the synthesis call's input/output. `priceResearch.ts`
  grows from one `generateContent` call site to four, with merge logic
  between them — real added code complexity versus today's single call,
  to be weighed during implementation against simpler groupings if the
  three-leg split proves harder to maintain than expected.
- **A failed leg no longer fails the whole price** — a behavior change from
  today's all-or-nothing single call. This is a net improvement for the
  Buyer (more prices return successfully, with thinner data flagged rather
  than nothing at all) but means `pricingStatus: 'failed'` will now fire
  less often even when real problems occur — worth watching after ship in
  case `dataQuality.flags` message quality needs tuning to keep a partially-
  failed price legible rather than silently degraded.
- `computeConfidence()`/`computeSaleability()` are unaffected — they already
  consume the merged `PriceResearchResponse`/`PricingResult` shape
  downstream and have no awareness of how many Gemini calls produced it.
- Comp verification (`PALLETIQ-037`) and this ticket are independent and
  can land in either order — comp verification operates on the merged
  comp list regardless of which leg produced each comp.
