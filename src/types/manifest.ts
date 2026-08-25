import type { PricingFactor } from './itemScan'

export type ManifestFormat = 'csv' | 'xlsx'
export type ImportStatus = 'queued' | 'processing' | 'completed' | 'failed'

// PALLETIQ-042 / ADR-0015.
export type ProfitabilityStatus = 'not_scored' | 'scoring' | 'scored' | 'failed'

export interface LotProfitabilityResult {
  totalLandedCost: number
  projectedResaleValue: number
  projectedProfit: number
  marginPct: number | null
  skusResearched: number
  skusTotal: number
  factors: PricingFactor[]
}

export interface ImportSummary {
  id: string
  vendorId: string
  format: ManifestFormat
  fileName: string
  status: ImportStatus
  rowCount: number
  successCount: number
  errorCount: number
  error: string | null
  // PALLETIQ-009 - Owner/Buyer-edited, landed cost computed from these on
  // read (src/lib/manifests/landedCost.ts), never persisted.
  freightCost: number
  otherFees: number
  // PALLETIQ-022 - set at import time only, not editable after. Fills the
  // gap for line items whose manifest has no per-item cost column.
  totalPurchasePrice: number | null
  // PALLETIQ-041 - null for a regular manual manifest upload, set to the
  // originating restock_lots doc ID for one created via the Discovered
  // Lots "Import" button.
  sourceRestockLotId: string | null
  // PALLETIQ-042 / ADR-0015 - absent (undefined) on imports created
  // before this shipped, no backfill; treat undefined the same as
  // 'not_scored'.
  profitabilityStatus?: ProfitabilityStatus
  profitability?: LotProfitabilityResult | null
  profitabilityError?: string | null
}

export interface LineItem {
  id: string
  sku: string | null
  upc: string | null
  description: string
  quantity: number
  unitCost: number
  condition: string | null
  category: string | null
}

export interface ImportErrorRecord {
  id: string
  rowNumber: number
  reason: string
}
