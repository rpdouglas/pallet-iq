export type ManifestFormat = 'csv' | 'xlsx'
export type ImportStatus = 'queued' | 'processing' | 'completed' | 'failed'

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
