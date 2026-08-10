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
