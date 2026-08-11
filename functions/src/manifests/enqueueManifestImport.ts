import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getFunctions } from 'firebase-admin/functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import type { ImportDoc, ManifestDoc, ManifestFormat } from './types'

interface EnqueueManifestImportRequest {
  vendorId?: unknown
  importId?: unknown
  storagePath?: unknown
  fileName?: unknown
  totalPurchasePrice?: unknown
}

interface VendorDoc {
  manifestFormat?: unknown
}

// PALLETIQ-008 / ADR-0006. importId is client-generated (not server-
// assigned) because the client must upload the raw file to Storage at
// tenants/{tenantId}/manifests/{importId}/... *before* calling this
// callable - the server can't hand back an ID for a path that already
// needs to exist. imports/{importId} and manifests/{importId} share that
// same client-supplied ID (1:1, no separate lookup needed).
export const enqueueManifestImport = onCall<
  EnqueueManifestImportRequest,
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
    throw new HttpsError('permission-denied', 'Only an Owner or Buyer can import manifests.')
  }

  const { vendorId, importId, storagePath, fileName, totalPurchasePrice } = request.data
  if (
    typeof vendorId !== 'string' ||
    typeof importId !== 'string' ||
    typeof storagePath !== 'string' ||
    typeof fileName !== 'string' ||
    !vendorId ||
    !importId ||
    !storagePath ||
    !fileName
  ) {
    throw new HttpsError(
      'invalid-argument',
      'vendorId, importId, storagePath, and fileName are required.',
    )
  }
  // PALLETIQ-020 / ADR-0009 - optional; a flat per-unit-quantity fallback
  // cost for manifests with no per-item cost column of their own.
  if (
    totalPurchasePrice !== undefined &&
    (typeof totalPurchasePrice !== 'number' ||
      !Number.isFinite(totalPurchasePrice) ||
      totalPurchasePrice < 0)
  ) {
    throw new HttpsError('invalid-argument', 'totalPurchasePrice must be a non-negative number.')
  }

  const expectedPathPrefix = `tenants/${tenantId}/manifests/${importId}/`
  if (!storagePath.startsWith(expectedPathPrefix)) {
    throw new HttpsError(
      'invalid-argument',
      'storagePath does not match the expected upload location.',
    )
  }

  const db = getFirestore()
  const vendorSnap = await db.doc(`tenants/${tenantId}/vendors/${vendorId}`).get()
  if (!vendorSnap.exists) {
    throw new HttpsError('not-found', 'Vendor not found.')
  }

  // The manifest format comes from the vendor record, not the client
  // request - the client can't be trusted to declare its own file format.
  const format = (vendorSnap.data() as VendorDoc | undefined)?.manifestFormat
  if (format !== 'csv' && format !== 'xlsx') {
    throw new HttpsError('failed-precondition', 'Vendor has no manifest format configured.')
  }
  const manifestFormat: ManifestFormat = format

  const importRef = db.doc(`tenants/${tenantId}/imports/${importId}`)
  const manifestRef = db.doc(`tenants/${tenantId}/manifests/${importId}`)

  const importDoc: ImportDoc = {
    vendorId,
    format: manifestFormat,
    fileName,
    storagePath,
    status: 'queued',
    rowCount: 0,
    successCount: 0,
    errorCount: 0,
    error: null,
    freightCost: 0,
    otherFees: 0,
    totalPurchasePrice: typeof totalPurchasePrice === 'number' ? totalPurchasePrice : null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }
  const manifestDoc: ManifestDoc = {
    vendorId,
    importId,
    createdAt: FieldValue.serverTimestamp(),
  }

  await Promise.all([importRef.set(importDoc), manifestRef.set(manifestDoc)])

  await getFunctions()
    .taskQueue('processManifestImport')
    .enqueue({ tenantId, importId, storagePath, format: manifestFormat })

  return { importId }
})
