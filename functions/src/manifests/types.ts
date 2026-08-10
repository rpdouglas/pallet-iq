import type { FieldValue, Timestamp } from 'firebase-admin/firestore'

export type ManifestFormat = 'csv' | 'xlsx'
export type ImportStatus = 'queued' | 'processing' | 'completed' | 'failed'

// tenants/{tenantId}/imports/{importId} - job/status record. PALLETIQ-008 /
// ADR-0006. See docs/adr/0006-manifest-import-parsing-architecture.md.
export interface ImportDoc {
  vendorId: string
  format: ManifestFormat
  fileName: string
  storagePath: string
  status: ImportStatus
  rowCount: number
  successCount: number
  errorCount: number
  error: string | null
  createdAt: Timestamp | FieldValue
  updatedAt: Timestamp | FieldValue
}

// tenants/{tenantId}/manifests/{importId} - the manifest's own record.
// Shares an ID with the imports/{importId} job that produced it (1:1, no
// separate lookup needed).
export interface ManifestDoc {
  vendorId: string
  importId: string
  createdAt: Timestamp | FieldValue
}

// tenants/{tenantId}/manifests/{importId}/lineItems/{lineItemId} - the
// common product schema every vendor importer normalizes into.
export interface LineItemDoc {
  sku: string | null
  upc: string | null
  description: string
  quantity: number
  unitCost: number
  condition: string | null
  category: string | null
}

// tenants/{tenantId}/imports_errors/{errorId} - one per row that failed to
// normalize. Cloud-Functions-only write, same posture as analytics_rollups.
export interface ImportErrorDoc {
  importId: string
  rowNumber: number
  rawRow: Record<string, unknown>
  reason: string
  createdAt: Timestamp | FieldValue
}
