// Consolidated out of DiscoveredLotsPage.tsx's local copy for PALLETIQ-050,
// since LotCard needs the same formatting. ScannedItemsPage.tsx keeps its
// own separate copy - out of scope here, unrelated page.
export function formatMoney(value: number | null): string {
  return value !== null ? `$${value.toFixed(2)}` : '—'
}

// (msrp - price) / msrp, rounded to the nearest integer percent, per
// SPEC-DISCOVERED-LOTS-CARD-VIEW-001's acceptance criteria. `null` when
// either input is missing or msrp is 0 (avoids a divide-by-zero/Infinity
// result rendering as a real percentage).
export function computeMarginPct(msrp: number | null, price: number | null): number | null {
  if (msrp === null || price === null || msrp === 0) return null
  return Math.round(((msrp - price) / msrp) * 100)
}
