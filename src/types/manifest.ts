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
