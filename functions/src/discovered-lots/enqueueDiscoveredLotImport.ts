import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getFunctions } from 'firebase-admin/functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import type { ImportDoc } from '../manifests/types'
import type { RestockLotDoc } from '../restock-scraper/types'

interface EnqueueDiscoveredLotImportRequest {
  lotId?: unknown
}

// PALLETIQ-041 / ADR-0015. Fixed doc ID (not per-vendor lookup) - every
// restock.ca-sourced import auto-provisions the same tenant vendor record,
// see importDiscoveredLotWorker.ts's ensureRestockVendor.
export const RESTOCK_VENDOR_ID = 'restock-ca'

// PALLETIQ-041 / ADR-0015. Buyer/Owner-gated, matching isOwnerOrBuyer -
// sourcing/import is Buyer's core daily job (docs/personas/buyer.md), same
// posture as enqueueManifestImport. Immediate return, no inline fetch -
// importDiscoveredLotWorker.ts does the actual manifestUrl fetch, never on
// this request path (governance Check II). format/storagePath below are a
// best-guess placeholder (restock.ca manifests are confirmed CSV,
// PALLETIQ-022) - the worker corrects them once it knows the real fetched
// format.
export const enqueueDiscoveredLotImport = onCall<
  EnqueueDiscoveredLotImportRequest,
  Promise<{ importId: string }>
>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in first.')
  }

  const { tenantId, role } = request.auth.token
  if (typeof tenantId !== 'string') {
    throw new HttpsError('permission-denied', 'A tenant membership is required.')
  }
  if (role !== 'owner' && role !== 'buyer') {
    throw new HttpsError('permission-denied', 'Only an Owner or Buyer can import a discovered lot.')
  }

  const { lotId } = request.data
  if (typeof lotId !== 'string' || !lotId) {
    throw new HttpsError('invalid-argument', 'lotId is required.')
  }

  const db = getFirestore()
  const lotSnap = await db.doc(`restock_lots/${lotId}`).get()
  const lot = lotSnap.data() as RestockLotDoc | undefined
  if (!lot) {
    throw new HttpsError('not-found', 'Discovered lot not found.')
  }
  if (lot.status !== 'active') {
    throw new HttpsError('failed-precondition', 'This lot is no longer active.')
  }
  if (!lot.manifestUrl) {
    throw new HttpsError('failed-precondition', 'This lot has no manifest to import.')
  }

  const importRef = db.collection(`tenants/${tenantId}/imports`).doc()
  const importId = importRef.id
  const manifestRef = db.doc(`tenants/${tenantId}/manifests/${importId}`)

  const importDoc: ImportDoc = {
    vendorId: RESTOCK_VENDOR_ID,
    format: 'csv',
    fileName: `restock-lot-${lotId}.csv`,
    storagePath: `tenants/${tenantId}/manifests/${importId}/original.csv`,
    status: 'queued',
    rowCount: 0,
    successCount: 0,
    errorCount: 0,
    error: null,
    freightCost: 0,
    otherFees: 0,
    totalPurchasePrice: lot.price,
    sourceRestockLotId: lotId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await Promise.all([
    importRef.set(importDoc),
    manifestRef.set({
      vendorId: RESTOCK_VENDOR_ID,
      importId,
      createdAt: FieldValue.serverTimestamp(),
    }),
  ])

  await getFunctions().taskQueue('importDiscoveredLotWorker').enqueue({ tenantId, importId, lotId })

  return { importId }
})
