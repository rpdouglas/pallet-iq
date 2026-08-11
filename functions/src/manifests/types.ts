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
  // PALLETIQ-009 - client-edited (Owner/Buyer), not touched by this
  // package's own functions. Landed cost itself is computed on read from
  // these plus lineItems' unitCost, never persisted - see
  // src/lib/manifests/landedCost.ts and the PALLETIQ-009 scope note.
  freightCost: number
  otherFees: number
  // PALLETIQ-020 / ADR-0009 - optional, set at import time only (not
  // editable after, unlike freightCost/otherFees above). Used to derive a
  // flat per-unit-quantity unitCost for rows whose manifest provides no
  // direct cost column - see normalizeRow's flatUnitCost parameter.
  totalPurchasePrice: number | null
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

export type InventoryStatus = 'purchased' | 'received' | 'listed' | 'sold'

// tenants/{tenantId}/inventory/{inventoryId} - one per successfully
// normalized line item, auto-created in the same batch as the lineItems
// write. PALLETIQ-011 / ADR-0007 - see
// docs/adr/0007-inventory-lifecycle-and-auto-creation.md for why this is
// auto-created rather than a manual conversion step, and why landed cost
// isn't duplicated here (unitCost only - landed cost stays computed on
// read, same as src/lib/manifests/landedCost.ts).
export interface InventoryDoc {
  lineItemId: string
  manifestId: string
  vendorId: string
  sku: string | null
  upc: string | null
  description: string
  quantity: number
  unitCost: number
  condition: string | null
  category: string | null
  status: InventoryStatus
  createdAt: Timestamp | FieldValue
  updatedAt: Timestamp | FieldValue
}
