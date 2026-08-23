import type { FieldValue, Timestamp } from 'firebase-admin/firestore'

export type PricingStatus = 'not_priced' | 'pricing' | 'priced' | 'unknown' | 'failed'

export type PricingFactorDirection = 'up' | 'down' | 'neutral'

// docs/design/explainable-scoring.md's factor-breakdown row shape.
export interface PricingFactor {
  label: string
  direction: PricingFactorDirection
  explanation: string | null
}

// PALLETIQ-026/035. A comp found during price research. `source` (added in
// PALLETIQ-035/ADR-0012) tags which part of the SOP-modeled research
// produced it - lets the UI group/label comps honestly (e.g. "eBay sold"
// vs "Kijiji - used") instead of the single flat eBay-only assumption the
// original eBay-Browse-API-only waterfall made.
export interface PricingComp {
  title: string
  price: number
  url: string | null
  source?: 'kijiji_new' | 'kijiji_used' | 'ebay_sold'
}

// PALLETIQ-026 / ADR-0011, re-sourced by PALLETIQ-035 / ADR-0012. Stored
// on ItemScanDoc.pricing once a scan's selected candidate has been priced.
// The shape is unchanged by PALLETIQ-035's replacement of the deterministic
// vendor waterfall with SOP-modeled LLM research (mapPriceResearch.ts) -
// only how these fields get populated changed.
export interface PricingResult {
  msrp: number | null
  salePrice: number | null
  salePriceLow: number | null
  salePriceHigh: number | null
  liquidationPrice: number | null
  /** 0-1. Computed deterministically server-side from the research response's structured facts (sample sizes, thin-data flags) - never trusted from the LLM's own self-rating, since this drives a real buy/pass money decision. Separate from Gemini's per-candidate identification confidence. */
  confidence: number
  /** How many comps/signals contributed to salePrice/liquidationPrice. */
  sampleSize: number
  factors: PricingFactor[]
  comps: PricingComp[]
  /** Naming holdover from the pre-PALLETIQ-035 vendor waterfall (not rendered in the UI) - now populated with which research sources actually returned data, e.g. ['cache'] or ['retail', 'kijiji_new', 'ebay_sold']. */
  waterfallStepsUsed: string[]
}

// product_price_cache/{cacheKey} (global, cross-tenant). PALLETIQ-026 /
// ADR-0011. Keyed by UPC when the candidate had a legible barcode,
// otherwise a normalized brand|model|itemName fingerprint - see
// mapPriceResearch.ts's computeCacheKey (PALLETIQ-035; moved from the
// deleted waterfall.ts). read: isSignedIn(), write: if false (Cloud
// Functions only). PALLETIQ-035/ADR-0012 note: this cache is a single
// global, region-agnostic key, now implicitly Ontario/CAD-specific since
// every cached price reflects Canadian sourcing - fine while the target
// market is Canada-only, would need a region-aware key if that changes.
export interface ProductPriceCacheDoc {
  pricing: PricingResult
  updatedAt: Timestamp | FieldValue
}
