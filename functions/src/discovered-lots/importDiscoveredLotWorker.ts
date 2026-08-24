import Papa from 'papaparse'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getFunctions } from 'firebase-admin/functions'
import { getStorage } from 'firebase-admin/storage'
import { logger } from 'firebase-functions/v2'
import { onTaskDispatched } from 'firebase-functions/v2/tasks'
import { RESTOCK_VENDOR_ID } from './enqueueDiscoveredLotImport'
import type { ImportDoc } from '../manifests/types'
import type { RestockLotDoc } from '../restock-scraper/types'

interface ImportDiscoveredLotWorkerPayload {
  tenantId?: unknown
  importId?: unknown
  lotId?: unknown
}

// PALLETIQ-041 / ADR-0015. Get-or-create, idempotent - the first tenant to
// import any restock.ca lot creates this once; every later import for that
// tenant reuses it. Rejected alternative: a schema change making
// imports/vendors optional - see ADR-0015's Alternatives section for why
// auto-provisioning keeps "every import has a vendor" a true invariant
// instead.
async function ensureRestockVendor(tenantId: string): Promise<void> {
  const vendorRef = getFirestore().doc(`tenants/${tenantId}/vendors/${RESTOCK_VENDOR_ID}`)
  const snap = await vendorRef.get()
  if (!snap.exists) {
    await vendorRef.set({
      name: 'Restock.ca (auto-imported)',
      manifestFormat: 'csv',
      createdAt: FieldValue.serverTimestamp(),
    })
  }
}

// PALLETIQ-041 / ADR-0015, reworked PALLETIQ-052 / ADR-0018. Bridges a
// global restock_lots doc into a tenant-scoped import - never runs inline
// on a user-facing request, enqueueDiscoveredLotImport (the onCall) only
// enqueues this (governance Check II). No live external fetch anymore -
// the manifest table was already extracted and stored at scrape time
// (restock_lots/{lotId}/manifestItems); this worker just reads it,
// synthesizes a CSV, and hands off to the existing, unmodified
// processManifestImport, same as a real uploaded file would.
export const importDiscoveredLotWorker = onTaskDispatched<ImportDiscoveredLotWorkerPayload>(
  {
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 10 },
    rateLimits: { maxConcurrentDispatches: 5 },
    timeoutSeconds: 120,
  },
  async (request) => {
    const { tenantId, importId, lotId } = request.data
    if (typeof tenantId !== 'string' || typeof importId !== 'string' || typeof lotId !== 'string') {
      logger.error('importDiscoveredLotWorker: invalid payload', request.data)
      return
    }

    const db = getFirestore()
    const importRef = db.doc(`tenants/${tenantId}/imports/${importId}`)

    try {
      const lotSnap = await db.doc(`restock_lots/${lotId}`).get()
      const lot = lotSnap.data() as RestockLotDoc | undefined
      if (!lot?.hasManifest) {
        throw new Error('Discovered lot no longer has a manifest.')
      }

      const itemsSnap = await db.collection(`restock_lots/${lotId}/manifestItems`).get()
      const rows = itemsSnap.docs.map((doc) => doc.data() as Record<string, string>)
      if (rows.length === 0) {
        throw new Error('Discovered lot no longer has a manifest.')
      }

      await ensureRestockVendor(tenantId)

      const csv = Papa.unparse(rows)
      const storagePath = `tenants/${tenantId}/manifests/${importId}/original.csv`
      await getStorage()
        .bucket()
        .file(storagePath)
        .save(Buffer.from(csv), { contentType: 'text/csv' })

      await importRef.update({
        format: 'csv',
        storagePath,
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<ImportDoc>)

      await getFunctions()
        .taskQueue('processManifestImport')
        .enqueue({ tenantId, importId, storagePath, format: 'csv' })
    } catch (err) {
      await importRef.update({
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<ImportDoc>)
      throw err // let Cloud Tasks retry per retryConfig
    }
  },
)
