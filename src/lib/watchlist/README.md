# Watchlist — why this is manual-entry only

`watchlist_lots` (`PALLETIQ-021`, `ADR-0009`) exists because B-Stock and
Direct Liquidation both **prohibit automated access to their listings** in
their own Terms of Use/Service — checked before any code here was written,
per `SPEC-SOURCING-INTEL-002`'s own "if a prohibition exists, stop and
surface it" standard.

**B-Stock's Terms of Use** (Section 3) prohibit using "any robot, spider,
scraper, data mining tool, data gathering or extraction tool, or any other
automated means, to access, collect, copy or record the Services," and
separately bar "benchmarking or competitive analysis."

**Direct Liquidation's Terms of Service** independently prohibit "any
robot, spider, data miner, wanderer, crawler or any other automatic or
manual device or process to copy or monitor" its services — its own
clause, not just an inherited B-Stock policy, even though Direct
Liquidation runs on B-Stock's underlying auction platform.

Both sources also gate the data that actually matters (current bid, full
manifest, closing time) behind account login, and both are live auction
mechanisms — polling live bid state risks interfering with the bidding
engine and triggering rate-based abuse detection, a materially different
risk profile from `restock_lots`' static, permitted scrape
(`PALLETIQ-020`, Track A).

**Do not add a scraper, scheduled fetch, or programmatic login for either
source.** Every `watchlist_lots` write is a human pasting a listing URL and
a few visible fields into the quick-add form — that's the point, not a
placeholder for automation to come later. If either platform's terms
change, or B-Stock's own outreach (`docs/ACTIVE_CYCLE.md`'s tracked
follow-up) produces a sanctioned API/feed, that becomes a new
`restock_lots`-style ticket built against a real endpoint — not a reason
to "fix" this file by scraping.

See [`ADR-0009`](../../../docs/adr/0009-sourcing-intelligence-scraper-and-watchlist.md)
for the full architectural reasoning.
