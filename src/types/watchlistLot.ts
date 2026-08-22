export type WatchlistLotSource = 'bstock' | 'direct_liquidation'

export const WATCHLIST_LOT_SOURCES: readonly WatchlistLotSource[] = ['bstock', 'direct_liquidation']

export const WATCHLIST_LOT_SOURCE_LABELS: Record<WatchlistLotSource, string> = {
  bstock: 'B-Stock',
  direct_liquidation: 'Direct Liquidation',
}

// PALLETIQ-021 / ADR-0009. Manually-tracked auction lots from sources whose
// own Terms of Use/Service prohibit automated scraping - see
// src/lib/watchlist/README.md for why every write here is a human action,
// never a scraper. Deliberately minimal: just the handful of fields visible
// on a listing page, not a full manifest.
export interface WatchlistLot {
  id: string
  title: string
  source: WatchlistLotSource
  category: string
  units: number | null
  currentBid: number | null
  /** ISO 8601 timestamp - user-entered auction close time, not a server timestamp. */
  closesAt: string | null
  productUrl: string
  notes: string
}
