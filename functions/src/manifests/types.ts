import type { FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { PricingFactor } from '../pricing/types'

export type ManifestFormat = 'csv' | 'xlsx'
export type ImportStatus = 'queued' | 'processing' | 'completed' | 'failed'

// PALLETIQ-042 / ADR-0015.
export type ProfitabilityStatus = 'not_scored' | 'scoring' | 'scored' | 'failed'

// PALLETIQ-042 / ADR-0015. Lot-level aggregate, not per-SKU detail (the
// per-SKU PricingResult objects that produced this aren't persisted
// separately - only their contribution to the aggregate). `skusTotal` can
// exceed `skusResearched` when the per-import SKU cap
// (lotProfitability.ts's SKU_RESEARCH_CAP) is hit - unresearched SKUs
// still count toward totalLandedCost (their cost is known from the
// manifest) but contribute $0 to projectedResaleValue, which the
// `factors` breakdown flags explicitly rather than silently understating
// margin with no explanation.
export interface LotProfitabilityResult {
  totalLandedCost: number
  projectedResaleValue: number
  projectedProfit: number
  /** null when totalLandedCost is 0 (nothing to divide by). */
  marginPct: number | null
  skusResearched: number
  skusTotal: number
  factors: PricingFactor[]
}

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
  // PALLETIQ-022 / ADR-0010 - optional, set at import time only (not
  // editable after, unlike freightCost/otherFees above). Used to derive a
  // flat per-unit-quantity unitCost for rows whose manifest provides no
  // direct cost column - see normalizeRow's flatUnitCost parameter.
  totalPurchasePrice: number | null
  // PALLETIQ-041 / ADR-0015 - null for a regular manual manifest upload,
  // set to the originating restock_lots doc ID when this import was
  // created via the Discovered Lots "Import" button. Traceability only -
  // nothing reads this to change import behavior.
  sourceRestockLotId: string | null
  // PALLETIQ-042 / ADR-0015. Callable once status is 'completed', for any
  // import (restock.ca-sourced or a regular manual upload) - not gated on
  // sourceRestockLotId. Absent (undefined) on imports created before this
  // shipped - no backfill, per the ADR's own scope note; UI treats
  // undefined the same as 'not_scored'.
  profitabilityStatus: ProfitabilityStatus
  profitability: LotProfitabilityResult | null
  profitabilityError: string | null
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
  // PALLETIQ-053. Set null at row-normalization time (no price research
  // has run yet); written by lotProfitabilityWorker.ts once a lot
  // profitability score runs - null again if that SKU wasn't researched
  // (past the per-import cap) or researched with no usable price found,
  // same "flag, don't guess" posture as the rest of that feature. Every
  // lineItems doc sharing a dedup group key gets the same value.
  liquidationPrice: number | null
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
